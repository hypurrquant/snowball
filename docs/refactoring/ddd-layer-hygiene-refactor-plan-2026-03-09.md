# DDD Layer Hygiene Refactoring Plan

> **Date**: 2026-03-09
> **Scope**: DDD 4-layer boundary enforcement + fat hook decomposition
> **Sprints**: 5 (each ~1-2 days)
> **Risk Level**: Medium (import path changes propagate widely, but no logic changes)

---

## Summary

현재 코드베이스에서 DDD 4계층(core -> shared -> domains -> app) 경계를 위반하는 코드와 비대화된 hook/page를 정리한다. 순수 로직을 hook에서 분리하여 테스트 용이성과 재사용성을 높이고, 매직 넘버를 상수로 추출하여 변경에 강한 구조를 만든다.

**핵심 원칙**:
- `packages/core` = web + server + scripts 공유 순수 유틸 (React-free)
- `apps/web/src/core` = web 전용 React-free 타입/헬퍼 (re-export + web-only)
- `apps/web/src/shared` = React hook / UI / provider 전용
- `apps/web/src/domains/*/lib` = 도메인별 순수 로직

---

## Sprint 1: Foundation Hygiene

**목표**: packages/core + apps/web/src/core + shared 레이어 경계 정리. 이후 Sprint의 기반이 되는 변경.

### 1-1. `sortTokens`, `parseTokenAmount` -> packages/core로 이동

**이유**: 도메인 무관 순수 유틸이며, server/scripts에서도 사용 가능.

| 작업 | 파일 |
|------|------|
| **생성** | `packages/core/src/utils.ts` |
| **수정** | `packages/core/src/index.ts` -- `export * from "./utils"` 추가 |
| **수정** | `apps/web/src/shared/lib/utils.ts` -- 두 함수 삭제, re-export 추가 |

```
// packages/core/src/utils.ts
export function sortTokens(...) { ... }
export function parseTokenAmount(...) { ... }
```

`apps/web/src/shared/lib/utils.ts`에서:
```ts
// re-export for backward compatibility
export { sortTokens, parseTokenAmount } from "@snowball/core";
```

**import 변경 대상** (0건 -- re-export로 기존 import 유지됨):
- 없음. re-export 패턴이므로 기존 `@/shared/lib/utils` import 모두 동작.

### 1-2. `TxStep` / `TxPhase` / `TxStepType` / `TxStepStatus` -> apps/web/src/core로 이동

**이유**: React-free 순수 타입이며 shared가 아닌 core 레벨. 여러 domain/page에서 참조.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/core/types/tx.ts` (현재 shared/types/tx.ts 내용 이동) |
| **수정** | `apps/web/src/shared/types/tx.ts` -- re-export로 변경 |

```ts
// apps/web/src/shared/types/tx.ts (backward compat)
export * from "@/core/types/tx";
```

**import 변경 대상** (0건 -- re-export):
- 기존 `@/shared/types/tx` import 모두 자동 동작.

### 1-3. `formatUsd` 중복 4곳 -> shared/lib/utils.ts 통합

**이유**: 동일 함수가 4곳에 중복 정의 (약간의 포매팅 차이 있음).

| 위치 | 현재 시그니처 | 차이점 |
|------|-------------|--------|
| `shared/lib/utils.ts` | `formatUSD(value, decimals=2)` | Intl.NumberFormat 사용 |
| `trade/hooks/useProtocolStats.ts` | `formatUsd(value)` | 수동 M/K 포매팅 |
| `trade/hooks/usePoolList.ts` | `formatUsd(value)` | 수동 M/K 포매팅 |
| `trade/components/LPPortfolioSummary.tsx` | `formatUsd(value)` | 수동 M/K 포매팅 |
| `trade/components/PositionCard.tsx` | `formatUsd(value)` | 수동 M/K 포매팅 |

**결정**: 두 가지 포매터가 필요 -- `formatUSD`(정확한 통화 표시)와 `formatUsdCompact`(M/K 축약). 둘 다 `shared/lib/utils.ts`에 둔다.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/shared/lib/utils.ts` -- `formatUsdCompact(value: number): string` 추가 |
| **수정** | `apps/web/src/domains/trade/hooks/useProtocolStats.ts` -- 로컬 `formatUsd` 삭제, import 추가 |
| **수정** | `apps/web/src/domains/trade/hooks/usePoolList.ts` -- 로컬 `formatUsd` 삭제, import 추가 |
| **수정** | `apps/web/src/domains/trade/components/LPPortfolioSummary.tsx` -- 로컬 `formatUsd` 삭제, import 추가 |
| **수정** | `apps/web/src/domains/trade/components/PositionCard.tsx` -- 로컬 `formatUsd` 삭제, import 추가 |

