// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentVault {
    // ──────────────────── Structs ────────────────────

    struct ExecutionPermission {
        address[] allowedTargets;
        bytes4[] allowedFunctions;
        uint256 expiry;
        bool active;
        bool validateBeneficiary; // if true, first address arg in calldata must equal user
    }

    struct TokenAllowance {
        uint256 cap;
        uint256 spent;
        uint256 nonce;
    }

    struct TokenCapInput {
        address token;
        uint256 cap;
    }

    struct PermissionView {
        address[] allowedTargets;
        bytes4[] allowedFunctions;
        uint256 expiry;
        bool active;
        TokenAllowanceView[] tokenAllowances;
    }

    struct TokenAllowanceView {
        address token;
        uint256 cap;
        uint256 spent;
    }

    // ──────────────────── Events ────────────────────

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event PermissionGranted(
        address indexed user, address indexed agent,
        address[] targets, bytes4[] functions,
        uint256 expiry, TokenCapInput[] tokenCaps
    );
    event PermissionRevoked(address indexed user, address indexed agent);
    event TokenAllowancesUpdated(address indexed user, address indexed agent, TokenCapInput[] tokenCaps);
    event ExecutedOnBehalf(address indexed user, address indexed agent, address target, bytes4 selector, uint256 value);
    event ApprovedAndExecuted(address indexed user, address indexed agent, address token, uint256 amount, address target, bytes4 selector);
    event TransferredFromVault(address indexed user, address indexed agent, address token, address to, uint256 amount);

    // ──────────────────── Deposit / Withdraw ────────────────────

    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;

    // ──────────────────── Permission Management ────────────────────

    function grantPermission(
        address agent,
        address[] calldata targets,
        bytes4[] calldata functions,
        uint256 expiry,
        bool validateBeneficiary,
        TokenCapInput[] calldata tokenCaps
    ) external;

    function revokePermission(address agent) external;

    function setTokenAllowances(
        address agent,
        TokenCapInput[] calldata tokenCaps
    ) external;

    // ──────────────────── Agent Execution ────────────────────

    function executeOnBehalf(
        address user,
        address target,
        bytes calldata data,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external returns (bytes memory);

    function approveAndExecute(
        address user,
        address token,
        uint256 amount,
        address target,
        bytes calldata data
    ) external returns (bytes memory);

    function transferFromVault(
        address user,
        address token,
        address to,
        uint256 amount
    ) external;

    // ──────────────────── View Functions ────────────────────

    function getPermission(
        address user,
        address agent,
        address[] calldata tokens
    ) external view returns (PermissionView memory);

    function getTokenAllowance(
        address user,
        address agent,
        address token
    ) external view returns (uint256 cap, uint256 spent);

    function getPermNonce(address user, address agent) external view returns (uint256);

    function getBalance(address user, address token) external view returns (uint256);
    function getDelegatedUsers(address agent) external view returns (address[] memory);
    function getDelegatedUsers(address agent, uint256 offset, uint256 limit) external view returns (address[] memory);
}
