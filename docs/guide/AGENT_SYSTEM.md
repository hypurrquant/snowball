# Agent (ERC-8004) 시스템 구현 가이드

> Version: v0.10.0 | Status: MVP/Testnet
> 작성일: 2026-03-06

---

## 1. 개요

Snowball의 Agent 시스템은 **ERC-8004** 표준을 기반으로 온체인 AI 에이전트의 신원, 평판, 검증, 자산 위임을 관리한다.

4개 컨트랙트로 구성:

| 컨트랙트 | 패키지 | 역할 |
|----------|--------|------|
| IdentityRegistry | `packages/erc-8004/` | 에이전트 등록 (ERC-721 NFT) |
| ReputationRegistry | `packages/erc-8004/` | 평판/리뷰 관리 |
| ValidationRegistry | `packages/erc-8004/` | 제3자 검증/인증 |
| AgentVault | `packages/liquity/contracts/custom/` | 자산 예치 + 위임 실행 |

---

## 2. 컨트랙트별 상세

### 2.1 IdentityRegistry

**소스**: `packages/erc-8004/contracts/IdentityRegistry.sol`

ERC-721 기반. 에이전트 등록 시 NFT를 발행하고 온체인 메타데이터를 저장한다.

```
registerAgent(name, agentType, endpoint, tokenURI) → agentId (uint256)
```

- `endpoint`: 에이전트 봇의 EOA 지갑 주소 (API URL이 아님)
- `tokenURI`: NFT 메타데이터 URI (IPFS 등)
- `agentId`: 1부터 순차 증가
- `ownerAgents[owner]`: 소유자별 에이전트 ID 배열

**주요 함수**:
- `getAgentInfo(agentId)` → AgentInfo (name, agentType, endpoint, registeredAt, isActive)
- `getOwnerAgents(owner)` → uint256[]
- `totalAgents()` → 전체 에이전트 수
- `activateAgent(agentId)` / `deactivateAgent(agentId)` — 소유자만 호출 가능

### 2.2 ReputationRegistry

**소스**: `packages/erc-8004/contracts/ReputationRegistry.sol`

에이전트별 평판 점수와 리뷰를 관리한다. 태그(tag) 기반으로 카테고리별 평판을 분리 추적한다.

```
submitReview(agentId, score, comment, tag)
```

- `score`: 100~500 (1.00~5.00을 100배 스케일링)
- 리뷰 제출 시 running average로 reputationScore 자동 갱신
- `recordInteraction(agentId, tag, success)` — onlyOwner, 성공률 추적용

**주요 함수**:
- `getReputation(agentId, tag)` → ReputationData (totalInteractions, successfulInteractions, reputationScore, decimals)
- `getSuccessRate(agentId, tag)` → uint256 (10000 = 100%)
- `getReviews(agentId)` → Review[]

### 2.3 ValidationRegistry

**소스**: `packages/erc-8004/contracts/ValidationRegistry.sol`

권한이 있는 validator가 에이전트를 검증/인증한다. 5가지 상태: Unvalidated, Pending, Validated, Suspended, Revoked.

```
validateAgent(agentId, validityPeriod, certificationURI) — onlyValidator
```

- 배포자(owner)가 기본 validator로 등록됨
- `addValidator` / `removeValidator` — onlyOwner

**주요 함수**:
- `isValidated(agentId)` → bool (Validated 상태 + 만료 전)
- `getValidation(agentId)` → Validation (status, validator, validatedAt, expiresAt, certificationURI)

### 2.4 AgentVault

**소스**: `packages/liquity/contracts/custom/AgentVault.sol`
**인터페이스**: `packages/liquity/contracts/interfaces/IAgentVault.sol`

사용자가 ERC-20 토큰을 예치하고, 에이전트에게 제한된 범위의 실행 권한을 부여하는 위임 볼트.

#### 위임 프로세스