### 1-4. deep import `@snowball/core/src/...` 제거

**이유**: `@snowball/core` (index.ts)를 통한 정규 import를 사용해야 함. deep import는 빌드 불안정 유발.

| 파일 | 현재 import | 변경 후 |
|------|------------|--------|
| `domains/trade/hooks/useProtocolStats.ts` | `@snowball/core/src/volume/types` | `@snowball/core` (public export) |
| `domains/trade/hooks/usePoolList.ts` | `@snowball/core/src/volume/types` | `@snowball/core` (public export) |
| `domains/trade/hooks/useUserPositions.ts` | `@snowball/core/src/dex/calculators` | `@/core/dex/calculators` (이미 존재) |
| `domains/defi/liquity/hooks/useTroveDelegationStatus.ts` | `@snowball/core/src/config/addresses` | `@/core/config/addresses` (이미 존재) |

| 작업 | 파일 |
|------|------|
| **수정** | 위 4개 파일의 import 경로 변경 (별도 re-export 파일 불필요 — packages/core index.ts가 이미 volume types를 export) |

### 1-5. `needsApproval` 순수 판정 로직 추출

**이유**: `useTokenApproval.ts`의 `needsApproval` 계산은 순수 함수로 추출 가능. packages/core에서 server/scripts에서도 활용 가능.

| 작업 | 파일 |
|------|------|
| **수정** | `packages/core/src/utils.ts` -- `needsApproval(amount, allowance)` 함수 추가 |
| **수정** | `apps/web/src/shared/hooks/useTokenApproval.ts` -- 순수 함수 import하여 사용 |

```ts
// packages/core/src/utils.ts
export function needsApproval(amount: bigint | undefined, allowance: bigint | undefined): boolean {
  return !!amount && amount > 0n && allowance !== undefined && allowance < amount;
}
```

### 1-6. `TokenAmount.tsx` 사용 여부 확인 및 삭제

**이유**: 검색 결과 어디서도 import되지 않음 -- 미사용 컴포넌트.

| 작업 | 파일 |
|------|------|
| **삭제** | `apps/web/src/shared/components/common/TokenAmount.tsx` |

### Sprint 1 의존성 순서

```
1-1 (sortTokens/parseTokenAmount) -- 독립
1-2 (TxStep types) -- 독립
1-3 (formatUsd 통합) -- 독립
1-4 (deep import 제거) -- 독립
1-5 (needsApproval 추출) -- 1-1 이후 (같은 파일 수정)
1-6 (TokenAmount 삭제) -- 독립
```

모두 병렬 가능하나, 1-1과 1-5는 같은 파일(`packages/core/src/utils.ts`)을 수정하므로 순서대로.

### Sprint 1 리스크

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| re-export 체이닝으로 번들 사이즈 증가 | Low | tree-shaking으로 해결. Next.js는 기본 지원 |
| `formatUsdCompact` vs 기존 `formatUsd` 미묘한 차이 | Low | 각 호출 사이트에서 출력 비교 확인 |
| deep import 제거 시 volume/types re-export 누락 | Medium | re-export 파일 생성 후 빌드 확인 |

---

## Sprint 2: Bridge -- useBridgePipeline 분해

**목표**: 404줄짜리 useBridgePipeline.ts에서 session 관리, step 생성, phase 결정 로직을 순수 함수/모듈로 추출.

### 2-1. Session 관리 로직 추출 -> `bridge/lib/bridgeSession.ts`

**이유**: `BridgeSession` 타입, `saveSession`, `loadSession`, `clearSession`, `getSessionKey` 모두 React-free. localStorage 접근만 있으나 순수 로직으로 분리 가능.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/bridge/lib/bridgeSession.ts` |
| **수정** | `apps/web/src/domains/bridge/hooks/useBridgePipeline.ts` -- import로 대체 |

추출 대상 (약 50줄):
- `BridgeSession` interface
- `SESSION_KEY_PREFIX`, `getSessionKey()`
- `saveSession()`, `loadSession()`, `clearSession()`

### 2-2. Step/Phase 상수 및 팩토리 추출 -> `bridge/lib/bridgeSteps.ts`

**이유**: `createInitialSteps()`, `PHASE_STEP_MAP`, `BridgePhase` 타입, phase 순서 결정 로직은 순수.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/bridge/lib/bridgeSteps.ts` |
| **수정** | `apps/web/src/domains/bridge/hooks/useBridgePipeline.ts` -- import로 대체 |

