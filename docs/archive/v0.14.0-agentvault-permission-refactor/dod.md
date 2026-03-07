# DoD (Definition of Done) - v0.14.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | IAgentVault.sol에 ExecutionPermission, TokenAllowance, TokenCapInput struct 정의. 기존 Permission struct 제거 | 코드 리뷰: struct 정의 확인, Permission 참조 0건 |
| F2 | AgentVault.sol에 `_execPerms`, `_tokenAllowances`, `_permNonce` mapping 사용. 기존 `_permissions` mapping 제거 | 코드 리뷰: mapping 선언 확인, `_permissions` 참조 0건 |
| F3 | `grantPermission(agent, targets, functions, expiry, tokenCaps)` — 실행 권한 설정 + 토큰별 cap 설정 + nonce 증가. 2개 이상의 tokenCaps를 단일 호출로 설정 가능 | `forge build --skip test` 통과 + 코드 리뷰 |
| F4 | `setTokenAllowances(agent, tokenCaps)` — 기존 실행 권한 유지하면서 토큰 cap만 업데이트 (nonce 동일 유지) | `forge build --skip test` 통과 + 코드 리뷰 |
| F5 | `approveAndExecute(user, token, amount, target, data)` — 아래 7개 require 모두 구현: (1) active 검증, (2) expiry 검증, (3) target whitelist, (4) selector whitelist, (5) nonce 일치, (6) token cap 이내, (7) user 잔고 충분. 이후 approve→call→cleanup 순서 | 코드 리뷰: 7개 require + 3단계 실행 순서 확인 |
| F6 | `transferFromVault(user, token, to, amount)` — `to`가 allowedTargets 또는 user 본인이어야 함 | 코드 리뷰: require 조건 확인 |
| F7 | `revokePermission(agent)` — `_execPerms[user][agent].active = false` 설정 | 코드 리뷰 |
| F8 | `getPermission(user, agent, tokens)` — ExecutionPermission + 토큰별 allowance 반환. nonce mismatch인 토큰은 cap=0, spent=0 반환 | 코드 리뷰: nonce 체크 로직 확인 |
| F9 | `getTokenAllowance(user, agent, token)` — nonce mismatch 시 (0, 0) 반환 | 코드 리뷰: nonce 체크 로직 확인 |
| F10 | `getPermNonce(user, agent)` view 함수 존재 | 코드 리뷰 |
| F11 | `executeOnBehalf(user, target, data)` — 내부에서 `_checkExecPermission` 헬퍼 사용 (active, expiry, target, selector 검증), 시그니처 변경 없음 | 코드 리뷰 |
| F12 | `getDelegatedUsers(agent)` — `_execPerms` 참조, 시그니처 변경 없음. active=true이고 expiry 유효한 user만 반환 (기존 동작 유지) | 코드 리뷰: 2-pass loop에서 `ep.active && (ep.expiry == 0 \|\| block.timestamp <= ep.expiry)` 조건 확인 |
| F13 | IAgentVault.sol과 AgentVault.sol (custom/ + src/) 모두 동일하게 수정 | diff 비교: `diff packages/liquity/contracts/custom/AgentVault.sol packages/liquity/contracts/src/AgentVault.sol` |
| F14 | 이벤트: PermissionGranted (tokenCaps 포함), TokenAllowancesUpdated, ApprovedAndExecuted (spender 없음), TransferredFromVault | 코드 리뷰: 이벤트 정의 + emit 확인 |
| F15 | ABI 업데이트 — `packages/core/src/abis/agent.ts`의 AgentVaultABI가 새 함수/이벤트/struct 반영 | 코드 리뷰: ABI 항목과 Solidity 시그니처 대조 |
| F16 | ABI 업데이트 — `packages/agent-runtime/src/abis.ts`의 AgentVaultABI가 새 함수 반영 | 코드 리뷰 |
| F17 | ABI 업데이트 — `packages/shared/src/abis/erc8004.ts`의 AgentVaultABI가 새 시그니처 반영 (구식 ABI drift 방지) | 코드 리뷰: Solidity 시그니처와 대조 |
| F18 | agent-runtime types.ts — PermissionState가 ExecutionPermission + TokenAllowance 반영 | 코드 리뷰 |
| F19 | agent-runtime vault.ts — `getPermission` 호출 시 tokens 파라미터 전달, nonce 기반 필터링 반영 | 코드 리뷰 |
| F20 | agent-runtime liquity-add-collateral.ts — `approveFromVault` 3회 호출 → `approveAndExecute` 1회 호출로 변경 | 코드 리뷰 |
| F21 | agent-runtime morpho-supply.ts — `approveFromVault` 3회 호출 → `approveAndExecute` 1회 호출로 변경 | 코드 리뷰 |
| F22 | 프론트엔드 useVaultPermission.ts — grantPermission에 tokenCaps 파라미터, getPermission에 tokens 파라미터 | 코드 리뷰 |
| F23 | 프론트엔드 PermissionForm.tsx — preset 모드에서 토큰별 cap 입력 UI. custom 모드에서는 tokenCaps=[] (cap 입력 숨김/비활성) | 코드 리뷰: custom 모드에서 tokenCaps 빈 배열 확인 |
| F24 | 프론트엔드 PermissionList.tsx — 토큰별 cap/spent 목록 표시 (기존 단일 spendingCap 제거) | 코드 리뷰 |
| F25 | 테스트넷 재배포 완료, 새 주소로 addresses.ts + config.ts 업데이트 | RPC 검증: 새 주소에서 `getPermNonce` 호출 성공 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | `forge build --skip test` 성공 (Solidity 컴파일 에러 0) | 명령어 실행 결과 |
| N2 | TypeScript 타입 에러 0 (`tsc --noEmit` 대상: core, agent-runtime, web, agent-server) | 명령어 실행 결과 |
| N3 | 기존 deposit, withdraw, getBalance 함수 시그니처 미변경 | 코드 리뷰: diff에 해당 함수 변경 없음 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | revoke 후 re-grant — 이전 grant에서 설정한 토큰 B의 cap이 새 grant에 포함되지 않음 | 토큰 B의 `_deductTokenAllowance` 호출 시 nonce mismatch로 revert | 코드 리뷰: nonce 체크 로직 |
| E2 | revoke 후 re-grant — `getTokenAllowance(user, agent, tokenB)` 조회 | nonce mismatch이므로 (0, 0) 반환 | 코드 리뷰: view 함수 nonce 체크 |
| E3 | `approveAndExecute`에서 `target.call(data)` 실패 | 전체 tx revert — 잔고/spent/approve 모두 되돌림 | 코드 리뷰: require(success) 확인 |
| E4 | `transferFromVault`에서 `to`가 allowedTargets에 없고 user도 아닌 주소 | revert "destination not allowed" | 코드 리뷰: require 조건 |
| E5 | `approveAndExecute`에서 `amount`가 토큰 allowance cap 초과 | revert "token cap exceeded" | 코드 리뷰: `_deductTokenAllowance` 로직 |
| E6 | `setTokenAllowances` 호출 시 `_execPerms` active=false | revert "no active permission" | 코드 리뷰: require 조건 |
| E7 | `grantPermission` 호출 시 tokenCaps 빈 배열 | 실행 권한만 설정, 토큰 allowance 없음 (approveAndExecute/transferFromVault 호출 시 cap=0으로 revert) | 코드 리뷰 |
| E8 | expiry=0으로 설정 | 만료 없음 (영구 권한) | 코드 리뷰: `expiry == 0 \|\| block.timestamp <= expiry` |
| E9 | PermissionForm custom 모드에서 grant 호출 | tokenCaps=[] 전달, approveAndExecute 사용 불가 (executeOnBehalf만 가능) | 코드 리뷰: PermissionForm.tsx |
| E10 | `approveAndExecute` 호출 시 active=false인 permission | revert "no permission" | 코드 리뷰: `_checkExecPermission` active 체크 |
| E11 | `approveAndExecute` 호출 시 permission 만료 | revert "expired" | 코드 리뷰: `_checkExecPermission` expiry 체크 |
| E12 | `approveAndExecute` 호출 시 target이 allowedTargets에 없음 | revert "target not allowed" | 코드 리뷰: `_checkExecPermission` target 체크 |
| E13 | `approveAndExecute` 호출 시 selector가 allowedFunctions에 없음 | revert "function not allowed" | 코드 리뷰: `_checkExecPermission` selector 체크 |
| E14 | `executeOnBehalf` 호출 시 active=false / 만료 / target 불허 / selector 불허 | 각각 해당 revert 메시지 | 코드 리뷰: `_checkExecPermission` 재사용 확인 |
| E15 | `getDelegatedUsers` — revoke된 user | 반환 목록에서 제외 | 코드 리뷰: active 체크 확인 |
| E16 | `getDelegatedUsers` — permission 만료된 user | 반환 목록에서 제외 | 코드 리뷰: expiry 체크 확인 |

## Waiver

| 항목 | 사유 | 대체 검증 |
|------|------|----------|
| Foundry unit test | forge-std 미설치 | 코드 리뷰 + RPC 검증 + Codex 코드 리뷰 |