```
1. 사용자: ERC20.approve(AgentVault, amount)
2. 사용자: AgentVault.deposit(token, amount)
   → vault가 transferFrom으로 토큰을 가져와 per-user 잔고에 기록

3. 사용자: AgentVault.grantPermission(agent, targets, functions, cap, expiry)
   → 에이전트 EOA에 대해 허용 컨트랙트/함수/한도/만기 설정

4. 에이전트 봇: AgentVault.executeOnBehalf(user, target, data)
   → 화이트리스트 검증 후 target.call(data) 실행

   또는

5. 에이전트 봇: AgentVault.transferFromVault(user, token, to, amount)
   → cap 검증 후 vault 잔고에서 토큰 이체
```

#### Permission 구조체

```solidity
struct Permission {
    address[] allowedTargets;    // 허용된 컨트랙트 주소 목록
    bytes4[]  allowedFunctions;  // 허용된 함수 셀렉터 목록
    uint256   spendingCap;       // 최대 지출 한도 (raw amount)
    uint256   spent;             // 누적 지출량
    uint256   expiry;            // 만료 시각 (0 = 무제한)
    bool      active;            // 활성 상태
}
```

#### 실행 경로 2가지

| 함수 | 용도 | cap 체크 | 자금 이동 |
|------|------|----------|----------|
| `executeOnBehalf` | 범용 컨트랙트 호출 | X | X (call만 실행) |
| `transferFromVault` / `approveFromVault` | vault 자금 사용 | O | O |

---

## 3. 프론트엔드 구현

### 3.1 디렉토리 구조

```
apps/web/src/domains/agent/
├── types/index.ts           # AgentInfo, Review, ReputationData, Validation, Permission
├── hooks/
│   ├── useAgentList.ts      # READ: 전체 에이전트 목록
│   ├── useMyAgents.ts       # READ: 내 에이전트 목록
│   ├── useAgentProfile.ts   # READ: 에이전트 상세 (7-call multicall)
│   ├── useVaultBalance.ts   # READ: 4토큰 vault 잔고
│   ├── useRegisterAgent.ts  # WRITE: 에이전트 등록
│   ├── useAgentActions.ts   # WRITE: activate/deactivate
│   ├── useSubmitReview.ts   # WRITE: 리뷰 제출
│   ├── useVaultActions.ts   # WRITE: deposit/withdraw
│   └── useVaultPermission.ts # READ+WRITE: 권한 조회/부여/취소
└── components/
    ├── AgentCard.tsx            # 에이전트 카드 (목록용)
    ├── AgentProfileHeader.tsx   # 프로필 헤더 (이름, 상태, 검증 뱃지)
    ├── ReputationSection.tsx    # 평판 섹션 (별점, 리뷰 목록)
    ├── ReviewForm.tsx           # 리뷰 작성 폼
    ├── PermissionForm.tsx       # 권한 부여 폼 (프리셋 + 커스텀)
    ├── PermissionList.tsx       # 부여된 권한 목록 + 취소
    └── VaultDepositDialog.tsx   # 예치/출금 다이얼로그
```

### 3.2 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/agent` | 마켓플레이스 | 전체 에이전트 탐색 + 내 에이전트 |
| `/agent/[id]` | 프로필 상세 | 정보, 평판, 권한 부여, 리뷰 |
| `/agent/register` | 등록 | 이름/타입/엔드포인트/URI 입력 |
| `/agent/vault` | 볼트 관리 | 잔고 조회, 예치/출금, 권한 목록 |

### 3.3 주요 구현 패턴

**에이전트 목록 조회** (`useAgentList`):
- `totalAgents()`로 전체 수 확인 → 1..N 순회하며 `getAgentInfo` 배치 호출
- 테스트넷 규모에서만 유효한 방식 (프로덕션은 인덱서/서브그래프 필요)

**권한 목록 조회** (`useVaultPermission`):
- AgentVault에 enumeration 함수가 없음
- `PermissionGranted` 이벤트 로그를 스캔하여 agent 주소를 수집
- 각 agent에 대해 `getPermission` 호출로 현재 상태 확인
- `fetchVersion` 카운터 패턴으로 grant/revoke 후 refetch