추출 대상 (약 30줄):
- `BridgePhase` type
- `ATTEST_TIMEOUT_MS`, `ATTEST_POLL_MS` 상수
- `createInitialSteps()`
- `PHASE_STEP_MAP`

### 2-3. Phase 감지(detectPhase) 로직 추출

**이유**: `detectPhase` 내부의 "마지막 완료 step 찾기 -> 다음 phase 결정" 로직은 순수.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/domains/bridge/lib/bridgeSteps.ts` -- `resolveResumePhase(session)` 함수 추가 |
| **수정** | `apps/web/src/domains/bridge/hooks/useBridgePipeline.ts` -- 사용 |

```ts
// bridgeSteps.ts
export function resolveResumePhase(session: BridgeSession): {
  lastCompleted: number;
  nextPhase: BridgePhase;
  restoredSteps: ... ;
} { ... }
```

### Sprint 2 결과물

리팩토링 후 `useBridgePipeline.ts` 구조:
```
// ~250줄 (404 -> 250)
import { BridgeSession, saveSession, loadSession, clearSession } from "../lib/bridgeSession";
import { BridgePhase, createInitialSteps, PHASE_STEP_MAP, resolveResumePhase, ... } from "../lib/bridgeSteps";

export function useBridgePipeline() {
  // React state + effects only
  // 순수 로직은 모두 lib에서 import
}
```

### Sprint 2 의존성 순서

```
2-1 (session 추출) -> 2-3 (detectPhase, BridgeSession 타입 필요)
2-2 (steps 추출) -- 독립
```

### Sprint 2 리스크

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| Session migration 로직 이동 시 동작 변경 | Medium | 기존 localStorage 데이터로 수동 테스트 |
| BridgePhase 타입을 별도 파일로 빼면 순환 참조 가능 | Low | bridgeSteps.ts에 타입 정의, session에서 import |
| Polling useEffect의 closure가 추출된 함수 참조 | Low | useEffect 내부는 그대로 유지, 상수만 추출 |

---

## Sprint 3: Liquity + Borrow Page

**목표**: Liquity domain의 순수 로직 추출 + borrow page 748줄 슬리밍.

### 3-1. Liquity 상수 추출 -> `liquity/lib/constants.ts`

**이유**: `BRANCH_INDEX`, `ETH_GAS_COMPENSATION`, `MIN_DEBT` 등이 hook/page에 산재.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/liquity/lib/constants.ts` |
| **수정** | `apps/web/src/domains/defi/liquity/hooks/useTroveActions.ts` -- import로 대체 |
| **수정** | `apps/web/src/app/(defi)/liquity/borrow/page.tsx` -- import로 대체 |

```ts
// liquity/lib/constants.ts
export const BRANCH_INDEX: Record<string, bigint> = { wCTC: 0n, lstCTC: 1n };
export const ETH_GAS_COMPENSATION = 2n * 10n ** 17n; // 0.2 wCTC
export const MIN_DEBT = 10; // sbUSD
export const MIN_INTEREST_RATE = 5n * 10n ** 15n; // 0.5%
export const MAX_INTEREST_RATE = 15n * 10n ** 16n; // 15%
export const PERMISSION_EXPIRY_DAYS = 30;
```

### 3-2. Position preview 순수 계산 추출 -> `liquity/lib/liquityMath.ts` 확장

