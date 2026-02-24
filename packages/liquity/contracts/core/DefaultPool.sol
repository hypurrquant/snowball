// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DefaultPool — Holds collateral and debt from liquidated troves
contract DefaultPool {
    using SafeERC20 for IERC20;

    address public troveManager;
    address public activePool;
    IERC20 public collToken;

    uint256 public collBalance;
    uint256 public boldDebt;

    address public immutable deployer;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyTroveManager() {
        require(msg.sender == troveManager, "DefaultPool: not TroveManager");
        _;
    }

    modifier onlyActivePool() {
        require(msg.sender == activePool, "DefaultPool: not ActivePool");
        _;
    }

    function setAddresses(
        address _troveManager,
        address _activePool,
        address _collToken
    ) external {
        require(msg.sender == deployer, "DefaultPool: not deployer");
        require(troveManager == address(0), "Already set");
        troveManager = _troveManager;
        activePool = _activePool;
        collToken = IERC20(_collToken);
    }

    function getCollBalance() external view returns (uint256) {
        return collBalance;
    }

    function getBoldDebt() external view returns (uint256) {
        return boldDebt;
    }

    function increaseBoldDebt(uint256 _amount) external onlyTroveManager {
        boldDebt += _amount;
    }

    function decreaseBoldDebt(uint256 _amount) external onlyTroveManager {
        boldDebt -= _amount;
    }

    function sendCollToActivePool(uint256 _amount) external onlyTroveManager {
        collBalance -= _amount;
        collToken.safeTransfer(activePool, _amount);
    }
}
