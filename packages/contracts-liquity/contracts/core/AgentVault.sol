// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAgentVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentVault — Delegated execution vault for AI agent automation
/// @notice Users deposit tokens and grant permissions to agents who can execute
///         whitelisted calls (e.g. adjustTroveInterestRate, addColl) on their behalf.
contract AgentVault is IAgentVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // user => token => balance
    mapping(address => mapping(address => uint256)) private _balances;

    // user => agent => Permission
    mapping(address => mapping(address => Permission)) private _permissions;

    // ──────────────────── Deposit / Withdraw ────────────────────

    /// @notice Deposit ERC-20 tokens into the vault. Caller must approve first.
    function deposit(address token, uint256 amount) external override nonReentrant {
        require(amount > 0, "AgentVault: zero amount");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _balances[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw your own tokens from the vault.
    function withdraw(address token, uint256 amount) external override nonReentrant {
        require(amount > 0, "AgentVault: zero amount");
        uint256 bal = _balances[msg.sender][token];
        require(bal >= amount, "AgentVault: insufficient balance");
        _balances[msg.sender][token] = bal - amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    // ──────────────────── Permission Management ────────────────────

    /// @notice Grant an agent permission to call specific targets/functions on your behalf.
    /// @param agent       The agent EOA that will call executeOnBehalf
    /// @param targets     Whitelisted contract addresses (e.g. BorrowerOperations)
    /// @param functions   Whitelisted function selectors (e.g. adjustTroveInterestRate)
    /// @param cap         Max collateral (wei) the agent may move from your vault balance
    /// @param expiry      Unix timestamp after which permission expires (0 = no expiry)
    function grantPermission(
        address agent,
        address[] calldata targets,
        bytes4[] calldata functions,
        uint256 cap,
        uint256 expiry
    ) external override {
        require(agent != address(0), "AgentVault: zero agent");
        require(targets.length > 0, "AgentVault: no targets");
        require(functions.length > 0, "AgentVault: no functions");
        require(expiry == 0 || expiry > block.timestamp, "AgentVault: expired");

        _permissions[msg.sender][agent] = Permission({
            allowedTargets: targets,
            allowedFunctions: functions,
            spendingCap: cap,
            spent: 0,
            expiry: expiry,
            active: true
        });

        emit PermissionGranted(msg.sender, agent, expiry);
    }

    /// @notice Immediately revoke all permissions for the given agent.
    function revokePermission(address agent) external override {
        require(_permissions[msg.sender][agent].active, "AgentVault: not active");
        _permissions[msg.sender][agent].active = false;
        emit PermissionRevoked(msg.sender, agent);
    }

    // ──────────────────── Agent Execution ────────────────────

    /// @notice Execute a whitelisted call on behalf of `user`.
    ///         The caller (msg.sender) must be an authorised agent with valid permission.
    /// @param user    The depositor whose permission & balance are checked
    /// @param target  The contract to call (must be in allowedTargets)
    /// @param data    The encoded calldata (selector must be in allowedFunctions)
    function executeOnBehalf(
        address user,
        address target,
        bytes calldata data
    ) external override nonReentrant returns (bytes memory) {
        Permission storage perm = _permissions[user][msg.sender];

        // 1. Active check
        require(perm.active, "AgentVault: no permission");

        // 2. Expiry check
        require(perm.expiry == 0 || block.timestamp <= perm.expiry, "AgentVault: expired");

        // 3. Target whitelist
        require(_containsAddress(perm.allowedTargets, target), "AgentVault: target not allowed");

        // 4. Function selector whitelist
        bytes4 selector = bytes4(data[:4]);
        require(_containsSelector(perm.allowedFunctions, selector), "AgentVault: function not allowed");

        // 5. Execute the call
        (bool success, bytes memory result) = target.call(data);
        require(success, "AgentVault: call failed");

        emit ExecutedOnBehalf(user, msg.sender, target, selector, 0);
        return result;
    }

    // ──────────────────── Vault-funded execution ────────────────────

    /// @notice Approve a target contract to spend vault-held tokens on behalf of user.
    ///         Only callable by an authorised agent within spending cap.
    function approveFromVault(
        address user,
        address token,
        address spender,
        uint256 amount
    ) external nonReentrant {
        Permission storage perm = _permissions[user][msg.sender];
        require(perm.active, "AgentVault: no permission");
        require(perm.expiry == 0 || block.timestamp <= perm.expiry, "AgentVault: expired");
        require(perm.spent + amount <= perm.spendingCap, "AgentVault: cap exceeded");
        require(_balances[user][token] >= amount, "AgentVault: insufficient balance");

        perm.spent += amount;
        _balances[user][token] -= amount;

        IERC20(token).forceApprove(spender, amount);
    }

    /// @notice Transfer vault-held tokens to a target on behalf of user.
    ///         Only callable by an authorised agent within spending cap.
    function transferFromVault(
        address user,
        address token,
        address to,
        uint256 amount
    ) external nonReentrant {
        Permission storage perm = _permissions[user][msg.sender];
        require(perm.active, "AgentVault: no permission");
        require(perm.expiry == 0 || block.timestamp <= perm.expiry, "AgentVault: expired");
        require(perm.spent + amount <= perm.spendingCap, "AgentVault: cap exceeded");

        uint256 bal = _balances[user][token];
        require(bal >= amount, "AgentVault: insufficient balance");

        perm.spent += amount;
        _balances[user][token] = bal - amount;
        IERC20(token).safeTransfer(to, amount);
    }

    // ──────────────────── View Functions ────────────────────

    function getPermission(address user, address agent) external view override returns (Permission memory) {
        return _permissions[user][agent];
    }

    function getBalance(address user, address token) external view override returns (uint256) {
        return _balances[user][token];
    }

    // ──────────────────── Internal Helpers ────────────────────

    function _containsAddress(address[] storage list, address item) internal view returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }

    function _containsSelector(bytes4[] storage list, bytes4 item) internal view returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }
}