**이유**: `usePositionPreview`의 useMemo 내부 전체가 순수 계산. 기존 `liquityMath.ts`에 통합.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/domains/defi/liquity/lib/liquityMath.ts` -- `computePositionPreview()` 추가 |
| **수정** | `apps/web/src/domains/defi/liquity/hooks/usePositionPreview.ts` -- thin wrapper로 축소 |

```ts
// liquityMath.ts에 추가
export interface PositionPreviewInput {
  coll: bigint; debt: bigint; rate: bigint; price: bigint; mcr: bigint; ccr: bigint;
}
export interface PositionPreviewResult {
  cr: number; liquidationPrice: bigint; upfrontFee: bigint;
  annualCost: bigint; maxBorrow: bigint; isAboveMCR: boolean; isAboveCCR: boolean;
}
export function computePositionPreview(input: PositionPreviewInput): PositionPreviewResult { ... }
```

hook은:
```ts
export function usePositionPreview(params: PositionPreviewInput): PositionPreviewResult & { crColor: string } {
  return useMemo(() => {
    const result = computePositionPreview(params);
    const crColor = result.cr === 0 ? "text-text-tertiary" : result.cr >= 200 ? "text-success" : ...;
    return { ...result, crColor };
  }, [...]);
}
```

### 3-3. Market rate stats 순수 계산 추출 -> `liquity/lib/liquityMath.ts` 확장

**이유**: `useMarketRateStats`의 useMemo 내부는 정렬/평균/중앙값 순수 계산.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/domains/defi/liquity/lib/liquityMath.ts` -- `computeRateStats(rates: number[])` 추가 |
| **수정** | `apps/web/src/domains/defi/liquity/hooks/useMarketRateStats.ts` -- thin wrapper |

### 3-4. Borrow page 슬리밍 -- Delegation UI 컴포넌트 추출

**이유**: borrow/page.tsx 748줄 중 delegation 관련 UI가 ~200줄. 별도 컴포넌트로 추출.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/liquity/components/TroveDelegation.tsx` |
| **수정** | `apps/web/src/app/(defi)/liquity/borrow/page.tsx` -- `<TroveDelegation>` 사용 |

`TroveDelegation` 컴포넌트가 담당할 부분:
- Delegate/Undelegate Dialog UI (presentational)
- Props로 상태와 핸들러를 받음
- `useTroveDelegationStatus`, `useTroveDelegate`는 Liquity domain이므로 내부 호출 가능
- ⚠️ `useVaultPermission` (Agent domain)은 app layer(borrow/page.tsx)에서 호출하고 props로 전달 — cross-domain import 방지

### 3-5. Borrow page 슬리밍 -- Open Trove 로직 정리

**이유**: `handleOpenTrove` 내부의 tx step 구성/실행이 page 수준에서 직접 관리됨.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/liquity/hooks/useOpenTrovePipeline.ts` |
| **수정** | `apps/web/src/app/(defi)/liquity/borrow/page.tsx` -- hook 사용으로 교체 |

`useOpenTrovePipeline` 역할:
- txSteps, txPhase, showTxModal 상태 관리
- `handleOpenTrove()` 함수 캡슐화
- `useTxPipeline`과 유사한 패턴

### 3-6. Validation 로직 추출

**이유**: page 내부의 `errors`, `canOpen`, `getButtonText()` 로직은 순수 함수로 추출 가능.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/domains/defi/liquity/lib/liquityMath.ts` -- `validateOpenTrove()` 추가 |
| **수정** | `apps/web/src/app/(defi)/liquity/borrow/page.tsx` -- import 사용 |

### Sprint 3 결과물

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `borrow/page.tsx` | 748줄 | ~400줄 (delegation 200줄 + open pipeline 100줄 + validation 50줄 추출) |
| `useTroveActions.ts` | 196줄 | ~180줄 (상수만 이동) |
| `usePositionPreview.ts` | 75줄 | ~15줄 (thin wrapper) |
| `useMarketRateStats.ts` | 40줄 | ~15줄 (thin wrapper) |
| `liquityMath.ts` | 65줄 | ~180줄 (preview + stats + validation 추가) |

### Sprint 3 의존성 순서

```
3-1 (constants) -- 독립, 먼저 실행
3-2 (preview) -- 3-1 이후 (constants 참조)
3-3 (rate stats) -- 독립
3-4 (delegation 컴포넌트) -- 3-1 이후
3-5 (open pipeline hook) -- 3-1 이후
3-6 (validation) -- 3-2 이후 (preview 결과 타입 필요)
```

권장 순서: `3-1 -> 3-2 -> 3-3 -> 3-6 -> 3-4 -> 3-5`

### Sprint 3 리스크

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| `ETH_GAS_COMPENSATION` export 경로 변경으로 page 빌드 실패 | Medium | re-export 유지: `useTroveActions.ts`에서도 re-export |
| TroveDelegation 컴포넌트에 너무 많은 props 전달 | Low | 내부에서 hook 직접 호출하도록 설계 |
| `crColor` 같은 UI 전용 값을 lib에 넣으면 계층 위반 | Low | crColor는 hook에 남기고 순수 계산만 lib으로 |
| borrow page의 복잡한 상태 흐름이 분리 후 추적 어려움 | Medium | useOpenTrovePipeline이 모든 tx 상태를 캡슐화 |

---

## Sprint 4: Trade + Pool Add Page

**목표**: Trade domain의 순수 로직 추출, TokenSelector 이동, pool/add page 정리.

### 4-1. Tick bitmap/helper 순수 로직 추출 -> `trade/lib/tickUtils.ts`

**이유**: `usePoolTicks.ts`의 `computeWordPositions`, `extractInitializedTicks`, ABI 상수, `buildEmptyTicks`는 모두 React-free.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/trade/lib/tickUtils.ts` |
| **수정** | `apps/web/src/domains/trade/hooks/usePoolTicks.ts` -- import로 대체 |

