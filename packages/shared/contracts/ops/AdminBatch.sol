// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AdminBatch
/// @notice 관리자 작업을 배치로 실행 — 역할 부여, 파라미터 변경 등을 1 tx로
/// @dev 배포 후 초기 설정을 한 번에 처리하는 데 특히 유용

contract AdminBatch is Ownable {

    // ─── Errors ─────────────────────────────────────────────────────────

    error CallFailed(uint256 index, bytes reason);
    error LengthMismatch();

    // ─── Events ─────────────────────────────────────────────────────────

    event BatchExecuted(uint256 callCount);

    constructor(address _owner) Ownable(_owner) {}

    // ─── Structs ────────────────────────────────────────────────────────

    struct AdminCall {
        address target;
        bytes   data;
    }

    // ─── Core ───────────────────────────────────────────────────────────

    /// @notice 여러 관리자 호출을 순차 실행 (전부 성공 or 전부 롤백)
    /// @dev 이 컨트랙트가 각 target의 admin/owner 역할을 가져야 함
    function executeBatch(AdminCall[] calldata calls) external onlyOwner {
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = calls[i].target.call(calls[i].data);
            if (!success) revert CallFailed(i, result);
        }
        emit BatchExecuted(calls.length);
    }

    // ─── Convenience: 역할 배치 부여 ────────────────────────────────────

    /// @notice AccessControl.grantRole을 여러 컨트랙트에 배치 실행
    /// @param targets 역할을 부여할 컨트랙트 주소 배열
    /// @param roles 각 컨트랙트에 부여할 역할 (bytes32)
    /// @param accounts 역할을 받을 주소
    function batchGrantRoles(
        address[] calldata targets,
        bytes32[] calldata roles,
        address[] calldata accounts
    ) external onlyOwner {
        if (targets.length != roles.length || roles.length != accounts.length) revert LengthMismatch();

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call(
                abi.encodeWithSignature("grantRole(bytes32,address)", roles[i], accounts[i])
            );
            if (!success) revert CallFailed(i, result);
        }
        emit BatchExecuted(targets.length);
    }

    /// @notice AccessControl.revokeRole 배치
    function batchRevokeRoles(
        address[] calldata targets,
        bytes32[] calldata roles,
        address[] calldata accounts
    ) external onlyOwner {
        if (targets.length != roles.length || roles.length != accounts.length) revert LengthMismatch();

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call(
                abi.encodeWithSignature("revokeRole(bytes32,address)", roles[i], accounts[i])
            );
            if (!success) revert CallFailed(i, result);
        }
        emit BatchExecuted(targets.length);
    }

    // ─── Convenience: 프로토콜 초기 설정 ────────────────────────────────

    /// @notice 배포 직후 한 번만 실행 — Vault, Forward, SettlementEngine 역할 설정
    /// @dev 이 함수를 호출하면 모든 프로토콜 간 역할이 올바르게 설정됨
    ///
    /// 예시 사용:
    ///   adminBatch.setupProtocolRoles([
    ///     // Vault에 Forward를 OPERATOR로 등록
    ///     AdminCall(vault, abi.encodeCall(vault.grantRole, (OPERATOR_ROLE, forward))),
    ///     // Vault에 SettlementEngine을 OPERATOR로 등록
    ///     AdminCall(vault, abi.encodeCall(vault.grantRole, (OPERATOR_ROLE, engine))),
    ///     // Vault에 Marketplace를 MARKETPLACE_ROLE로 등록
    ///     AdminCall(vault, abi.encodeCall(vault.grantRole, (MARKETPLACE_ROLE, marketplace))),
    ///     // Forward에 Consumer를 CRE_CONSUMER_ROLE로 등록
    ///     AdminCall(forward, abi.encodeCall(forward.grantRole, (CRE_CONSUMER_ROLE, consumer))),
    ///     // RiskManager에 Forward를 operator로 등록
    ///     AdminCall(riskManager, abi.encodeCall(riskManager.setOperator, (forward, true))),
    ///     // ... 기타 설정
    ///   ]);
    function setupProtocolRoles(AdminCall[] calldata calls) external onlyOwner {
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = calls[i].target.call(calls[i].data);
            if (!success) revert CallFailed(i, result);
        }
        emit BatchExecuted(calls.length);
    }
}
