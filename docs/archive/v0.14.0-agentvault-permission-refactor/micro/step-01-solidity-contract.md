# Step 01: Solidity 컨트랙트 리팩토링

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (배포 전이므로 파일 복원)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- IAgentVault.sol: Permission struct 삭제 → ExecutionPermission, TokenAllowance, TokenCapInput, PermissionView, TokenAllowanceView struct 추가
- IAgentVault.sol: 함수 시그니처 변경 (grantPermission, getPermission) + 신규 (setTokenAllowances, approveAndExecute, getTokenAllowance, getPermNonce)
- IAgentVault.sol: 이벤트 변경 (PermissionGranted) + 신규 (TokenAllowancesUpdated, ApprovedAndExecuted, TransferredFromVault)
- AgentVault.sol (custom/ + src/): mapping 교체 (_permissions → _execPerms + _tokenAllowances + _permNonce)
- AgentVault.sol: grantPermission 리라이트 (tokenCaps + nonce)
- AgentVault.sol: approveAndExecute 신규 (atomic approve-execute-cleanup)
- AgentVault.sol: transferFromVault 보안 강화 (목적지 검증)
- AgentVault.sol: setTokenAllowances 신규
- AgentVault.sol: getPermission/getTokenAllowance/getPermNonce view 함수
- AgentVault.sol: _checkExecPermission, _deductTokenAllowance 헬퍼
- AgentVault.sol: executeOnBehalf 내부 리팩토링 (_checkExecPermission 사용)
- AgentVault.sol: getDelegatedUsers 내부 리팩토링 (_execPerms 참조)
- AgentVault.sol: revokePermission 내부 리팩토링 (_execPerms 참조)

## 2. 완료 조건
- [ ] F1: IAgentVault.sol에 ExecutionPermission, TokenAllowance, TokenCapInput struct 정의, Permission 참조 0건
- [ ] F2: AgentVault.sol에 _execPerms, _tokenAllowances, _permNonce mapping, _permissions 참조 0건
- [ ] F3: grantPermission 새 시그니처 + nonce 증가
- [ ] F4: setTokenAllowances 구현
- [ ] F5: approveAndExecute 7개 require + approve-call-cleanup
- [ ] F6: transferFromVault 목적지 검증
- [ ] F7: revokePermission _execPerms 사용
- [ ] F8: getPermission nonce 체크
- [ ] F9: getTokenAllowance nonce 체크
- [ ] F10: getPermNonce view 함수
- [ ] F11: executeOnBehalf _checkExecPermission 사용
- [ ] F12: getDelegatedUsers _execPerms 참조 + active/expiry 필터링
- [ ] F13: custom/ + src/ 동일
- [ ] F14: 이벤트 정의 + emit
- [ ] N1: `forge build --skip test` 성공

## 3. 롤백 방법
- git restore로 파일 복원

---

## Scope

### 수정 대상 파일
```
packages/liquity/contracts/
├── interfaces/IAgentVault.sol  # 전면 교체 - struct/함수/이벤트
├── custom/AgentVault.sol       # 전면 교체 - 구현체
└── src/AgentVault.sol          # 전면 교체 - 구현체 (custom과 동일)
```

### 신규 생성 파일
없음

### Side Effect 위험
- forge build가 test 파일에서 실패할 수 있음 → `--skip test` 사용

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| IAgentVault.sol | F1, F3~F14 | ✅ OK |
| custom/AgentVault.sol | F2~F14 | ✅ OK |
| src/AgentVault.sol | F13 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 모든 구현 항목 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: 테스트넷 배포](step-02-deploy.md)
