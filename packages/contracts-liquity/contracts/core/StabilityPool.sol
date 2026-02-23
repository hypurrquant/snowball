// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IStabilityPool.sol";
import "../interfaces/IAddressesRegistry.sol";
import "../interfaces/ISbUSDToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StabilityPool — sbUSD deposit pool for liquidation absorption
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

    struct Deposit {
        uint256 initialValue;
        uint256 collGain;
        uint256 boldGain;
    }

    mapping(address => Deposit) public deposits;
    address[] public depositors;

    // Epoch-scale tracking (simplified for testnet)
    uint256 public P = DECIMAL_PRECISION; // Product "P"
    uint256 public totalCollGain;

    bool public isInitialized;

    event DepositMade(address indexed depositor, uint256 amount);
    event DepositWithdrawn(address indexed depositor, uint256 amount);
    event CollGainWithdrawn(address indexed depositor, uint256 amount);
    event BoldGainWithdrawn(address indexed depositor, uint256 amount);
    event StabilityPoolLiquidation(uint256 debtOffset, uint256 collAdded);

    modifier onlyTroveManager() {
        require(msg.sender == troveManager, "SP: not TroveManager");
        _;
    }

    function setAddressesRegistry(address _addressesRegistry) external override {
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
        require(address(sbUSDToken) == address(0), "Already set");
        sbUSDToken = ISbUSDToken(_sbUSDToken);
        collToken = IERC20(_collToken);
        troveManager = _troveManager;
        activePool = _activePool;
        borrowerOperations = _borrowerOperations;
    }

    function provideToSP(uint256 _amount) external override {
        require(_amount > 0, "Amount must be > 0");

        // Transfer sbUSD from depositor
        sbUSDToken.burn(msg.sender, _amount);

        Deposit storage dep = deposits[msg.sender];
        if (dep.initialValue == 0) {
            depositors.push(msg.sender);
        }
        dep.initialValue += _amount;
        totalBoldDeposits += _amount;

        emit DepositMade(msg.sender, _amount);
    }

    function withdrawFromSP(uint256 _amount) external override {
        Deposit storage dep = deposits[msg.sender];
        uint256 currentDeposit = dep.initialValue;
        require(currentDeposit > 0, "No deposit");

        uint256 withdrawAmount = _amount > currentDeposit ? currentDeposit : _amount;
        dep.initialValue -= withdrawAmount;
        totalBoldDeposits -= withdrawAmount;

        // Mint sbUSD back to depositor
        sbUSDToken.mint(msg.sender, withdrawAmount);

        // Send any collateral gain
        uint256 collGain = dep.collGain;
        if (collGain > 0) {
            dep.collGain = 0;
            collToken.safeTransfer(msg.sender, collGain);
            emit CollGainWithdrawn(msg.sender, collGain);
        }

        // Send any bold gain
        uint256 boldGain = dep.boldGain;
        if (boldGain > 0) {
            dep.boldGain = 0;
            sbUSDToken.mint(msg.sender, boldGain);
            emit BoldGainWithdrawn(msg.sender, boldGain);
        }

        emit DepositWithdrawn(msg.sender, withdrawAmount);
    }

    function claimReward() external override {
        Deposit storage dep = deposits[msg.sender];
        uint256 collGain = dep.collGain;
        uint256 boldGain = dep.boldGain;
        require(collGain > 0 || boldGain > 0, "No rewards");

        if (collGain > 0) {
            dep.collGain = 0;
            collToken.safeTransfer(msg.sender, collGain);
            emit CollGainWithdrawn(msg.sender, collGain);
        }

        if (boldGain > 0) {
            dep.boldGain = 0;
            sbUSDToken.mint(msg.sender, boldGain);
            emit BoldGainWithdrawn(msg.sender, boldGain);
        }
    }

    /// @dev Called by TroveManager during liquidation
    function offset(uint256 _debtToOffset, uint256 _collToAdd) external override onlyTroveManager {
        if (totalBoldDeposits == 0 || _debtToOffset == 0) return;

        uint256 debtToOffset = _debtToOffset > totalBoldDeposits ? totalBoldDeposits : _debtToOffset;

        // Distribute collateral gain proportionally
        uint256 depositorCount = depositors.length;
        for (uint256 i = 0; i < depositorCount; i++) {
            address depositor = depositors[i];
            Deposit storage dep = deposits[depositor];
            if (dep.initialValue == 0) continue;

            uint256 share = (dep.initialValue * DECIMAL_PRECISION) / totalBoldDeposits;
            uint256 collShare = (_collToAdd * share) / DECIMAL_PRECISION;
            uint256 debtShare = (debtToOffset * share) / DECIMAL_PRECISION;

            dep.collGain += collShare;
            dep.initialValue -= debtShare > dep.initialValue ? dep.initialValue : debtShare;
        }

        totalBoldDeposits -= debtToOffset;
        totalCollGain += _collToAdd;

        emit StabilityPoolLiquidation(debtToOffset, _collToAdd);
    }

    /// @dev Called by BorrowerOperations or ActivePool to distribute sbUSD yield (interest revenue) to depositors
    function triggerBoldRewards(uint256 _boldYield) external override {
        require(
            msg.sender == activePool || msg.sender == borrowerOperations,
            "SP: not authorized"
        );
        if (totalBoldDeposits == 0 || _boldYield == 0) return;

        // Distribute boldYield proportionally to all depositors
        uint256 depositorCount = depositors.length;
        for (uint256 i = 0; i < depositorCount; i++) {
            address depositor = depositors[i];
            Deposit storage dep = deposits[depositor];
            if (dep.initialValue == 0) continue;

            uint256 share = (dep.initialValue * DECIMAL_PRECISION) / totalBoldDeposits;
            uint256 boldShare = (_boldYield * share) / DECIMAL_PRECISION;
            dep.boldGain += boldShare;
        }
    }

    // ==================== View Functions ====================

    function getTotalBoldDeposits() external view override returns (uint256) {
        return totalBoldDeposits;
    }

    function getDepositorBoldGain(address _depositor) external view override returns (uint256) {
        return deposits[_depositor].boldGain;
    }

    function getDepositorCollGain(address _depositor) external view override returns (uint256) {
        return deposits[_depositor].collGain;
    }

    function getCompoundedBoldDeposit(address _depositor) external view override returns (uint256) {
        return deposits[_depositor].initialValue;
    }
}
