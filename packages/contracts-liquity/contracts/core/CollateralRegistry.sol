// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITroveManager.sol";
import "../interfaces/ISbUSDToken.sol";
import "../interfaces/IPriceFeed.sol";

/// @title CollateralRegistry — Tracks all collateral branches
contract CollateralRegistry is Ownable {
    struct Branch {
        address token;
        address troveManager;
        address borrowerOperations;
        address stabilityPool;
        address activePool;
        address priceFeed;
        bool isActive;
    }

    Branch[] public branches;
    address public sbUSDToken;

    event BranchAdded(uint256 indexed index, address token);

    constructor(address _sbUSDToken) Ownable(msg.sender) {
        sbUSDToken = _sbUSDToken;
    }

    function addBranch(
        address _token,
        address _troveManager,
        address _borrowerOperations,
        address _stabilityPool,
        address _activePool,
        address _priceFeed
    ) external onlyOwner {
        branches.push(Branch({
            token: _token,
            troveManager: _troveManager,
            borrowerOperations: _borrowerOperations,
            stabilityPool: _stabilityPool,
            activePool: _activePool,
            priceFeed: _priceFeed,
            isActive: true
        }));

        emit BranchAdded(branches.length - 1, _token);
    }

    function totalCollaterals() external view returns (uint256) {
        return branches.length;
    }

    function getToken(uint256 _index) external view returns (address) {
        return branches[_index].token;
    }

    function getTroveManager(uint256 _index) external view returns (address) {
        return branches[_index].troveManager;
    }

    function getBorrowerOperations(uint256 _index) external view returns (address) {
        return branches[_index].borrowerOperations;
    }

    function getStabilityPool(uint256 _index) external view returns (address) {
        return branches[_index].stabilityPool;
    }

    function getActivePool(uint256 _index) external view returns (address) {
        return branches[_index].activePool;
    }

    function getPriceFeed(uint256 _index) external view returns (address) {
        return branches[_index].priceFeed;
    }

    function redeemCollateral(
        uint256 _boldAmount,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external {
        require(_boldAmount > 0, "Amount must be > 0");

        uint256 branchCount = branches.length;
        require(branchCount > 0, "No branches");

        // Distribute redemption across branches proportionally to their active debt
        // For simplicity on testnet, iterate branches and redeem sequentially
        uint256 remainingBold = _boldAmount;
        uint256 iterationsPerBranch = _maxIterations / branchCount;
        if (iterationsPerBranch == 0) iterationsPerBranch = 1;

        for (uint256 i = 0; i < branchCount && remainingBold > 0; i++) {
            Branch storage branch = branches[i];
            if (!branch.isActive) continue;

            (uint256 price, ) = IPriceFeed(branch.priceFeed).fetchPrice();
            if (price == 0) continue;

            // Track balance before to calculate exact amount burned by this branch
            uint256 balanceBefore = ISbUSDToken(sbUSDToken).balanceOf(msg.sender);

            ITroveManager(branch.troveManager).redeemCollateral(
                msg.sender,
                remainingBold,
                price,
                iterationsPerBranch
            );

            uint256 balanceAfter = ISbUSDToken(sbUSDToken).balanceOf(msg.sender);
            uint256 burned = balanceBefore > balanceAfter ? balanceBefore - balanceAfter : 0;
            remainingBold -= burned;
        }
    }
}