추출 대상 (~80줄):
- `TICK_BITMAP_ABI`, `TICKS_ABI` (ABI 상수)
- `computeWordPositions()`
- `extractInitializedTicks()`
- `buildEmptyTicks()`
- `TICK_RANGE` 상수

### 4-2. Protocol stats fetcher/formatter 추출 -> `trade/lib/statsApi.ts`

**이유**: `useProtocolStats.ts`의 `fetchStats()`, `MOCK_DATA`, 타입 정의는 hook과 분리 가능.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/trade/lib/statsApi.ts` |
| **수정** | `apps/web/src/domains/trade/hooks/useProtocolStats.ts` -- thin wrapper |

추출 대상:
- `ProtocolStats` interface
- `MOCK_DATA` 상수
- `fetchStats()` 함수

### 4-3. Pool list 순수 로직 추출 -> `trade/lib/poolListMapper.ts`

**이유**: `usePoolList.ts`의 `getTokenIcon`, `apiToPoolListItem`, `formatPercent`, `MOCK_POOLS`는 순수.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/trade/lib/poolListMapper.ts` |
| **수정** | `apps/web/src/domains/trade/hooks/usePoolList.ts` -- import로 대체 |

### 4-4. TokenSelector 이동: shared -> trade

**이유**: `TokenSelector`는 현재 swap page에서만 사용. trade 도메인 전용 컴포넌트.

| 작업 | 파일 |
|------|------|
| **이동** | `shared/components/common/TokenSelector.tsx` -> `domains/trade/components/TokenSelector.tsx` |
| **수정** | `apps/web/src/app/(trade)/swap/page.tsx` -- import 경로 변경 |

**주의**: 향후 다른 도메인에서도 사용하게 되면 shared로 되돌릴 수 있음. 현재는 단일 사용처이므로 domain으로.

### 4-5. Trade 도메인 매직 넘버 상수화

**이유**: fee=3000, slippageBps=50, deadline 등이 코드에 하드코딩.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/trade/lib/constants.ts` |
| **수정** | 해당 hook/page에서 import |

```ts
// trade/lib/constants.ts
export const DEFAULT_FEE_TIER = 3000;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 1200; // 20 minutes
export const RANGE_PRESETS = [...]; // pool/add에서 이동
```

### 4-6. Pool Add page 슬리밍

**이유**: 247줄로 비교적 작지만, `RANGE_PRESETS`, `handleMint` 내의 approve+mint 시퀀스를 정리 가능.

| 작업 | 파일 |
|------|------|
| **수정** | `apps/web/src/app/(trade)/pool/add/page.tsx` -- RANGE_PRESETS를 constants에서 import, handleMint를 useAddLiquidityPipeline으로 교체 가능 (optional) |

이 페이지는 247줄로 크지 않으므로 상수 추출 정도로 충분. pipeline 패턴 적용은 optional.

### Sprint 4 의존성 순서

```
4-1 (tick utils) -- 독립
4-2 (stats api) -- 1-3 이후 (formatUsdCompact 사용)
4-3 (pool list mapper) -- 1-3 이후 (formatUsdCompact 사용)
4-4 (TokenSelector 이동) -- 독립
4-5 (constants) -- 독립
4-6 (page slimming) -- 4-5 이후
```

### Sprint 4 리스크

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| TokenSelector 이동 후 다른 도메인에서 필요할 때 | Low | 필요 시 shared로 복귀. 현재 1곳만 사용 |
| TICK_BITMAP_ABI를 lib으로 옮기면 hook에서 동적 contract 구성 복잡 | Low | ABI는 lib에, contract 구성은 hook에 유지 |
| MOCK_DATA 추출 시 SSR/CSR 차이 | Low | `typeof window` 체크는 hook에 유지 |

---

## Sprint 5: Morpho + Yield + Agent

**목표**: morphoMath 이동, Yield/Agent hook의 read-model 정리, Agent 상수 추출.

### 5-1. `morphoMath.ts` 이동: shared -> morpho/lib

**이유**: Morpho 도메인 전용 수학 함수. shared에 있을 이유 없음.

| 작업 | 파일 |
|------|------|
| **이동** | `shared/lib/morphoMath.ts` -> `domains/defi/morpho/lib/morphoMath.ts` |
| **생성** | `apps/web/src/shared/lib/morphoMath.ts` -- re-export (backward compat) |

**import 변경 대상** (re-export로 기존 동작 유지, 추후 직접 import으로 전환):
- `domains/defi/yield/hooks/useYieldVaultAPY.ts` -- `@/domains/defi/morpho/lib/morphoMath`
- `domains/defi/morpho/hooks/useMorphoMarkets.ts` -- `../lib/morphoMath`
- `domains/defi/morpho/hooks/useMorphoPosition.ts` -- `../lib/morphoMath`
- `app/(defi)/morpho/borrow/page.tsx` -- `@/domains/defi/morpho/lib/morphoMath`

### 5-2. Morpho 매직 넘버 상수화

**이유**: `ORACLE_SCALE`, fallback `util * 0.08`, `MarketTuple`, `ParamsTuple` 타입이 hook에 산재.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/morpho/lib/constants.ts` |
| **수정** | 관련 hook에서 import |

