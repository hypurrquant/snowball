// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CollSurplusPool — Holds collateral surplus after liquidation/redemption
contract CollSurplusPool {
    using SafeERC20 for IERC20;

    address public borrowerOperations;
    address public troveManager;
    IERC20 public collToken;

    mapping(address => uint256) internal balances;

    address public immutable deployer;

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyTroveManager() {
        require(msg.sender == troveManager, "CollSurplusPool: not TroveManager");
        _;
    }

    modifier onlyBorrowerOperations() {
        require(msg.sender == borrowerOperations, "CollSurplusPool: not BorrowerOps");
        _;
    }

    function setAddresses(
        address _borrowerOperations,
        address _troveManager,
        address _collToken
    ) external {
        require(msg.sender == deployer, "CollSurplusPool: not deployer");
        require(borrowerOperations == address(0), "Already set");
        borrowerOperations = _borrowerOperations;
        troveManager = _troveManager;
        collToken = IERC20(_collToken);
    }

    function getCollateral(address _account) external view returns (uint256) {
        return balances[_account];
    }

    function accountSurplus(address _account, uint256 _amount) external onlyTroveManager {
        balances[_account] += _amount;
    }

    function claimColl(address _account) external onlyBorrowerOperations {
        uint256 claimableColl = balances[_account];
        require(claimableColl > 0, "No surplus");
        balances[_account] = 0;
        collToken.safeTransfer(_account, claimableColl);
    }
}
