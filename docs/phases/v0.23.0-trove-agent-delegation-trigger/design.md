# 설계 - v0.23.0

## 변경 규모
**규모**: 일반 기능
**근거**: 4개+ 컴포넌트/파일 수정 (borrow page, wizard, delegate page, runtime config), 신규 훅 추가, ABI 확장, 크로스 도메인 통합 (agent ↔ liquity)

---

## 문제 요약
Liquity Borrow 페이지의 "Your Troves"에서 Agent 위임 진입점이 없고, wCTC만 지원하며, 위임 해제가 불완전하다.

> 상세: [README.md](README.md) 참조

## 접근법

**하이브리드 방식**: Navigation(위임) + Inline(상태/해제)

1. Trove 카드에 "Agent 위임" 버튼 → 기존 delegate 페이지로 라우팅 (query param으로 troveId, branch, scenario 전달)
2. Trove 카드에 위임 상태 뱃지를 인라인 표시 (on-chain multicall 조회)
3. 위임된 Trove는 "해제" 버튼 → 인라인 확인 다이얼로그에서 완전한 undelegation 실행

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: Navigate only | 최소 변경, 위저드 완전 재사용 | 페이지 이동으로 컨텍스트 끊김, 해제도 별도 페이지 | ❌ |
| B: Inline dialog | 컨텍스트 유지, 최적 UX | 위저드 전체를 모달에 넣으면 복잡, 크로스 도메인 의존성 증가 | ❌ |
| C: Hybrid (A+B) | 위임은 기존 위저드 활용, 상태/해제는 인라인 | 약간의 크로스 도메인 의존 (허용 가능) | ✅ |

**선택 이유**: 위임 설정은 3-step 위저드(vault deposit → permission → protocol delegation)를 거쳐야 하므로 전체 페이지가 적합. 반면 상태 확인과 해제는 단일 트랜잭션이므로 인라인이 자연스럽다.

## 기술 결정

### 1. defaultAgentId
- `packages/core/src/config/addresses.ts`의 `ERC8004`에 `defaultAgentId: 1n` 추가
- IdentityRegistry NFT 토큰 ID (BigInt), 현재 등록된 이자율 조정 Agent
- web, runtime, server 모두 packages/core에서 import

### 2. removeInterestIndividualDelegate ABI
- `packages/core/src/abis/liquity.ts`의 `InterestDelegateABI`에 추가
- 시그니처: `removeInterestIndividualDelegate(uint256 _troveId)`
- 컨트랙트 소스 확인: `packages/liquity/contracts/src/BorrowerOperations.sol` + `packages/shared/src/abis/liquity.ts` (string 형태로 이미 존재)

### 3. useTroveDelegate 확장
- `removeInterestIndividualDelegate(troveId)` 함수 추가
- `fullUndelegate(troveId, receiver)` convenience 함수 추가 — `setRemoveManagerWithReceiver` + `removeInterestIndividualDelegate` 순차 호출

### 4. DelegationSetupWizard branch 지원
- `branch?: "wCTC" | "lstCTC"` prop 추가 (기본값 `"wCTC"`)
- `LIQUITY_PERMISSION.targets` → `LIQUITY.branches[branch].borrowerOperations`로 동적 변환
- `useTroveDelegate(branch)` 동적 호출
- lstCTC 선택 시 token cap도 lstCTC 토큰으로 변경

### 5. Delegate page query param 지원
- `/agent/delegate/[id]?scenario=liquity&troveId={id}&branch={branch}`
- searchParams에서 scenario, troveId, branch 읽어서 상태 초기화
- `useTroveDelegate(branch)` 동적 호출

