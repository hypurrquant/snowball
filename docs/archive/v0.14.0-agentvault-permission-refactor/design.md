# 설계 - v0.14.0

## 변경 규모
**규모**: 일반 기능 (상위, 컨트랙트 재배포 포함)
**근거**: 14개+ 파일 수정 (컨트랙트 2 + ABI 2 + agent-runtime 4 + 프론트엔드 6), 내부 API 변경 (grantPermission/getPermission 시그니처), 데이터 스키마 변경 (Permission struct 분리), 컨트랙트 재배포. 테스트넷 전용이므로 운영 리스크는 낮음.

---

## 문제 요약
AgentVault의 Permission 모델이 단일 `spendingCap`으로 토큰 종류를 구분하지 않고, 실행 권한과 지출 권한이 혼재되어 있음. `approveFromVault`에 pooled-custody 취약점, `transferFromVault`에 목적지 미검증 취약점 존재.

> 상세: [README.md](README.md) 참조

## 접근법

**관심사 분리**: 실행 권한(target+function whitelist)과 토큰 지출 권한(token+cap)을 독립 데이터 구조로 분리. `approveFromVault`를 atomic `approveAndExecute`로 교체하여 pooled-custody 취약점 해결. `transferFromVault`에 목적지 검증 추가.

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: target x function x token 단일 키 | 가장 세밀한 제어, O(1) 조회 | 조합 폭발 (12개+ 엔트리), executeOnBehalf에 token 강제, 열거 불가, UX 파괴 | - |
| B: 관심사 분리 (실행 + 토큰 cap) | 논리적 명확성, 토큰별 cap 자연 지원, 기존 capability 변경 최소 | 2개 mapping 관리, getPermission 복합 반환 | **선택** |
| C: 역할 기반 (Role-Based) | UX 최단순, 실수 가능성 적음 | 확장성 없음 (새 프로토콜 시 재배포), 커스텀 조합 불가 | - |

**선택 이유**: B는 보안성(atomic approve-execute), 확장성(토큰/프로토콜 추가에 유연), UX(실행 권한 1회 + 토큰 cap N회)의 균형이 최적.

## 기술 결정

| # | 결정 | 근거 |
|---|------|------|
| TD-1 | `approveFromVault` 제거 → `approveAndExecute` 도입 | pooled custody에서 approve 잔류 취약점 원천 차단 |
| TD-2 | `transferFromVault`의 `to`를 allowedTargets 또는 user로 제한 | 임의 주소 전송 취약점 차단 |
| TD-3 | 토큰 allowance를 mapping 기반 저장 (배열 아님) | O(1) 조회/차감, gas 효율적 |
| TD-4 | `getPermission`에 tokens 파라미터 추가 | mapping 열거 불가 → 호출자가 조회할 토큰 지정 |
| TD-5 | `revokePermission`은 agent 단위 전체 revoke 유지 | UX 단순성, 비상 차단 원클릭, 부분 revoke 사용사례 없음 |
| TD-6 | `setTokenAllowances` 별도 함수 제공 | 실행 권한 변경 없이 토큰 cap만 조정하는 사용사례 |
| TD-7 | revoke 시 tokenAllowance 삭제 안 함 + grantPermission은 nonce 기반 전체 교체 | active=false면 차감 불가. 재grant 시 nonce 증가로 이전 tokenAllowance 무효화 |
| TD-8 | `approveAndExecute`에서 spender == target 고정 (spender 파라미터 제거) | 현재 in-scope capability에서 spender != target 사용사례 없음. 불필요한 attack surface 제거 |
| TD-11 | `approveAndExecute`는 exact-spend 전제 + pre-deduct 방식 | Morpho supply와 Liquity addColl 모두 지정 amount를 정확히 소비. partial-spend 프로토콜은 비범위 |
| TD-12 | view 함수에서 stale tokenAllowance는 cap=0, spent=0 반환 | nonce mismatch인 entry를 UI에 노출하면 혼란. 0으로 정규화하여 "유효하지 않음" 표현 |
| TD-13 | PermissionForm custom 모드에서 approveAndExecute 미사용 | custom permission은 executeOnBehalf만 허용 (토큰 이동 없음). approveAndExecute는 preset capability 경로에서만 호출되므로 exact-spend 보장 |
| TD-9 | Solidity 0.8.24 유지 | 기존 컴파일러 버전 호환 |
| TD-10 | IAgentVault 전면 교체 | 테스트넷이므로 하위 호환 불필요 |