**등록 후 agentId 획득** (`useRegisterAgent`):
- `writeContractAsync` → `waitForTransactionReceipt` → `decodeEventLog`로 `AgentRegistered` 이벤트에서 agentId 추출

---

## 4. 알려진 한계점

### 4.1 CRITICAL — `spendingCap` cross-token raw accumulator

**위치**: `AgentVault.sol:61-68`, `approveFromVault:131`, `transferFromVault:153`

Permission당 `spendingCap`과 `spent`가 단일 uint256이다. 토큰 종류와 무관하게 `spent += amount`로 raw 값을 누적한다.

**문제**: 100 USDC(6 decimals) + 1 wETH(18 decimals) 사용 시 `spent = 100 + 1e18`. 서로 다른 단위가 섞여 cap이 의미를 잃는다.

**NatSpec 주석**: `"Max collateral (wei)"` — 단일 토큰(네이티브 담보) mental model로 작성됨. 실제 deposit/withdraw는 아무 ERC20 토큰을 받으므로 설계 불일치.

**영향**: 단일 토큰(예: wCTC만)으로 운영하면 문제없으나, 복수 토큰 사용 시 cap이 사실상 무의미해짐.

### 4.2 CRITICAL — `approveFromVault` pooled custody 위험

**위치**: `AgentVault.sol:119-135`

```solidity
IERC20(token).forceApprove(spender, amount);
```

AgentVault 컨트랙트 주소에서 spender에게 approve를 준다. 그런데 vault는 모든 사용자의 자금을 공유 보관하므로, approve된 spender가 다른 사용자의 자금까지 접근할 수 있는 경로가 열린다.

또한 `revokePermission`을 호출해도 이미 발행된 ERC20 allowance는 취소되지 않는다.

**수정 계획**: `docs/security/CONTRACT_FIX_PLAN.md`에서 `approveFromVault` 제거 → `spendFromVault`(직접 transfer)로 교체 예정.

### 4.3 HIGH — `executeOnBehalf`의 cap 미체크

**위치**: `AgentVault.sol:87-113`

`executeOnBehalf`는 target/function 화이트리스트만 검증하고, `spendingCap`은 체크하지 않는다. vault가 토큰 holder이므로, 화이트리스트된 함수가 vault의 기존 allowance를 활용하면 `spent` 누적 없이 자금 이동이 가능하다.

### 4.4 HIGH — Permission이 Cartesian product

**위치**: `AgentVault.sol:61, 100-105`

`allowedTargets`와 `allowedFunctions`가 독립 배열로 저장된다. 검증 시 target과 function을 각각 체크하므로, 결과적으로 **모든 target × 모든 function** 조합이 허용된다.

예: targets=[BorrowerOps, StabilityPool], functions=[adjustRate, deposit] → BorrowerOps.deposit()도 허용됨 (의도하지 않은 조합).

**프로덕션 개선**: `mapping(address => bytes4[])` 형태로 target별 허용 함수를 분리해야 함.

### 4.5 HIGH — `transferFromVault`에 목적지 검증 없음

**위치**: `AgentVault.sol:139-156`

`to` 주소가 `allowedTargets`에 포함되는지 검증하지 않는다. 에이전트가 사용자 자금을 임의의 주소로 전송 가능.

**수정 계획**: `CONTRACT_FIX_PLAN.md` AV-02에서 `_containsAddress(perm.allowedTargets, to)` 추가 예정.

### 4.6 MEDIUM — ERC-8004 레지스트리와 AgentVault 미연동

AgentVault의 `grantPermission`은 raw address만 받는다. IdentityRegistry의 NFT 소유 여부, 활성 상태, ValidationRegistry의 검증 상태를 전혀 확인하지 않는다.

즉, 등록되지 않은 임의 EOA에도 vault 권한을 부여할 수 있다.

### 4.7 MEDIUM — `ownerAgents` 배열이 NFT 전송 시 stale

**위치**: `IdentityRegistry.sol:20, 48`