```ts
// morpho/lib/constants.ts
export const ORACLE_SCALE = 10n ** 36n;
export const FALLBACK_BORROW_APR_MULTIPLIER = 0.08;
export type MarketTuple = readonly [bigint, bigint, bigint, bigint, bigint, bigint];
export type ParamsTuple = readonly [Address, Address, Address, Address, bigint];
```

### 5-3. Yield hook tuple 매핑 추출

**이유**: `useYieldVaults.ts`의 `VaultData` 타입과 index 매핑 로직은 순수.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/yield/lib/vaultMapper.ts` |
| **생성** | `apps/web/src/domains/defi/yield/types.ts` -- `VaultData` 타입 이동 |
| **수정** | `apps/web/src/domains/defi/yield/hooks/useYieldVaults.ts` -- import로 대체 |

```ts
// yield/types.ts
export interface VaultData { ... }

// yield/lib/vaultMapper.ts
export function buildVaultReadPlan(vaults, address?) { ... } // contracts 배열 + indices 반환
export function mapVaultResults(vaults, data, indices): VaultData[] { ... }
```

### 5-4. Yield APY 계산 상수 추출

**이유**: `STRATEGY_FEE_MULTIPLIER` 상수, `morphoVaults` 필터링이 hook 내부에 있음.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/defi/yield/lib/constants.ts` |
| **수정** | `apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts` -- import |

```ts
// yield/lib/constants.ts
export const STRATEGY_FEE_MULTIPLIER = 0.955;
export const morphoVaults = YIELD.vaults.filter(...);
```

### 5-5. Agent 상수/타입 추출