### 6. Agent runtime lstCTC 확장 — Manifest 분리 + `liquityBranches` 마이그레이션
- **Config 마이그레이션**: 기존 `config.liquity` (단일 브랜치) → `config.liquityBranches: Record<"wCTC" | "lstCTC", LiquityBranchConfig>`로 변경. 기존 wCTC 값을 `liquityBranches.wCTC`로 이동, lstCTC 값 추가
- **Manifest 분리**: wCTC용 manifest + lstCTC용 manifest 등록. `manifest.scope.liquityBranch`로 브랜치 구분
- **capabilities**: `config.liquityBranches[manifest.scope.liquityBranch]`로 config 선택. capability 복제 없음
- **hints utility**: `branchIdx` 파라미터 추가 (0n=wCTC, 1n=lstCTC)
- **scheduler**: 양 브랜치 TroveManager 스캔. 사용자별로 매칭되는 manifest의 branch에 따라 적절한 troveId를 전달
- **snapshot**: `buildSnapshot`에서 manifest의 `liquityBranch`를 읽어 `liquityBranches[branch]` config로 on-chain 상태 조회
- **runAgent API**: 기존 `{ user, manifestId, troveId }` 그대로 유지. manifestId가 branch 정보를 내포하므로 추가 파라미터 불필요

---

## 범위 / 비범위

**범위(In Scope)**:
- FE: Trove 카드 위임 버튼/상태 뱃지/해제 버튼
- FE: DelegationSetupWizard branch 파라미터화
- FE: delegate page query param 지원
- Core: defaultAgentId 상수, removeInterestIndividualDelegate ABI
- Hooks: useTroveDelegationStatus (신규), useTroveDelegate 확장
- Runtime: lstCTC branch config + capability 파라미터화
- Server: scheduler 양 브랜치 스캔

**비범위(Out of Scope)**:
- Agent 선택 UI (기본 Agent 고정)
- Agent AI 전략 로직 변경
- Morpho 위임 트리거
- Options 모듈

## 아키텍처 개요

```
┌─ Borrow Page (/liquity/borrow) ─────────────────────┐
│  Your Troves                                         │
│  ┌─ Trove Card ──────────────────────────────────┐   │
│  │  Collateral | Debt | Rate | ICR                │   │
│  │  [Edit] [Close] [Delegate to Agent]            │   │
│  │  Badge: "Agent Delegated" / [Undelegate]       │   │
│  └────────────────────────────────────────────────┘   │
│         │ Delegate click           │ Undelegate click │
│         ▼                          ▼                  │
│  Navigate to:                 Confirm Dialog          │
│  /agent/delegate/{id}         → fullUndelegate()      │
│  ?scenario=liquity              setRemoveManager +    │
│  &troveId=X                     removeInterestDelegate│
│  &branch=wCTC|lstCTC                                  │
└──────────────────────────────────────────────────────┘
         │
         ▼
┌─ Delegate Page (/agent/delegate/[id]) ──────────────┐
│  Read query params → pre-fill scenario, troveId,     │
│  branch                                              │
│  DelegationSetupWizard(branch=wCTC|lstCTC, troveId)  │
│  Step 1: Vault Deposit                               │
│  Step 2: Permission (branch-aware BorrowerOps)       │
│  Step 3: Protocol Delegation (setAddManager +        │
│           setInterestIndividualDelegate)              │
└──────────────────────────────────────────────────────┘
```

```
┌─ Agent Runtime (lstCTC 확장) ───────────────────────┐
│  config.ts:                                          │
│    liquityBranches: {                                │
│      wCTC: { borrowerOps, troveManager, ... }        │
│      lstCTC: { borrowerOps, troveManager, ... }      │
│    }                                                 │
│                                                      │
│  manifest.scope.liquityBranch → config 선택          │
│  capabilities: config.liquityBranches[branch]        │
│  hints: branchIdx 파라미터 (0n | 1n)                 │
│  scheduler: 양 브랜치 TroveManager 스캔              │
└──────────────────────────────────────────────────────┘
```

## API/인터페이스 계약

### 명칭 통일: `branch`
- 모든 레이어에서 `branch: "wCTC" | "lstCTC"` (string literal) 사용
- `branchIndex` (0n, 1n)는 on-chain 호출 시에만 내부적으로 변환 (hints 등)
- 변환 함수: 기존 `BRANCH_INDEX` map 재사용 (`useTroveActions.ts`에 정의됨)

### Query Param 계약
```
/agent/delegate/{agentId}?scenario=liquity&troveId={bigint}&branch={wCTC|lstCTC}
```
- `scenario`: `"morpho" | "liquity"` (기존)
- `troveId`: bigint string (기존, optional → 자동 전달)
- `branch`: `"wCTC" | "lstCTC"` (신규, 기본값 `"wCTC"`)