`registerAgent` 시 `ownerAgents[msg.sender].push(agentId)` 로 기록하지만, ERC-721 `transferFrom`으로 NFT 소유권이 이전되어도 이 배열은 갱신되지 않는다.

`getOwnerAgents()`가 실제 소유 상태와 불일치할 수 있다.

### 4.8 MEDIUM — Permission enumeration 없음

AgentVault에 "이 사용자가 부여한 모든 권한" 을 조회하는 함수가 없다. 프론트엔드에서 `PermissionGranted` 이벤트 로그를 스캔해야 하므로 조회 비용이 높고, 이벤트가 없는 경우 발견 불가.

### 4.9 LOW — 선형 탐색 가스 비용

**위치**: `AgentVault.sol:170-182`

`_containsAddress`와 `_containsSelector`가 unbounded linear scan이다. 테스트넷 규모에서는 문제없으나, allowedTargets/allowedFunctions 배열이 커지면 가스 비용이 선형 증가.

**수정 계획**: `CONTRACT_FIX_PLAN.md` AV-04에서 MAX_TARGETS=10, MAX_FUNCTIONS=20 제한 예정.

### 4.10 LOW — ReputationRegistry 단순화

- `getSummary`의 `_clients` 파라미터가 미사용 (`"unused in simplified version"` 주석)
- `identityRegistry` 주소를 저장하지만 실제로 참조하지 않음 (agentId 존재 검증 없이 리뷰 가능)

---

## 5. 프론트엔드 제약사항

| 항목 | 현재 | 프로덕션 필요 |
|------|------|-------------|
| 에이전트 목록 조회 | totalAgents() 후 1..N 순회 | 서브그래프 또는 인덱서 |
| 권한 목록 조회 | 이벤트 로그 스캔 (fromBlock: 0) | 인덱서 또는 컨트랙트 enumeration |
| 데모 데이터 | NEXT_PUBLIC_TEST_MODE=true 시 fixture | 실제 온체인 데이터 |
| cap 표시 | `formatEther(spendingCap)` 단일 단위 | 토큰별 cap UI 필요 |
| 에이전트 봇 실행 | 프론트엔드만 구현 (봇 미구현) | 오프체인 봇 서비스 필요 |

---

## 6. 보안 수정 계획 요약

`docs/security/CONTRACT_FIX_PLAN.md`에 정의된 AgentVault 관련 수정사항:

| ID | 심각도 | 내용 | 상태 |
|----|--------|------|------|
| AV-01 | CRITICAL | `approveFromVault` 제거 → `spendFromVault` 교체 | 보류 (미사용) |
| AV-02 | HIGH | `transferFromVault`에 `to` 주소 allowedTargets 검증 | 보류 |
| AV-03 | MEDIUM | `grantPermission`/`revokePermission`에 nonReentrant 추가 | 보류 |
| AV-04 | MEDIUM | allowedTargets/allowedFunctions 배열 크기 상한 | 보류 |

모두 "AgentVault 재활성화 시 필수 적용" 조건부 보류 상태.

---

## 7. 참조 파일

| 파일 | 설명 |
|------|------|
| `packages/liquity/contracts/custom/AgentVault.sol` | AgentVault 구현 |
| `packages/liquity/contracts/interfaces/IAgentVault.sol` | AgentVault 인터페이스 |
| `packages/erc-8004/contracts/IdentityRegistry.sol` | 에이전트 신원 레지스트리 |
| `packages/erc-8004/contracts/ReputationRegistry.sol` | 평판 레지스트리 |
| `packages/erc-8004/contracts/ValidationRegistry.sol` | 검증 레지스트리 |
| `apps/web/src/core/abis/agent.ts` | 프론트엔드 ABI 정의 |
| `apps/web/src/core/config/addresses.ts` | 배포 주소 (ERC8004 섹션) |
| `apps/web/src/domains/agent/` | 프론트엔드 도메인 코드 |
| `docs/security/CONTRACT_FIX_PLAN.md` | 보안 수정 계획 |
| `docs/archive/v0.10.0-agent-erc8004/README.md` | v0.10.0 Phase PRD |
