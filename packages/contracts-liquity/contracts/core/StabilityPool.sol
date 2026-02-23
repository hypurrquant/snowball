// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IStabilityPool.sol";
import "../interfaces/IAddressesRegistry.sol";
import "../interfaces/ISbUSDToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StabilityPool — sbUSD deposit pool for liquidation absorption
/// @dev Uses O(1) epoch-scale accumulator pattern. No loops over depositors.
///      Gains are computed lazily per-user using cumulative S (coll) and G (bold) trackers.
///
///      Math:
///        S accumulates: collPerUnit * P / DECIMAL_PRECISION at each liquidation
///        G accumulates: boldYield * DECIMAL_PRECISION / totalBoldDeposits at each interest event
///        P accumulates: product of (1 - debtLossPerUnit) — tracks deposit compounding
///
///        User collGain  = deposit.initialValue * (S - deposit.S) / deposit.P
///        User boldGain  = compounded * (G - deposit.G) / DECIMAL_PRECISION
///        compounded     = deposit.initialValue * P / deposit.P
contract StabilityPool is IStabilityPool {
    using SafeERC20 for IERC20;

    uint256 public constant DECIMAL_PRECISION = 1e18;

    IAddressesRegistry public addressesRegistry;
    ISbUSDToken public sbUSDToken;
    IERC20 public collToken;
    address public troveManager;
    address public activePool;
    address public borrowerOperations;

    uint256 public totalBoldDeposits;

    // ─── Epoch-scale O(1) accumulators ───────────────────────────────────────

    /// @dev Running product of (1 - debtLossPerUnit) across all liquidations.
    ///      Starts at 1e18. Decreases toward 0 as deposits absorb debt.
    uint256 public P = DECIMAL_PRECISION;

    /// @dev Cumulative collateral gain per unit of P-adjusted deposit.
    ///      At each liquidation: S += (coll / totalDeposits) * P
    uint256 public S;

    /// @dev Cumulative bold yield (interest) per unit of effective deposit.
    ///      At each triggerBoldRewards: G += yield * DECIMAL_PRECISION / totalDeposits
    uint256 public G;

    // ─────────────────────────────────────────────────────────────────────────

    struct Deposit {
        uint256 initialValue; // Original sbUSD burned (not compounded)
        uint256 S;            // S accumulator snapshot at deposit time
        uint256 G;            // G accumulator snapshot at deposit time
        uint256 P;            // P product snapshot at deposit time
    }

    mapping(address => Deposit) public deposits;

    // ─── Initialization guard ─────────────────────────────────────────────────
    address public immutable deployer;
    bool public isInitialized;
    bool public addressesSet;

    // ─── Events ───────────────────────────────────────────────────────────────
    event DepositMade(address indexed depositor, uint256 amount);
    event DepositWithdrawn(address indexed depositor, uint256 amount);
    event CollGainWithdrawn(address indexed depositor, uint256 amount);
    event BoldGainWithdrawn(address indexed depositor, uint256 amount);
    event StabilityPoolLiquidation(uint256 debtOffset, uint256 collAdded);

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyTroveManager() {
        require(msg.sender == troveManager, "SP: not TroveManager");
        _;
    }

    // ─── Initialization ───────────────────────────────────────────────────────

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(msg.sender == deployer, "SP: not deployer");
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        addressesRegistry = IAddressesRegistry(_addressesRegistry);
    }

    function setAddresses(
        address _sbUSDToken,
        address _collToken,
        address _troveManager,
        address _activePool,
        address _borrowerOperations
    ) external {
        require(msg.sender == deployer, "SP: not deployer");
        require(!addressesSet, "Already set");
        addressesSet = true;
        sbUSDToken = ISbUSDToken(_sbUSDToken);
        collToken = IERC20(_collToken);
        troveManager = _troveManager;
        activePool = _activePool;
        borrowerOperations = _borrowerOperations;
    }

    // ─── User actions ─────────────────────────────────────────────────────────

    function provideToSP(uint256 _amount) external override {
        require(_amount > 0, "Amount must be > 0");

        // Auto-claim pending gains before updating the deposit position
        _sendGainsToDepositor(msg.sender);

        // Burn sbUSD from depositor
        sbUSDToken.burn(msg.sender, _amount);

        // Compound existing deposit, then add new amount, and refresh snapshots
        Deposit storage dep = deposits[msg.sender];
        uint256 compounded = _getCompoundedDeposit(dep);

        dep.initialValue = compounded + _amount;
        dep.S = S;
        dep.G = G;
        dep.P = (P == 0) ? DECIMAL_PRECISION : P; // guard against zero-P edge case

        totalBoldDeposits += _amount;

        emit DepositMade(msg.sender, _amount);
    }

    function withdrawFromSP(uint256 _amount) external override {
        Deposit storage dep = deposits[msg.sender];
        require(dep.initialValue > 0, "No deposit");

        // Send all pending gains first
        _sendGainsToDepositor(msg.sender);

        uint256 compounded = _getCompoundedDeposit(dep);
        uint256 withdrawAmount = _amount > compounded ? compounded : _amount;

        // Update deposit and snapshots
        dep.initialValue = compounded - withdrawAmount;
        dep.S = S;
        dep.G = G;
        dep.P = (P == 0) ? DECIMAL_PRECISION : P;

        if (withdrawAmount > 0) {
            totalBoldDeposits -= withdrawAmount;
            sbUSDToken.mint(msg.sender, withdrawAmount);
            emit DepositWithdrawn(msg.sender, withdrawAmount);
        }
    }

    function claimReward() external override {
        Deposit storage dep = deposits[msg.sender];
        uint256 collGain = _getPendingCollGain(dep);
        uint256 boldGain = _getPendingBoldGain(dep);
        require(collGain > 0 || boldGain > 0, "No rewards");

        // Reset gain snapshots (leave initialValue and P intact for future compounding)
        dep.S = S;
        dep.G = G;

        if (collGain > 0) {
            collToken.safeTransfer(msg.sender, collGain);
            emit CollGainWithdrawn(msg.sender, collGain);
        }
        if (boldGain > 0) {
            sbUSDToken.mint(msg.sender, boldGain);
            emit BoldGainWithdrawn(msg.sender, boldGain);
        }
    }

    // ─── Protocol callbacks ───────────────────────────────────────────────────

    /// @dev Called by TroveManager during liquidation.
    ///      O(1): updates S and P accumulators only — no loop over depositors.
    function offset(uint256 _debtToOffset, uint256 _collToAdd) external override onlyTroveManager {
        if (totalBoldDeposits == 0 || _debtToOffset == 0) return;

        uint256 debtToOffset = _debtToOffset > totalBoldDeposits ? totalBoldDeposits : _debtToOffset;

        // Collateral gain per unit of effective deposit (scaled by P before update)
        // S += (coll / D) * P   where D = totalBoldDeposits before this liquidation
        uint256 collGainPerUnitStaked = _collToAdd * DECIMAL_PRECISION / totalBoldDeposits;
        S += collGainPerUnitStaked * P / DECIMAL_PRECISION;

        // Update P: multiply by (1 - lossRatio)
        uint256 boldLossPerUnitStaked = debtToOffset * DECIMAL_PRECISION / totalBoldDeposits;
        if (boldLossPerUnitStaked >= DECIMAL_PRECISION) {
            // Edge case: total wipeout — reset to avoid division by zero
            P = DECIMAL_PRECISION; // reset for next cycle; totalBoldDeposits will be 0
            totalBoldDeposits = 0;
        } else {
            P = P * (DECIMAL_PRECISION - boldLossPerUnitStaked) / DECIMAL_PRECISION;
            if (P == 0) P = 1; // guard against exact-zero due to truncation
            totalBoldDeposits -= debtToOffset;
        }

        emit StabilityPoolLiquidation(debtToOffset, _collToAdd);
    }

    /// @dev Called by BorrowerOperations to distribute sbUSD yield (interest).
    ///      O(1): updates G accumulator only.
    function triggerBoldRewards(uint256 _boldYield) external override {
        require(
            msg.sender == activePool || msg.sender == borrowerOperations,
            "SP: not authorized"
        );
        if (totalBoldDeposits == 0 || _boldYield == 0) return;

        // G += yield * DECIMAL_PRECISION / totalBoldDeposits
        G += _boldYield * DECIMAL_PRECISION / totalBoldDeposits;
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getTotalBoldDeposits() external view override returns (uint256) {
        return totalBoldDeposits;
    }

    function getDepositorCollGain(address _depositor) external view override returns (uint256) {
        return _getPendingCollGain(deposits[_depositor]);
    }

    function getDepositorBoldGain(address _depositor) external view override returns (uint256) {
        return _getPendingBoldGain(deposits[_depositor]);
    }

    function getCompoundedBoldDeposit(address _depositor) external view override returns (uint256) {
        return _getCompoundedDeposit(deposits[_depositor]);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Returns the current effective deposit after absorbing any liquidation losses.
    function _getCompoundedDeposit(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;
        return dep.initialValue * P / dep.P;
    }

    /// @dev collGain = initialValue * (S - S_snap) / P_snap
    function _getPendingCollGain(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;
        uint256 gainPerUnit = S - dep.S;
        if (gainPerUnit == 0) return 0;
        return dep.initialValue * gainPerUnit / dep.P;
    }

    /// @dev boldGain = compounded * (G - G_snap) / DECIMAL_PRECISION
    function _getPendingBoldGain(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;
        uint256 gainPerUnit = G - dep.G;
        if (gainPerUnit == 0) return 0;
        uint256 compounded = dep.initialValue * P / dep.P;
        return compounded * gainPerUnit / DECIMAL_PRECISION;
    }

    /// @dev Sends all pending gains to depositor and updates gain snapshots.
    function _sendGainsToDepositor(address _depositor) internal {
        Deposit storage dep = deposits[_depositor];
        if (dep.initialValue == 0) return;

        uint256 collGain = _getPendingCollGain(dep);
        uint256 boldGain = _getPendingBoldGain(dep);

        // Update snapshots before external calls (CEI pattern)
        dep.S = S;
        dep.G = G;

        if (collGain > 0) {
            collToken.safeTransfer(_depositor, collGain);
            emit CollGainWithdrawn(_depositor, collGain);
        }
        if (boldGain > 0) {
            sbUSDToken.mint(_depositor, boldGain);
            emit BoldGainWithdrawn(_depositor, boldGain);
        }
    }
}
