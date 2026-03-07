# Micro Steps - v0.14.0 AgentVault Permission Refactor

## 전체 현황

| Step | 설명 | 난이도 | 선행 | 상태 |
|------|------|--------|------|------|
| 01 | [Solidity 컨트랙트 리팩토링](step-01-solidity-contract.md) | 🔴 | - | ⏳ |
| 02 | [테스트넷 배포 + 주소 업데이트](step-02-deploy.md) | 🟡 | 01 | ⏳ |
| 03 | [ABI 업데이트 (3곳)](step-03-abi.md) | 🟡 | 01 | ⏳ |
| 04 | [agent-runtime 수정](step-04-runtime.md) | 🟠 | 03 | ⏳ |
| 05 | [agent-server 빌드 검증](step-05-server.md) | 🟢 | 04 | ⏳ |
| 06 | [프론트엔드 수정](step-06-frontend.md) | 🟠 | 03 | ⏳ |
| 07 | [통합 검증](step-07-verification.md) | 🟡 | 01~06 | ⏳ |

## 의존성 그래프

```
Step 01 (Solidity)
  ├── Step 02 (Deploy)
  ├── Step 03 (ABI)
  │     ├── Step 04 (Runtime)
  │     │     └── Step 05 (Server)
  │     └── Step 06 (Frontend)
  └── Step 07 (Verification) ← 전체 완료 후
```

## 커버리지 매트릭스

### PRD 목표 → 티켓 매핑

| # | PRD 목표 | 커버 티켓 |
|---|---------|----------|
| G1 | 관심사 분리 (실행 권한 + 토큰 cap) | Step 01 (struct/mapping 분리) |
| G2 | 토큰별 cap | Step 01 (TokenAllowance), Step 06 (UI) |
| G3 | 자금 이동 보안 강화 | Step 01 (approveAndExecute, transferFromVault) |
| G4 | 효율적 권한 설정 | Step 01 (grantPermission+tokenCaps), Step 06 (PermissionForm) |
| G5 | 전체 스택 연동 | Step 01~07 전체 |

### DoD → 티켓 매핑

#### 기능 완료 조건 (F1~F25)

| DoD | 설명 | 티켓 |
|-----|------|------|
| F1 | struct 정의 (ExecutionPermission, TokenAllowance, TokenCapInput) | Step 01 |
| F2 | mapping 교체 (_execPerms, _tokenAllowances, _permNonce) | Step 01 |
| F3 | grantPermission 새 시그니처 + nonce | Step 01 |
| F4 | setTokenAllowances | Step 01 |
| F5 | approveAndExecute 7개 require | Step 01 |
| F6 | transferFromVault 목적지 검증 | Step 01 |
| F7 | revokePermission | Step 01 |
| F8 | getPermission nonce 체크 | Step 01 |
| F9 | getTokenAllowance nonce 체크 | Step 01 |
| F10 | getPermNonce view | Step 01 |
| F11 | executeOnBehalf _checkExecPermission | Step 01 |
| F12 | getDelegatedUsers active/expiry 필터링 | Step 01 |
| F13 | custom/ vs src/ 동일 | Step 01, Step 07 (검증) |
| F14 | 이벤트 정의 + emit | Step 01 |
| F15 | ABI: core/abis/agent.ts | Step 03 |
| F16 | ABI: agent-runtime/abis.ts | Step 03 |
| F17 | ABI: shared/abis/erc8004.ts | Step 03 |
| F18 | runtime types.ts | Step 04 |
| F19 | runtime vault.ts getPermission | Step 04 |
| F20 | runtime liquity-add-collateral.ts | Step 04 |
| F21 | runtime morpho-supply.ts | Step 04 |
| F22 | frontend useVaultPermission.ts | Step 06 |
| F23 | frontend PermissionForm.tsx | Step 06 |
| F24 | frontend PermissionList.tsx | Step 06 |
| F25 | 테스트넷 재배포 + 주소 업데이트 | Step 02, Step 07 (검증) |

#### 비기능 완료 조건 (N1~N3)

| DoD | 설명 | 티켓 |
|-----|------|------|
| N1 | forge build --skip test 성공 | Step 01, Step 07 (검증) |
| N2 | tsc --noEmit (core, runtime, server, web) | Step 05 (server), Step 06 (web), Step 07 (전체) |
| N3 | deposit/withdraw/getBalance 시그니처 미변경 | Step 01, Step 07 (검증) |

#### 엣지케이스 (E1~E16)

| DoD | 설명 | 티켓 |
|-----|------|------|
| E1 | revoke 후 re-grant — stale token nonce revert | Step 01 (nonce 로직) |
| E2 | revoke 후 getTokenAllowance — (0,0) 반환 | Step 01 (view nonce 체크) |
| E3 | approveAndExecute target.call 실패 — 전체 revert | Step 01 (require(success)) |
| E4 | transferFromVault 미허용 to — revert | Step 01 (목적지 검증) |
| E5 | approveAndExecute cap 초과 — revert | Step 01 (_deductTokenAllowance) |
| E6 | setTokenAllowances active=false — revert | Step 01 (require active) |
| E7 | grantPermission tokenCaps=[] — 실행 권한만 | Step 01 |
| E8 | expiry=0 — 영구 권한 | Step 01 |
| E9 | custom mode grant — tokenCaps=[] | Step 06 (PermissionForm) |
| E10 | approveAndExecute active=false — revert | Step 01 (_checkExecPermission) |
| E11 | approveAndExecute expired — revert | Step 01 (_checkExecPermission) |
| E12 | approveAndExecute target 불허 — revert | Step 01 (_checkExecPermission) |
| E13 | approveAndExecute selector 불허 — revert | Step 01 (_checkExecPermission) |
| E14 | executeOnBehalf 각종 거부 — revert | Step 01 (_checkExecPermission) |
| E15 | getDelegatedUsers — revoke된 user 제외 | Step 01 (active 체크) |
| E16 | getDelegatedUsers — 만료된 user 제외 | Step 01 (expiry 체크) |

### 설계 결정 (TD) → 티켓 매핑

| TD | 결정 | 티켓 |
|----|------|------|
| TD-1 | approveFromVault → approveAndExecute | Step 01 (구현), Step 04 (호출부) |
| TD-2 | transferFromVault to 제한 | Step 01 |
| TD-3 | 토큰 allowance mapping 기반 | Step 01 |
| TD-4 | getPermission tokens 파라미터 | Step 01 (Solidity), Step 04 (runtime), Step 06 (frontend) |
| TD-5 | revokePermission agent 단위 전체 | Step 01 |
| TD-6 | setTokenAllowances 별도 함수 | Step 01 |
| TD-7 | nonce 기반 stale allowance 무효화 | Step 01 |
| TD-8 | spender == target 고정 | Step 01, Step 04 |
| TD-9 | Solidity 0.8.24 유지 | Step 01 |
| TD-10 | IAgentVault 전면 교체 | Step 01 |
| TD-11 | exact-spend pre-deduct | Step 01, Step 04 |
| TD-12 | view stale → cap=0, spent=0 | Step 01 |
| TD-13 | custom mode executeOnBehalf only | Step 06 (PermissionForm) |

### 미커버 항목 확인

- **PRD 목표**: 5/5 커버 ✅
- **DoD 기능 (F)**: 25/25 커버 ✅
- **DoD 비기능 (N)**: 3/3 커버 ✅
- **DoD 엣지케이스 (E)**: 16/16 커버 ✅
- **설계 결정 (TD)**: 13/13 커버 ✅