---

## 범위 / 비범위

**범위 (In Scope)**:
- AgentVault.sol (custom/ + src/) + IAgentVault.sol 전면 리팩토링
- ABI 2곳 (core, agent-runtime) 전면 교체
- agent-runtime: types, vault observer, 2개 capability (liquity-add-collateral, morpho-supply)
- 프론트엔드: types, useVaultPermission, PermissionForm, PermissionList, DelegationSetupWizard, DelegationStatus
- 배포 스크립트 업데이트 + 테스트넷 재배포
- 주소 업데이트 (addresses.ts, config.ts)

**비범위 (Out of Scope)**:
- Native coin 지원
- 새 capability 추가
- scheduler.service.ts 로직 변경 (getDelegatedUsers 시그니처 동일)
- Options 모듈
- executeOnBehalf calldata 파라미터 검증 (별도 phase)
- Partial-spend 프로토콜 지원 (post-call delta 정산, 별도 phase)

## 아키텍처 개요

### 새로운 Storage 구조

```
_execPerms:       user → agent → ExecutionPermission
_tokenAllowances: user → agent → token → TokenAllowance
_permNonce:       user → agent → uint256           (grantPermission마다 증가)
_balances:        user → token → uint256           (기존 유지)
_delegatedUsers:  agent → address[]                (기존 유지)
_isDelegated:     agent → user → bool              (기존 유지)
```

### Nonce 메커니즘 (Stale Token Allowance 방지)

문제: `revokePermission` 후 `grantPermission`을 다시 호출하면, 이전 grant에서 설정했지만 새 grant에서 빠진 토큰의 TokenAllowance가 mapping에 남아 되살아날 수 있음.

해결: `_permNonce[user][agent]`를 `grantPermission`마다 증가시키고, TokenAllowance에 nonce를 기록. `_deductTokenAllowance`에서 nonce 불일치 시 거부.

```solidity
mapping(address => mapping(address => uint256)) private _permNonce;

// grantPermission 내부:
_permNonce[msg.sender][agent]++;
uint256 currentNonce = _permNonce[msg.sender][agent];
for (uint256 i = 0; i < tokenCaps.length; i++) {
    _tokenAllowances[msg.sender][agent][tokenCaps[i].token] = TokenAllowance({
        cap: tokenCaps[i].cap,
        spent: 0,
        nonce: currentNonce
    });
}

// _deductTokenAllowance 내부:
require(ta.nonce == _permNonce[user][agent], "AgentVault: stale allowance");
```

이렇게 하면 이전 grant에서 설정한 토큰 B의 nonce가 현재 nonce와 달라 거부됨.

### Struct 정의

```solidity
struct ExecutionPermission {
    address[] allowedTargets;
    bytes4[] allowedFunctions;
    uint256 expiry;
    bool active;
}

struct TokenAllowance {
    uint256 cap;
    uint256 spent;
    uint256 nonce;    // grantPermission 시 증가, 이전 grant의 stale allowance 무효화
}

struct TokenCapInput {
    address token;
    uint256 cap;
}
```

## API/인터페이스 계약

### 변경 함수

#### grantPermission (시그니처 변경)
```solidity
function grantPermission(
    address agent,
    address[] calldata targets,
    bytes4[] calldata functions,
    uint256 expiry,
    TokenCapInput[] calldata tokenCaps  // 신규 파라미터
) external;
```

#### getPermission (시그니처 + 반환 변경)
```solidity
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

function getPermission(
    address user,
    address agent,
    address[] calldata tokens  // 신규 파라미터
) external view returns (PermissionView memory);
```

#### approveAndExecute (approveFromVault 대체)
```solidity
function approveAndExecute(
    address user,
    address token,
    uint256 amount,
    address target,        // allowedTargets에 포함 필수, approve의 spender이기도 함
    bytes calldata data    // selector가 allowedFunctions에 포함 필수
) external nonReentrant returns (bytes memory);
```

