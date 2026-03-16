// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IAgentVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentVault — Delegated execution vault for AI agent automation (v3)
/// @notice Users deposit tokens and grant permissions to agents who can execute
///         whitelisted calls on their behalf. Execution permissions and token
///         allowances are separated for fine-grained control.
contract AgentVault is IAgentVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // user => token => balance
    mapping(address => mapping(address => uint256)) private _balances;

    // user => agent => ExecutionPermission
    mapping(address => mapping(address => ExecutionPermission)) private _execPerms;

    // user => agent => token => TokenAllowance
    mapping(address => mapping(address => mapping(address => TokenAllowance))) private _tokenAllowances;

    // user => agent => nonce (incremented on each grantPermission)
    mapping(address => mapping(address => uint256)) private _permNonce;

    // agent => list of users who have ever granted permission
    mapping(address => address[]) private _delegatedUsers;
    // agent => user => whether user is already in _delegatedUsers array
    mapping(address => mapping(address => bool)) private _isDelegated;

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

    /// @notice Grant an agent permission to call specific targets/functions on your behalf,
    ///         with optional per-token spending caps.
    function grantPermission(
        address agent,
        address[] calldata targets,
        bytes4[] calldata functions,
        uint256 expiry,
        bool validateBeneficiary,
        TokenCapInput[] calldata tokenCaps
    ) external override {
        require(agent != address(0), "AgentVault: zero agent");
        require(targets.length > 0, "AgentVault: no targets");
        require(functions.length > 0, "AgentVault: no functions");
        require(expiry == 0 || expiry > block.timestamp, "AgentVault: expired");

        _execPerms[msg.sender][agent] = ExecutionPermission({
            allowedTargets: targets,
            allowedFunctions: functions,
            expiry: expiry,
            active: true,
            validateBeneficiary: validateBeneficiary
        });

        // Increment nonce to invalidate all previous token allowances
        _permNonce[msg.sender][agent]++;
        uint256 currentNonce = _permNonce[msg.sender][agent];

        // Set new token allowances with current nonce
        for (uint256 i = 0; i < tokenCaps.length; i++) {
            _tokenAllowances[msg.sender][agent][tokenCaps[i].token] = TokenAllowance({
                cap: tokenCaps[i].cap,
                spent: 0,
                nonce: currentNonce
            });
        }

        if (!_isDelegated[agent][msg.sender]) {
            _delegatedUsers[agent].push(msg.sender);
            _isDelegated[agent][msg.sender] = true;
        }

        emit PermissionGranted(msg.sender, agent, targets, functions, expiry, tokenCaps);
    }

    /// @notice Immediately revoke all permissions for the given agent.
    function revokePermission(address agent) external override {
        require(_execPerms[msg.sender][agent].active, "AgentVault: not active");
        _execPerms[msg.sender][agent].active = false;
        emit PermissionRevoked(msg.sender, agent);
    }

    /// @notice Update token allowances without changing execution permissions.
    ///         Uses the current nonce (does not increment).
    function setTokenAllowances(
        address agent,
        TokenCapInput[] calldata tokenCaps
    ) external override {
        require(_execPerms[msg.sender][agent].active, "AgentVault: no active permission");

        uint256 currentNonce = _permNonce[msg.sender][agent];
        for (uint256 i = 0; i < tokenCaps.length; i++) {
            TokenAllowance storage existing = _tokenAllowances[msg.sender][agent][tokenCaps[i].token];
            // Preserve spent if the allowance is still on the current nonce;
            // reset to 0 only when the new cap is less than what was already spent.
            uint256 preservedSpent = 0;
            if (existing.nonce == currentNonce) {
                preservedSpent = (tokenCaps[i].cap >= existing.spent) ? existing.spent : 0;
            }
            _tokenAllowances[msg.sender][agent][tokenCaps[i].token] = TokenAllowance({
                cap: tokenCaps[i].cap,
                spent: preservedSpent,
                nonce: currentNonce
            });
        }

        emit TokenAllowancesUpdated(msg.sender, agent, tokenCaps);
    }

    // ──────────────────── Agent Execution ────────────────────

    /// @notice Execute a whitelisted call on behalf of `user`.
    ///         Optionally deducts token allowances before the call (for operations that
    ///         move tokens without an explicit vault approval).
    /// @param tokens  Tokens whose allowances to deduct (must be same length as amounts).
    /// @param amounts Amounts to deduct from each corresponding token allowance.
    function executeOnBehalf(
        address user,
        address target,
        bytes calldata data,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external override nonReentrant returns (bytes memory) {
        // Fix 3: guard against data[:4] panic on short calldata
        require(data.length >= 4, "AgentVault: data too short");
        require(tokens.length == amounts.length, "AgentVault: tokens/amounts length mismatch");

        bytes4 selector = bytes4(data[:4]);
        _checkExecPermission(user, msg.sender, target, selector);

        // Fix 1: validate beneficiary when the permission requires it
        _validateBeneficiary(data, user);
        _validateCriticalArgs(data, user);

        // Fix 2: deduct token allowances to enforce caps before execution
        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0) {
                _deductTokenAllowance(user, msg.sender, tokens[i], amounts[i]);
            }
        }

        (bool success, bytes memory result) = target.call(data);
        require(success, "AgentVault: call failed");

        emit ExecutedOnBehalf(user, msg.sender, target, selector, 0);
        return result;
    }

    /// @notice Atomic approve-execute-cleanup for vault-funded operations.
    ///         Deducts token allowance, approves target, executes call, then cleans up approval.
    ///         Any tokens not consumed by the target call are credited back to the user's balance.
    function approveAndExecute(
        address user,
        address token,
        uint256 amount,
        address target,
        bytes calldata data
    ) external override nonReentrant returns (bytes memory) {
        // Fix 3: guard against data[:4] panic on short calldata
        require(data.length >= 4, "AgentVault: data too short");

        bytes4 selector = bytes4(data[:4]);

        // 1-4. Check execution permission (active, expiry, target, selector)
        _checkExecPermission(user, msg.sender, target, selector);

        // Fix 1: validate beneficiary when the permission requires it
        _validateBeneficiary(data, user);
        _validateCriticalArgs(data, user);

        // 5-6. Deduct token allowance (nonce check + cap check)
        _deductTokenAllowance(user, msg.sender, token, amount);

        // 7. Check user balance
        require(_balances[user][token] >= amount, "AgentVault: insufficient balance");
        _balances[user][token] -= amount;

        // Approve target to spend tokens
        IERC20(token).forceApprove(target, amount);

        // Fix 4: snapshot balance before call so we can return unused tokens
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        // Execute the call
        (bool success, bytes memory result) = target.call(data);
        require(success, "AgentVault: call failed");

        // Cleanup: remove any remaining approval
        IERC20(token).forceApprove(target, 0);

        // Fix 4: credit unused tokens back to the user's vault balance
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        if (balanceAfter > balanceBefore - amount) {
            // tokens were returned to us by the target (or only partially consumed)
            uint256 unused = balanceAfter - (balanceBefore - amount);
            _balances[user][token] += unused;
        }

        emit ApprovedAndExecuted(user, msg.sender, token, amount, target, selector);
        return result;
    }

    /// @notice Transfer vault-held tokens to a whitelisted target or back to the user.
    function transferFromVault(
        address user,
        address token,
        address to,
        uint256 amount
    ) external override nonReentrant {
        ExecutionPermission storage ep = _execPerms[user][msg.sender];
        require(ep.active, "AgentVault: no permission");
        require(ep.expiry == 0 || block.timestamp <= ep.expiry, "AgentVault: expired");

        // Destination must be in allowedTargets or be the user themselves
        require(
            to == user || _containsAddress(ep.allowedTargets, to),
            "AgentVault: destination not allowed"
        );

        // Deduct token allowance
        _deductTokenAllowance(user, msg.sender, token, amount);

        uint256 bal = _balances[user][token];
        require(bal >= amount, "AgentVault: insufficient balance");
        _balances[user][token] = bal - amount;

        IERC20(token).safeTransfer(to, amount);

        emit TransferredFromVault(user, msg.sender, token, to, amount);
    }

    // ──────────────────── View Functions ────────────────────

    function getPermission(
        address user,
        address agent,
        address[] calldata tokens
    ) external view override returns (PermissionView memory) {
        ExecutionPermission storage ep = _execPerms[user][agent];
        uint256 currentNonce = _permNonce[user][agent];

        TokenAllowanceView[] memory taViews = new TokenAllowanceView[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            TokenAllowance storage ta = _tokenAllowances[user][agent][tokens[i]];
            if (ta.nonce == currentNonce) {
                taViews[i] = TokenAllowanceView({
                    token: tokens[i],
                    cap: ta.cap,
                    spent: ta.spent
                });
            } else {
                // Stale allowance — return zeroed
                taViews[i] = TokenAllowanceView({
                    token: tokens[i],
                    cap: 0,
                    spent: 0
                });
            }
        }

        return PermissionView({
            allowedTargets: ep.allowedTargets,
            allowedFunctions: ep.allowedFunctions,
            expiry: ep.expiry,
            active: ep.active,
            tokenAllowances: taViews
        });
    }

    function getTokenAllowance(
        address user,
        address agent,
        address token
    ) external view override returns (uint256 cap, uint256 spent) {
        TokenAllowance storage ta = _tokenAllowances[user][agent][token];
        if (ta.nonce == _permNonce[user][agent]) {
            return (ta.cap, ta.spent);
        }
        // Stale — return zeroed
        return (0, 0);
    }

    function getPermNonce(address user, address agent) external view override returns (uint256) {
        return _permNonce[user][agent];
    }

    function getBalance(address user, address token) external view override returns (uint256) {
        return _balances[user][token];
    }

    /// @notice Returns active delegated users for an agent (backward-compatible, capped at 100).
    function getDelegatedUsers(address agent) external view override returns (address[] memory) {
        return _getDelegatedUsersPaginated(agent, 0, 100);
    }

    /// @notice Paginated version of getDelegatedUsers.
    /// @param offset Index into the active-user list to start from.
    /// @param limit  Maximum number of entries to return (capped at 100).
    function getDelegatedUsers(
        address agent,
        uint256 offset,
        uint256 limit
    ) external view override returns (address[] memory) {
        if (limit > 100) limit = 100;
        return _getDelegatedUsersPaginated(agent, offset, limit);
    }

    /// @dev Shared pagination logic for getDelegatedUsers.
    function _getDelegatedUsersPaginated(
        address agent,
        uint256 offset,
        uint256 limit
    ) internal view returns (address[] memory) {
        address[] storage all = _delegatedUsers[agent];

        // 1st pass: collect all active + non-expired into a temporary buffer
        address[] memory temp = new address[](all.length);
        uint256 total = 0;
        for (uint256 i = 0; i < all.length; i++) {
            ExecutionPermission storage ep = _execPerms[all[i]][agent];
            if (ep.active && (ep.expiry == 0 || block.timestamp <= ep.expiry)) {
                temp[total++] = all[i];
            }
        }

        // Apply pagination
        if (offset >= total) {
            return new address[](0);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 resultLen = end - offset;

        address[] memory result = new address[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            result[i] = temp[offset + i];
        }
        return result;
    }

    // ──────────────────── Internal Helpers ────────────────────

    /// @dev Validates critical non-first arguments for known dangerous selectors.
    ///      For BorrowerOperations.openTrove, enforces that _removeManager (arg 9)
    ///      and _receiver (arg 10) are either address(0) or the user, preventing an
    ///      agent from setting themselves as removeManager+receiver to steal funds.
    function _validateCriticalArgs(bytes calldata data, address user) internal pure {
        bytes4 selector = bytes4(data[:4]);

        // BorrowerOperations.openTrove — check _removeManager (arg 9) and _receiver (arg 10)
        // Selector: openTrove(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,address,address)
        if (selector == bytes4(keccak256("openTrove(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,address,address)"))) {
            if (data.length >= 356) { // 4 + 11*32 = 356
                address removeManager = address(uint160(uint256(bytes32(data[292:324]))));
                address receiver = address(uint160(uint256(bytes32(data[324:356]))));
                require(
                    removeManager == address(0) || removeManager == user,
                    "AgentVault: removeManager must be user or zero"
                );
                require(
                    receiver == address(0) || receiver == user,
                    "AgentVault: receiver must be user or zero"
                );
            }
        }
    }

    /// @dev Validates that the first address argument in calldata equals `user`
    ///      when the permission has validateBeneficiary enabled.
    ///      Calldata layout: [4-byte selector][32-byte slot for first arg, address in low 20 bytes].
    ///      Requires data.length >= 36.
    function _validateBeneficiary(bytes calldata data, address user) internal view {
        // The caller (msg.sender) is the agent; look up the permission for (user, agent).
        ExecutionPermission storage ep = _execPerms[user][msg.sender];
        if (!ep.validateBeneficiary) return;

        require(data.length >= 36, "AgentVault: calldata too short for beneficiary check");
        // The first ABI-encoded address occupies bytes 4..36; the address lives in the
        // last 20 bytes of that 32-byte word (right-padded in Solidity's ABI encoding).
        address beneficiary = address(uint160(uint256(bytes32(data[4:36]))));
        require(beneficiary == user, "AgentVault: beneficiary must be user");
    }

    /// @dev Check execution permission: active, expiry, target whitelist, selector whitelist.
    function _checkExecPermission(
        address user,
        address agent,
        address target,
        bytes4 selector
    ) internal view {
        ExecutionPermission storage ep = _execPerms[user][agent];
        require(ep.active, "AgentVault: no permission");
        require(ep.expiry == 0 || block.timestamp <= ep.expiry, "AgentVault: expired");
        require(_containsAddress(ep.allowedTargets, target), "AgentVault: target not allowed");
        require(_containsSelector(ep.allowedFunctions, selector), "AgentVault: function not allowed");
    }

    /// @dev Deduct from token allowance. Reverts on nonce mismatch or cap exceeded.
    function _deductTokenAllowance(
        address user,
        address agent,
        address token,
        uint256 amount
    ) internal {
        TokenAllowance storage ta = _tokenAllowances[user][agent][token];
        require(ta.nonce == _permNonce[user][agent], "AgentVault: stale allowance");
        require(ta.spent + amount <= ta.cap, "AgentVault: token cap exceeded");
        ta.spent += amount;
    }

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
