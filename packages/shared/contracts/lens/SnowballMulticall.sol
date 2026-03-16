// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SnowballMulticall
/// @notice 크로스 프로토콜 배치 실행기 — 여러 프로토콜 작업을 하나의 tx로 실행
/// @dev 화이트리스트된 타겟만 허용, 슬리피지 보호 포함

contract SnowballMulticall is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Storage ────────────────────────────────────────────────────────

    mapping(address => bool) public whitelistedTargets;

    // ─── Events ─────────────────────────────────────────────────────────

    event TargetWhitelisted(address indexed target, bool status);
    event BatchExecuted(address indexed user, uint256 callCount, uint256 successCount);

    // ─── Errors ─────────────────────────────────────────────────────────

    error TargetNotWhitelisted(address target);
    error CallFailed(uint256 index, bytes reason);
    error LengthMismatch();
    error SlippageExceeded(address token, uint256 expected, uint256 actual);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    // ─── Admin ──────────────────────────────────────────────────────────

    function setWhitelist(address target, bool status) external onlyOwner {
        whitelistedTargets[target] = status;
        emit TargetWhitelisted(target, status);
    }

    function setWhitelistBatch(address[] calldata targets, bool[] calldata statuses) external onlyOwner {
        if (targets.length != statuses.length) revert LengthMismatch();
        for (uint256 i = 0; i < targets.length; i++) {
            whitelistedTargets[targets[i]] = statuses[i];
            emit TargetWhitelisted(targets[i], statuses[i]);
        }
    }

    // ─── Structs ────────────────────────────────────────────────────────

    struct Call {
        address target;
        bytes   data;
        uint256 value;    // native CTC to send
    }

    struct TokenCheck {
        address token;
        uint256 minBalance; // 실행 후 이 금액 이상이어야 함 (슬리피지 보호)
    }

    // ─── Core: 배치 실행 ────────────────────────────────────────────────

    /// @notice 여러 컨트랙트 호출을 순차 실행
    /// @param calls 실행할 호출 배열
    /// @param tokenChecks 실행 후 잔액 검증 (슬리피지 보호)
    function execute(
        Call[] calldata calls,
        TokenCheck[] calldata tokenChecks
    ) external payable nonReentrant {
        uint256 successCount;

        for (uint256 i = 0; i < calls.length; i++) {
            if (!whitelistedTargets[calls[i].target]) {
                revert TargetNotWhitelisted(calls[i].target);
            }

            (bool success, bytes memory result) = calls[i].target.call{value: calls[i].value}(calls[i].data);
            if (!success) {
                revert CallFailed(i, result);
            }
            successCount++;
        }

        // 슬리피지 검증
        for (uint256 j = 0; j < tokenChecks.length; j++) {
            uint256 bal = IERC20(tokenChecks[j].token).balanceOf(msg.sender);
            if (bal < tokenChecks[j].minBalance) {
                revert SlippageExceeded(tokenChecks[j].token, tokenChecks[j].minBalance, bal);
            }
        }

        emit BatchExecuted(msg.sender, calls.length, successCount);
    }

    // ─── 편의 함수: 토큰 Pull + 실행 + Push ────────────────────────────

    struct TokenTransfer {
        address token;
        uint256 amount;
    }

    /// @notice 유저로부터 토큰을 당겨오고 → 배치 실행 → 남은 토큰 반환
    /// @dev 유저가 이 컨트랙트에 approve 해야 함
    function executeWithTokens(
        TokenTransfer[] calldata pullTokens,
        Call[] calldata calls,
        TokenCheck[] calldata tokenChecks
    ) external payable nonReentrant {
        // Snapshot balances before pulling tokens to prevent stealing pre-existing
        // contract balances that belong to other users or previous transactions.
        uint256[] memory balBefore = new uint256[](pullTokens.length);
        for (uint256 i = 0; i < pullTokens.length; i++) {
            balBefore[i] = IERC20(pullTokens[i].token).balanceOf(address(this));
        }

        // Pull tokens from user
        for (uint256 i = 0; i < pullTokens.length; i++) {
            IERC20(pullTokens[i].token).safeTransferFrom(
                msg.sender, address(this), pullTokens[i].amount
            );
        }

        // Execute calls
        for (uint256 i = 0; i < calls.length; i++) {
            if (!whitelistedTargets[calls[i].target]) {
                revert TargetNotWhitelisted(calls[i].target);
            }
            (bool success, bytes memory result) = calls[i].target.call{value: calls[i].value}(calls[i].data);
            if (!success) revert CallFailed(i, result);
        }

        // Return only the caller's tokens: the delta above the pre-pull snapshot,
        // capped at the amount originally deposited. This prevents the caller from
        // sweeping any residual balance that was already in the contract.
        for (uint256 i = 0; i < pullTokens.length; i++) {
            uint256 currentBal = IERC20(pullTokens[i].token).balanceOf(address(this));
            // Maximum returnable = whatever the caller deposited (pulled amount)
            uint256 maxReturnable = pullTokens[i].amount;
            // Actual available above the pre-existing baseline
            uint256 available = currentBal > balBefore[i] ? currentBal - balBefore[i] : 0;
            uint256 toReturn = available < maxReturnable ? available : maxReturnable;
            if (toReturn > 0) {
                IERC20(pullTokens[i].token).safeTransfer(msg.sender, toReturn);
            }
        }

        // Slippage checks
        for (uint256 j = 0; j < tokenChecks.length; j++) {
            uint256 bal = IERC20(tokenChecks[j].token).balanceOf(msg.sender);
            if (bal < tokenChecks[j].minBalance) {
                revert SlippageExceeded(tokenChecks[j].token, tokenChecks[j].minBalance, bal);
            }
        }

        emit BatchExecuted(msg.sender, calls.length, calls.length);
    }

    // ─── Token rescue ───────────────────────────────────────────────────

    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function rescueETH(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
    }

    receive() external payable {}
}
