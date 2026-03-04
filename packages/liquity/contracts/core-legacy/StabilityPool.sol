// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IStabilityPool.sol";
import "../interfaces/IAddressesRegistry.sol";
import "../interfaces/ISbUSDToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StabilityPool — sbUSD deposit pool for liquidation absorption
/// @dev Uses O(1) epoch-scale accumulator pattern with 1e36 precision for P.
///      Scale factor (1e9) prevents P from rounding to zero during large liquidations.
///      SCALE_SPAN = 2 means deposits stop earning gains after 2 scale changes.
///      Epoch increments on full pool absorption — deposits from old epochs are zeroed.
contract StabilityPool is IStabilityPool {
    using SafeERC20 for IERC20;

    // --- Precision constants ---

    uint256 public constant DECIMAL_PRECISION = 1e18;
    uint256 public constant P_PRECISION = 1e36;
    uint256 public constant SCALE_FACTOR = 1e9;
    uint256 public constant MAX_SCALE_FACTOR_EXPONENT = 8;
    uint256 public constant SCALE_SPAN = 2;

    // --- Connected contracts ---

    IAddressesRegistry public addressesRegistry;
    ISbUSDToken public sbUSDToken;
    IERC20 public collToken;
    address public troveManager;
    address public activePool;
    address public borrowerOperations;

    // --- Pool state ---

    uint256 public totalBoldDeposits;

    /// @dev Running product tracking deposit compounding. Starts at P_PRECISION (1e36).
    uint256 public P = P_PRECISION;

    /// @dev Current epoch — incremented on full pool absorption.
    uint256 public currentEpoch;

    /// @dev Current scale — incremented each time P would drop below P_PRECISION/SCALE_FACTOR.
    uint256 public currentScale;

    /// @dev Cumulative collateral gain per unit of P-adjusted deposit, indexed by [epoch][scale].
    mapping(uint256 => mapping(uint256 => uint256)) public epochToScaleToS;

    /// @dev Cumulative bold yield gain per unit of P-adjusted deposit, indexed by [epoch][scale].
    mapping(uint256 => mapping(uint256 => uint256)) public epochToScaleToG;

    // --- Deposit tracking ---

    struct Deposit {
        uint256 initialValue;
        uint256 S;
        uint256 G;
        uint256 P;
        uint256 scale;
        uint256 epoch;
    }

    mapping(address => Deposit) public deposits;

    // --- Initialization ---

    address public immutable deployer;
    bool public isInitialized;
    bool public addressesSet;

    // --- Events ---

    event DepositMade(address indexed depositor, uint256 amount);
    event DepositWithdrawn(address indexed depositor, uint256 amount);
    event CollGainWithdrawn(address indexed depositor, uint256 amount);
    event BoldGainWithdrawn(address indexed depositor, uint256 amount);
    event StabilityPoolLiquidation(uint256 debtOffset, uint256 collAdded);
    event P_Updated(uint256 newP);
    event S_Updated(uint256 newS, uint256 epoch, uint256 scale);
    event G_Updated(uint256 newG, uint256 epoch, uint256 scale);
    event ScaleUpdated(uint256 newScale);
    event EpochUpdated(uint256 newEpoch);

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyTroveManager() {
        require(msg.sender == troveManager, "SP: not TroveManager");
        _;
    }

    // --- Initialization ---

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

    // --- User actions ---

    function provideToSP(uint256 _amount) external override {
        require(_amount > 0, "Amount must be > 0");

        _sendGainsToDepositor(msg.sender);

        // Transfer sbUSD from depositor to this contract
        sbUSDToken.sendToPool(msg.sender, address(this), _amount);

        Deposit storage dep = deposits[msg.sender];
        uint256 compounded = _getCompoundedDeposit(dep);

        dep.initialValue = compounded + _amount;
        _takeSnapshot(dep);

        totalBoldDeposits += _amount;

        emit DepositMade(msg.sender, _amount);
    }

    function withdrawFromSP(uint256 _amount) external override {
        Deposit storage dep = deposits[msg.sender];
        require(dep.initialValue > 0, "No deposit");

        _sendGainsToDepositor(msg.sender);

        uint256 compounded = _getCompoundedDeposit(dep);
        uint256 withdrawAmount = _amount > compounded ? compounded : _amount;

        dep.initialValue = compounded - withdrawAmount;
        _takeSnapshot(dep);

        if (withdrawAmount > 0) {
            totalBoldDeposits -= withdrawAmount;
            // Transfer sbUSD from this contract back to depositor
            sbUSDToken.returnFromPool(address(this), msg.sender, withdrawAmount);
            emit DepositWithdrawn(msg.sender, withdrawAmount);
        }
    }

    function claimReward() external override {
        Deposit storage dep = deposits[msg.sender];
        uint256 collGain = _getPendingCollGain(dep);
        uint256 boldGain = _getPendingBoldGain(dep);
        require(collGain > 0 || boldGain > 0, "No rewards");

        _takeSnapshot(dep);

        if (collGain > 0) {
            collToken.safeTransfer(msg.sender, collGain);
            emit CollGainWithdrawn(msg.sender, collGain);
        }
        if (boldGain > 0) {
            sbUSDToken.returnFromPool(address(this), msg.sender, boldGain);
            emit BoldGainWithdrawn(msg.sender, boldGain);
        }
    }

    // --- Protocol callbacks ---

    /// @dev Called by TroveManager during liquidation.
    ///      Updates S and P accumulators. Handles full pool absorption via epoch increment.
    function offset(uint256 _debtToOffset, uint256 _collToAdd) external override onlyTroveManager {
        if (totalBoldDeposits == 0 || _debtToOffset == 0) return;

        uint256 debtToOffset = _debtToOffset > totalBoldDeposits ? totalBoldDeposits : _debtToOffset;

        // Update S accumulator for current epoch and scale (before P changes)
        epochToScaleToS[currentEpoch][currentScale] += P * _collToAdd / totalBoldDeposits;
        emit S_Updated(epochToScaleToS[currentEpoch][currentScale], currentEpoch, currentScale);

        // Burn the absorbed sbUSD (held by this contract from deposits)
        sbUSDToken.burn(address(this), debtToOffset);

        if (debtToOffset == totalBoldDeposits) {
            // Full pool absorption — start new epoch, reset P and scale
            P = P_PRECISION;
            currentEpoch += 1;
            currentScale = 0;
            totalBoldDeposits = 0;
            emit EpochUpdated(currentEpoch);
        } else {
            // Calculate new P
            uint256 numerator = P * (totalBoldDeposits - debtToOffset);
            uint256 newP = numerator / totalBoldDeposits;

            assert(newP > 0); // Should never be zero when debtToOffset < totalBoldDeposits

            // Rescale P if it would drop below the threshold (P_PRECISION / SCALE_FACTOR = 1e27)
            while (newP < P_PRECISION / SCALE_FACTOR) {
                numerator *= SCALE_FACTOR;
                newP = numerator / totalBoldDeposits;
                currentScale += 1;
                emit ScaleUpdated(currentScale);
            }

            P = newP;
            totalBoldDeposits -= debtToOffset;
        }

        emit P_Updated(P);
        emit StabilityPoolLiquidation(debtToOffset, _collToAdd);
    }

    /// @dev Called to distribute sbUSD yield (interest) to depositors.
    ///      The corresponding sbUSD tokens must already be held by this contract.
    function triggerBoldRewards(uint256 _boldYield) external override {
        require(
            msg.sender == activePool || msg.sender == borrowerOperations,
            "SP: not authorized"
        );
        if (totalBoldDeposits == 0 || _boldYield == 0) return;

        epochToScaleToG[currentEpoch][currentScale] += P * _boldYield / totalBoldDeposits;
        emit G_Updated(epochToScaleToG[currentEpoch][currentScale], currentEpoch, currentScale);
    }

    // --- View functions ---

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

    // --- Internal helpers ---

    /// @dev Save current accumulator state into a deposit snapshot.
    function _takeSnapshot(Deposit storage dep) internal {
        dep.S = epochToScaleToS[currentEpoch][currentScale];
        dep.G = epochToScaleToG[currentEpoch][currentScale];
        dep.P = P;
        dep.scale = currentScale;
        dep.epoch = currentEpoch;
    }

    function _getCompoundedDeposit(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;

        // If the deposit was made in a previous epoch, it's been fully absorbed
        if (dep.epoch < currentEpoch) return 0;

        uint256 scaleDiff = currentScale - dep.scale;

        if (scaleDiff > MAX_SCALE_FACTOR_EXPONENT) return 0;

        if (scaleDiff == 0) {
            return dep.initialValue * P / dep.P;
        }

        // Account for scale changes: divide by SCALE_FACTOR^scaleDiff
        uint256 scaledDepP = dep.P;
        for (uint256 i = 0; i < scaleDiff; i++) {
            scaledDepP = scaledDepP * SCALE_FACTOR;
        }

        return dep.initialValue * P / scaledDepP;
    }

    /// @dev Collateral gain from liquidations across multiple scales within the deposit's epoch.
    function _getPendingCollGain(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;

        // Gain from the same scale as the deposit
        uint256 normalizedGains = epochToScaleToS[dep.epoch][dep.scale] - dep.S;

        // Gains from subsequent scales (scaled down by SCALE_FACTOR per step)
        for (uint256 i = 1; i <= SCALE_SPAN; ++i) {
            normalizedGains += epochToScaleToS[dep.epoch][dep.scale + i] / _pow(SCALE_FACTOR, i);
        }

        return dep.initialValue * normalizedGains / dep.P;
    }

    /// @dev Bold yield gain from interest across multiple scales within the deposit's epoch.
    function _getPendingBoldGain(Deposit storage dep) internal view returns (uint256) {
        if (dep.initialValue == 0 || dep.P == 0) return 0;

        uint256 normalizedGains = epochToScaleToG[dep.epoch][dep.scale] - dep.G;

        for (uint256 i = 1; i <= SCALE_SPAN; ++i) {
            normalizedGains += epochToScaleToG[dep.epoch][dep.scale + i] / _pow(SCALE_FACTOR, i);
        }

        uint256 compounded = _getCompoundedDeposit(dep);
        return compounded * normalizedGains / dep.P;
    }

    function _sendGainsToDepositor(address _depositor) internal {
        Deposit storage dep = deposits[_depositor];
        if (dep.initialValue == 0) return;

        uint256 collGain = _getPendingCollGain(dep);
        uint256 boldGain = _getPendingBoldGain(dep);

        // Update snapshots before external calls (CEI pattern)
        _takeSnapshot(dep);

        if (collGain > 0) {
            collToken.safeTransfer(_depositor, collGain);
            emit CollGainWithdrawn(_depositor, collGain);
        }
        if (boldGain > 0) {
            sbUSDToken.returnFromPool(address(this), _depositor, boldGain);
            emit BoldGainWithdrawn(_depositor, boldGain);
        }
    }

    function _pow(uint256 _base, uint256 _exp) internal pure returns (uint256 result) {
        result = 1;
        for (uint256 i = 0; i < _exp; i++) {
            result *= _base;
        }
    }
}
