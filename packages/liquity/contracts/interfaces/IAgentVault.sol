// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentVault {
    struct Permission {
        address[] allowedTargets;
        bytes4[] allowedFunctions;
        uint256 spendingCap;
        uint256 spent;
        uint256 expiry;
        bool active;
    }

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event PermissionGranted(address indexed user, address indexed agent, uint256 expiry);
    event PermissionRevoked(address indexed user, address indexed agent);
    event ExecutedOnBehalf(address indexed user, address indexed agent, address target, bytes4 selector, uint256 value);

    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;

    function grantPermission(
        address agent,
        address[] calldata targets,
        bytes4[] calldata functions,
        uint256 cap,
        uint256 expiry
    ) external;

    function revokePermission(address agent) external;

    function executeOnBehalf(
        address user,
        address target,
        bytes calldata data
    ) external returns (bytes memory);

    function getPermission(address user, address agent) external view returns (Permission memory);
    function getBalance(address user, address token) external view returns (uint256);
}
