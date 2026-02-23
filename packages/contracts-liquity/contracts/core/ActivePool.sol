// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IActivePool.sol";

/// @title ActivePool — Holds collateral and tracks debt for a branch
contract ActivePool is IActivePool {
    using SafeERC20 for IERC20;

    address public addressesRegistry;
    address public borrowerOperations;
    address public troveManager;
    address public stabilityPool;
    address public defaultPool;
    IERC20 public collToken;

    uint256 internal collBalance;
    uint256 internal boldDebt;
    uint256 internal _aggWeightedDebtSum;

    address public immutable deployer;
    bool public isInitialized;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == borrowerOperations ||
            msg.sender == troveManager ||
            msg.sender == stabilityPool ||
            msg.sender == defaultPool,
            "ActivePool: not authorized"
        );
        _;
    }

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(msg.sender == deployer, "ActivePool: not deployer");
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        addressesRegistry = _addressesRegistry;
    }

    function setAddresses(
        address _borrowerOperations,
        address _troveManager,
        address _stabilityPool,
        address _defaultPool,
        address _collToken
    ) external {
        require(msg.sender == deployer, "ActivePool: not deployer");
        require(borrowerOperations == address(0), "Already set");
        borrowerOperations = _borrowerOperations;
        troveManager = _troveManager;
        stabilityPool = _stabilityPool;
        defaultPool = _defaultPool;
        collToken = IERC20(_collToken);
    }

    function getCollBalance() external view override returns (uint256) {
        return collBalance;
    }

    function getBoldDebt() external view override returns (uint256) {
        return boldDebt;
    }

    function aggWeightedDebtSum() external view override returns (uint256) {
        return _aggWeightedDebtSum;
    }

    function receiveColl(uint256 _amount) external override onlyAuthorized {
        collBalance += _amount;
        collToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function increaseCollBalance(uint256 _amount) external override onlyAuthorized {
        collBalance += _amount;
    }

    function sendColl(address _account, uint256 _amount) external override onlyAuthorized {
        collBalance -= _amount;
        collToken.safeTransfer(_account, _amount);
    }

    function increaseBoldDebt(uint256 _amount) external override onlyAuthorized {
        boldDebt += _amount;
    }

    function decreaseBoldDebt(uint256 _amount) external override onlyAuthorized {
        boldDebt -= _amount;
    }

    function increaseAggWeightedDebtSum(uint256 _amount) external override onlyAuthorized {
        _aggWeightedDebtSum += _amount;
    }

    function decreaseAggWeightedDebtSum(uint256 _amount) external override onlyAuthorized {
        _aggWeightedDebtSum -= _amount;
    }
}