동작: 실행 권한 검증 → 토큰 allowance 차감 (nonce 검증 포함) → 유저 잔고 차감 → approve(target, amount) → target.call(data) → approve(target, 0) cleanup → emit

**설계 결정**: `spender`와 `target`을 동일하게 고정 (`spender` 파라미터 제거). 현재 in-scope capability (Liquity addColl, Morpho supply) 모두 spender == target. 별도 spender는 불필요한 attack surface.

**Exact-spend 전제**: 이 함수는 프로토콜이 지정된 `amount`를 정확히 소비한다고 가정 (pre-deduct 방식). Morpho supply와 Liquity addColl은 모두 exact-spend. Partial-spend 프로토콜 지원은 이번 phase 비범위.

#### transferFromVault (목적지 검증 추가)
```solidity
function transferFromVault(
    address user,
    address token,
    address to,      // allowedTargets 또는 user 자신만 허용
    uint256 amount
) external nonReentrant;
```

### 신규 함수

#### setTokenAllowances
```solidity
function setTokenAllowances(
    address agent,
    TokenCapInput[] calldata tokenCaps
) external;
```

#### getTokenAllowance
```solidity
function getTokenAllowance(
    address user,
    address agent,
    address token
) external view returns (uint256 cap, uint256 spent);
```

**Stale nonce 처리**: `getPermission`과 `getTokenAllowance`에서 `ta.nonce != _permNonce[user][agent]`이면 해당 토큰의 cap=0, spent=0을 반환. 이전 grant의 stale 데이터가 UI/런타임에 노출되지 않도록 정규화.

#### getPermNonce (신규)
```solidity
function getPermNonce(address user, address agent) external view returns (uint256);
```

### 유지 함수 (시그니처 변경 없음)
- `deposit(address token, uint256 amount)`
- `withdraw(address token, uint256 amount)`
- `executeOnBehalf(address user, address target, bytes calldata data)` — 내부에서 `_checkExecPermission` 헬퍼 사용
- `revokePermission(address agent)` — `_execPerms` 참조로 변경
- `getDelegatedUsers(address agent)` — `_execPerms` 참조로 변경
- `getBalance(address user, address token)`

### 이벤트 변경

```solidity
// 변경
event PermissionGranted(
    address indexed user, address indexed agent,
    address[] targets, bytes4[] functions,
    uint256 expiry, TokenCapInput[] tokenCaps
);

// 신규
event TokenAllowancesUpdated(address indexed user, address indexed agent, TokenCapInput[] tokenCaps);
event ApprovedAndExecuted(address indexed user, address indexed agent, address token, uint256 amount, address target, bytes4 selector);
event TransferredFromVault(address indexed user, address indexed agent, address token, address to, uint256 amount);

// 유지
event Deposited, Withdrawn, PermissionRevoked, ExecutedOnBehalf
```

## 보안 설계

### approveAndExecute — Pooled Custody 해결
1. approve와 실행이 **단일 트랜잭션에서 atomic**
2. 실행 직후 `forceApprove(target, 0)` cleanup — 잔여 allowance 없음
3. `spender == target` 고정 — 별도 spender 파라미터 없어 attack surface 최소화
4. 토큰별 cap 차감 + nonce 검증 — 토큰 종류/가치 혼동 없음, stale allowance 사용 불가
5. **Exact-spend 경로 제한**: pre-deduct 방식이므로 partial-spend 프로토콜에서는 과다 차감 가능. `approveAndExecute`는 agent-runtime capability에서만 호출 (preset 경로). 프론트엔드 custom permission 모드에서는 `executeOnBehalf`만 사용 (토큰 이동 없음). 따라서 approveAndExecute에 도달하는 모든 경로가 exact-spend 보장

### transferFromVault — 목적지 검증
1. `to`가 `allowedTargets` 또는 `user` 본인이어야 함
2. 에이전트가 임의 주소로 자금 전송 불가

