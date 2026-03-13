// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CollateralSwap
/// @notice Simple 1:1 swap between approved stablecoin pairs (e.g., aUSDC <-> mUSDC).
///         Must be pre-funded with both tokens by an admin.
contract CollateralSwap is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error ZeroAmount();
    error PairNotApproved();
    error InsufficientLiquidity();

    event PairApproved(address indexed tokenA, address indexed tokenB);
    event Swapped(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amount);

    /// @notice Approved swap pairs (bidirectional)
    mapping(address => mapping(address => bool)) public approvedPairs;

    constructor(address _admin) {
        if (_admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    /// @notice Approve a bidirectional 1:1 swap pair
    function approvePair(address tokenA, address tokenB) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();
        approvedPairs[tokenA][tokenB] = true;
        approvedPairs[tokenB][tokenA] = true;
        emit PairApproved(tokenA, tokenB);
    }

    /// @notice Swap tokenIn for tokenOut at 1:1 ratio
    /// @param tokenIn Token to deposit
    /// @param tokenOut Token to receive
    /// @param amount Amount to swap (same decimals assumed)
    function swap(address tokenIn, address tokenOut, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!approvedPairs[tokenIn][tokenOut]) revert PairNotApproved();
        if (IERC20(tokenOut).balanceOf(address(this)) < amount) revert InsufficientLiquidity();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(tokenOut).safeTransfer(msg.sender, amount);

        emit Swapped(msg.sender, tokenIn, tokenOut, amount);
    }
}