### DelegationSetupWizard Props 계약
```typescript
interface DelegationSetupWizardProps {
  agentAddress: Address;
  agentVaultAddress: Address;
  scenario: "morpho" | "liquity";
  branch?: "wCTC" | "lstCTC";  // 신규, 기본값 "wCTC"
  troveId?: string;
  onTroveIdChange?: (troveId: string) => void;
  onComplete?: () => void;
}
```

### useTroveDelegationStatus 반환형
```typescript
{
  delegationMap: Map<string, {
    isAddManager: boolean;
    isInterestDelegate: boolean;
    isDelegated: boolean;
  }>;
  isLoading: boolean;
}
```

### Runtime Config Shape
```typescript
interface AgentConfig {
  // ... 기존 필드
  liquityBranches: {
    wCTC: LiquityBranchConfig;
    lstCTC: LiquityBranchConfig;
  };
}
// 기존 `liquity` 필드 → `liquityBranches.wCTC`로 마이그레이션
```

## 신규 훅: useTroveDelegationStatus

```typescript
// apps/web/src/domains/defi/liquity/hooks/useTroveDelegationStatus.ts
function useTroveDelegationStatus(
  branch: "wCTC" | "lstCTC",
  troveIds: bigint[]
): {
  delegationMap: Map<string, {
    isAddManager: boolean;
    isInterestDelegate: boolean;
    isDelegated: boolean; // both true
  }>;
  isLoading: boolean;
}
```

- `useReadContracts`로 multicall 배치 조회 (addManagerOf + getInterestIndividualDelegateOf)
- AgentVault 주소와 비교하여 위임 여부 판정
- refetchInterval: 30_000ms (위임 상태 변경은 드묾)

## 테스트 전략

- **수동 E2E**: Borrow 페이지에서 위임 버튼 클릭 → delegate 페이지 이동 → 위저드 완료 → Borrow 페이지 복귀 → 뱃지 확인 → 해제 → 뱃지 제거
- **on-chain 검증**: 위임/해제 후 `getAddManagerOf` + `getInterestIndividualDelegateOf` 조회하여 상태 정합성 확인
- **양 브랜치**: wCTC, lstCTC 각각 위임/해제 사이클 테스트
- **Runtime**: lstCTC capability 실행 시뮬레이션 (기존 setup-delegation.ts 패턴 확장)

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `packages/core/src/config/addresses.ts` | `ERC8004.defaultAgentId: 1n` 추가 |
| `packages/core/src/abis/liquity.ts` | `removeInterestIndividualDelegate` ABI 추가 |
| `apps/web/src/domains/defi/liquity/hooks/useTroveDelegationStatus.ts` | **신규** — 배치 위임 상태 조회 훅 |
| `apps/web/src/domains/defi/liquity/hooks/useTroveDelegate.ts` | `removeInterestIndividualDelegate`, `fullUndelegate` 추가 |
| `apps/web/src/app/(defi)/liquity/borrow/page.tsx` | 위임 버튼, 상태 뱃지, 해제 다이얼로그 |
| `apps/web/src/domains/agent/components/DelegationSetupWizard.tsx` | `branch` prop, 동적 BorrowerOps/token cap |
| `apps/web/src/app/(more)/agent/delegate/[id]/page.tsx` | query param 읽기, branch 전달 |
| `packages/agent-runtime/src/config.ts` | `liquity` → `liquityBranches` 마이그레이션 + lstCTC 추가 |
| `packages/agent-runtime/src/capabilities/liquity-*.ts` | branch 파라미터 |
| `packages/agent-runtime/src/utils/liquity-hints.ts` | `branchIdx` 파라미터 |
| `apps/agent-server/src/scheduler/scheduler.service.ts` | 양 브랜치 TroveManager 스캔 |

## 리스크/오픈 이슈
- `defaultAgentId = 1n` 값은 IdentityRegistry 배포 후 첫 등록 Agent 기준. 실제 값 확인 필요 (on-chain 조회 또는 배포 기록)
- lstCTC 브랜치에 실제 Trove가 존재해야 양 브랜치 E2E 테스트 가능. 없으면 시뮬레이션 스크립트로 생성 필요