### revokePermission — 즉시 차단
1. `active = false` 설정 시 모든 함수에서 거부
2. tokenAllowance는 명시적 삭제 불필요 (active=false면 `_deductTokenAllowance` 미도달)
3. 재grant 시 nonce가 증가하므로 이전 grant의 stale tokenAllowance는 nonce 불일치로 거부

## 전체 스택 영향도

| 계층 | 파일 | 변경 내용 |
|------|------|----------|
| **컨트랙트** | AgentVault.sol (x2) | struct 교체, mapping 교체, 함수 4개 변경 + 3개 신규 |
| **인터페이스** | IAgentVault.sol | 전면 교체 |
| **ABI** | core/abis/agent.ts | AgentVaultABI 전면 교체 |
| **ABI** | agent-runtime/abis.ts | AgentVaultABI 전면 교체 |
| **Runtime** | types.ts | PermissionState → ExecutionPermission + TokenAllowance |
| **Runtime** | observers/vault.ts | getPermission 호출 변경 (tokens 파라미터) |
| **Runtime** | capabilities/liquity-add-collateral.ts | approveFromVault → approveAndExecute (3calls → 1call) |
| **Runtime** | capabilities/morpho-supply.ts | approveFromVault → approveAndExecute (3calls → 1call) |
| **Server** | scheduler.service.ts | 변경 없음 |
| **Frontend** | types/index.ts | Permission 타입 교체 |
| **Frontend** | useVaultPermission.ts | grantPermission/getPermission 호출 변경 |
| **Frontend** | PermissionForm.tsx | 토큰별 cap 입력 UI 추가 |
| **Frontend** | PermissionList.tsx | 토큰별 cap/spent 표시 |
| **Frontend** | DelegationSetupWizard.tsx | grantPermission 호출부 tokenCaps 추가 |
| **Frontend** | DelegationStatus.tsx | Permission 타입 참조 변경 |
| **배포** | deploy-agent-vault-v2.ts → v3.ts | 검증 로직 업데이트 |
| **설정** | addresses.ts, config.ts | 새 주소 반영 |

## 마이그레이션 전략

테스트넷 전용, 하위 호환 불필요. 순서:

1. IAgentVault.sol + AgentVault.sol (x2) 수정 + `forge build --skip test`
2. 테스트넷 재배포 → 새 주소 발급
3. addresses.ts + config.ts 주소 업데이트
4. ABI 2곳 업데이트
5. agent-runtime types + observers + capabilities 수정
6. 프론트엔드 types + hooks + components 수정
7. RPC 검증

## 테스트 전략

forge-std 미설치로 Foundry unit test 불가. 대체:
1. **코드 리뷰**: 모든 require 조건, 상태 변경, 이벤트 emit 검증
2. **컴파일 검증**: `forge build --skip test` 통과
3. **RPC 검증**: 배포 후 view 함수 호출로 상태 확인
4. **TypeScript 타입 검증**: `tsc --noEmit` 통과
5. **Codex 코드 리뷰**: Step 5에서 전체 diff 검증

## 리스크/오픈 이슈

| 리스크 | 영향 | 대응 |
|--------|------|------|
| approveAndExecute에서 target.call 실패 시 | 전체 tx revert → approve cleanup 불필요 | Solidity revert는 모든 상태 변경을 되돌리므로 문제 없음 |
| Partial-spend 프로토콜에서 과다 차감 | pre-deduct 방식이라 실제 소비량 < amount면 과다 차감 | 현재 in-scope capability는 모두 exact-spend. partial-spend 지원 필요 시 별도 phase에서 post-call delta 방식 도입 |
| PermissionGranted 이벤트에 tokenCaps 배열 포함 | 프론트엔드 이벤트 파싱 복잡도 | ABI decode로 처리 가능 |
| getPermission의 tokens 파라미터를 프론트엔드가 관리해야 함 | 조회 누락 가능 | 프론트엔드에서 known tokens 상수로 관리 |
| Stale tokenAllowance (revoke 후 re-grant) | 이전 grant의 토큰 cap이 되살아남 | nonce 메커니즘으로 해결 — nonce 불일치 시 _deductTokenAllowance 거부 |