**이유**: `KNOWN_TOKENS`, `GENERAL_TAG`, `PermissionEntry`, permission expiry 30 days 등이 hook에 산재.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/agent/lib/constants.ts` |
| **수정** | `apps/web/src/domains/agent/hooks/useVaultPermission.ts` -- import |
| **수정** | `apps/web/src/domains/agent/hooks/useAgentProfile.ts` -- import |

```ts
// agent/lib/constants.ts
export const KNOWN_TOKENS: Address[] = [TOKENS.wCTC, TOKENS.sbUSD, TOKENS.lstCTC, TOKENS.USDC];
export const GENERAL_TAG = "general";
export const PERMISSION_EXPIRY_SECONDS = 30 * 24 * 3600;
export const AGENT_RATE_BOUNDS = {
  minInterestRate: parseEther("0.005"),
  maxInterestRate: parseEther("0.15"),
};
```

### 5-6. Agent result mapper 추출

**이유**: `useAgentList`, `useMyAgents`에서 동일한 결과 매핑 패턴이 반복됨.

| 작업 | 파일 |
|------|------|
| **생성** | `apps/web/src/domains/agent/lib/agentMapper.ts` |
| **수정** | `useAgentList.ts`, `useMyAgents.ts` -- import로 중복 제거 |

```ts
// agent/lib/agentMapper.ts
export function mapAgentResults(data, ids): Array<AgentInfo & { id: bigint }> {
  return data?.map((d, i) => {
    if (d.status !== "success" || !d.result) return null;
    const info = d.result as unknown as AgentInfo;
    return { id: ids[i], ...info };
  }).filter(Boolean) ?? [];
}
```

### Sprint 5 의존성 순서

```
5-1 (morphoMath 이동) -- 독립, 먼저 실행
5-2 (morpho constants) -- 독립
5-3 (vault mapper) -- 독립
5-4 (yield constants) -- 독립
5-5 (agent constants) -- 독립
5-6 (agent mapper) -- 독립
```

모두 독립적. 5-1만 import 경로 영향이 넓으므로 먼저 실행 후 빌드 확인.

### Sprint 5 리스크

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| morphoMath 이동 후 yield 도메인에서 morpho/lib import = cross-domain 의존성 | Medium | 허용: yield는 morpho 수학 함수에 정당한 의존성 보유. 향후 필요시 packages/core로 승격 |
| VaultData 타입 이동 시 기존 import 깨짐 | Low | re-export 유지 |
| Agent mapper 통합 시 미묘한 타입 차이 | Low | 제네릭 파라미터로 id 소스 분리 |

---

## Risk Assessment Summary

### High-level Risks

| # | 리스크 | 영향 | 확률 | 완화 |
|---|--------|------|------|------|
| 1 | Import 경로 변경으로 빌드 실패 | High | High | 각 Sprint 후 `next build` 실행. re-export로 기존 경로 유지 |
| 2 | Re-export 체이닝 과도 | Medium | Medium | Sprint 완료 후 직접 import으로 점진 전환 |
| 3 | 런타임 동작 변경 | High | Low | 로직 변경 없이 파일 이동만 수행. 각 Sprint 후 수동 QA |
| 4 | Cross-domain 의존성 발생 | Medium | Medium | yield -> morpho/lib은 허용. 다른 cross-domain은 packages/core로 승격 |

### Rollback Strategy

모든 Sprint은 독립적 Git branch에서 작업:
- `refactor/sprint-1-foundation`
- `refactor/sprint-2-bridge`
- `refactor/sprint-3-liquity`
- `refactor/sprint-4-trade`
- `refactor/sprint-5-morpho-yield-agent`

각 Sprint 완료 후 main에 merge. 문제 발생 시 해당 branch만 revert.

---

## Testing Strategy

### 각 Sprint 공통

1. **빌드 검증**: `cd apps/web && npx next build` -- 타입 에러/import 누락 확인
2. **런타임 검증**: 각 도메인 페이지 수동 접속하여 정상 렌더링 확인
3. **기능 검증**: 변경된 도메인의 핵심 시나리오 1회 수행
   - Sprint 1: swap page 로드, borrow page 로드
   - Sprint 2: bridge page 접속, session 복구 동작
   - Sprint 3: borrow page에서 trove open/close, delegation
   - Sprint 4: pool page 로드, add liquidity, swap token selector
   - Sprint 5: morpho supply/borrow page, yield page, agent marketplace

### 추후 자동화 (optional)

- `liquityMath.ts`에 추가된 순수 함수에 단위 테스트 추가
- `morphoMath.ts`에 기존 `packages/core`와 동일한 패턴으로 `.test.ts` 추가

---

## Success Metrics

| 지표 | 목표 |
|------|------|
| shared/lib에서 도메인 전용 모듈 제거 | morphoMath.ts 이동 완료 |
| shared/components에서 도메인 전용 컴포넌트 제거 | TokenSelector 이동, TokenAmount 삭제 |
| core 타입이 core 레이어에 위치 | TxStep 등 core/types에 배치 |
| formatUsd 중복 제거 | 1곳에서만 정의 |
| deep import 제거 | `@snowball/core/src/` 직접 import 0건 (apps/web/src/core re-export 제외) |
| borrow page 줄 수 | 748 -> ~400줄 (-47%) |
| useBridgePipeline 줄 수 | 404 -> ~250줄 (-38%) |
| 매직 넘버 제거 | 각 도메인에 constants.ts 생성 |
| 모든 도메인에 lib/ 디렉토리 존재 | 6/6 도메인 |

---

## File Creation/Modification Summary

### New Files (16)

| Sprint | 파일 | 목적 |
|--------|------|------|
| 1 | `packages/core/src/utils.ts` | sortTokens, parseTokenAmount, needsApproval |
| 1 | `apps/web/src/core/types/tx.ts` | TxStep/TxPhase 타입 |
| 2 | `domains/bridge/lib/bridgeSession.ts` | session 관리 |
| 2 | `domains/bridge/lib/bridgeSteps.ts` | step/phase 로직 |
| 3 | `domains/defi/liquity/lib/constants.ts` | Liquity 상수 |
| 3 | `domains/defi/liquity/components/TroveDelegation.tsx` | Delegation UI |
| 3 | `domains/defi/liquity/hooks/useOpenTrovePipeline.ts` | Open Trove 파이프라인 |
| 4 | `domains/trade/lib/tickUtils.ts` | Tick bitmap helpers |
| 4 | `domains/trade/lib/statsApi.ts` | Protocol stats API |
| 4 | `domains/trade/lib/poolListMapper.ts` | Pool list mapping |
| 4 | `domains/trade/lib/constants.ts` | Trade 상수 |
| 5 | `domains/defi/morpho/lib/constants.ts` | Morpho 상수 |
| 5 | `domains/defi/yield/lib/vaultMapper.ts` | Vault data mapping |
| 5 | `domains/defi/yield/lib/constants.ts` | Yield 상수 |
| 5 | `domains/defi/yield/types.ts` | VaultData 타입 |
| 5 | `domains/agent/lib/constants.ts` | Agent 상수 |

### Modified Files (27)

| Sprint | 파일 | 변경 내용 |
|--------|------|----------|
| 1 | `packages/core/src/index.ts` | utils export 추가 |
| 1 | `shared/lib/utils.ts` | 함수 이동 + formatUsdCompact 추가 |
| 1 | `shared/types/tx.ts` | re-export로 변경 |
| 1 | `shared/hooks/useTokenApproval.ts` | needsApproval import |
| 1 | `trade/hooks/useProtocolStats.ts` | formatUsd 삭제 + deep import 수정 |
| 1 | `trade/hooks/usePoolList.ts` | formatUsd 삭제 + deep import 수정 |
| 1 | `trade/components/LPPortfolioSummary.tsx` | formatUsd import 변경 |
| 1 | `trade/components/PositionCard.tsx` | formatUsd import 변경 |
| 1 | `trade/hooks/useUserPositions.ts` | deep import 수정 |
| 1 | `defi/liquity/hooks/useTroveDelegationStatus.ts` | deep import 수정 |
| 2 | `bridge/hooks/useBridgePipeline.ts` | session/steps lib import |
| 3 | `defi/liquity/hooks/useTroveActions.ts` | constants import |
| 3 | `defi/liquity/lib/liquityMath.ts` | preview/stats/validation 추가 |
| 3 | `defi/liquity/hooks/usePositionPreview.ts` | thin wrapper |
| 3 | `defi/liquity/hooks/useMarketRateStats.ts` | thin wrapper |
| 3 | `app/(defi)/liquity/borrow/page.tsx` | delegation/pipeline 추출 |
| 4 | `trade/hooks/usePoolTicks.ts` | lib import |
| 4 | `trade/components/TokenSelector.tsx` | 이동 (경로 변경) |
| 4 | `app/(trade)/swap/page.tsx` | TokenSelector import 경로 |
| 4 | `app/(trade)/pool/add/page.tsx` | constants import |
| 5 | `shared/lib/morphoMath.ts` | re-export로 변경 |
| 5 | `defi/morpho/hooks/useMorphoMarkets.ts` | constants + morphoMath import |
| 5 | `defi/morpho/hooks/useMorphoPosition.ts` | constants + morphoMath import |
| 5 | `defi/yield/hooks/useYieldVaults.ts` | vaultMapper import |
| 5 | `defi/yield/hooks/useYieldVaultAPY.ts` | constants import |
| 5 | `agent/hooks/useVaultPermission.ts` | constants import |
| 5 | `agent/hooks/useAgentProfile.ts` | constants import |
| 5 | `agent/hooks/useAgentList.ts` + `useMyAgents.ts` | agentMapper import |

### Deleted Files (1)

| Sprint | 파일 | 이유 |
|--------|------|------|
| 1 | `shared/components/common/TokenAmount.tsx` | 미사용 |
