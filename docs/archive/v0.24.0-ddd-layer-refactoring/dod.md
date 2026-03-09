# DoD (Definition of Done) - v0.24.0 DDD Layer Refactoring

## 기능 완료 조건

### Goal 1: Hook Slimming

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `bridge/lib/bridgeSession.ts`에 `saveSession`, `loadSession`, `clearSession` 함수가 export됨. `bridge/lib/bridgeSteps.ts`에 `createInitialSteps`, `resolveResumePhase`, `PHASE_STEP_MAP` 이 export됨 | `grep "saveSession\|loadSession\|clearSession" apps/web/src/domains/bridge/lib/bridgeSession.ts` — 3건, `grep "createInitialSteps\|resolveResumePhase\|PHASE_STEP_MAP" apps/web/src/domains/bridge/lib/bridgeSteps.ts` — 3건 |
| F2 | `liquity/lib/liquityMath.ts`에 `computePositionPreview` 함수가 export됨 | `grep "export function computePositionPreview" apps/web/src/domains/defi/liquity/lib/liquityMath.ts` — 1건 |
| F3 | `liquity/lib/liquityMath.ts`에 `computeRateStats` 함수가 export됨 | `grep "export function computeRateStats" apps/web/src/domains/defi/liquity/lib/liquityMath.ts` — 1건 |
| F4 | `trade/lib/tickUtils.ts`에 `computeWordPositions`, `extractInitializedTicks`, `buildEmptyTicks` 함수가 export됨 | `grep "computeWordPositions\|extractInitializedTicks\|buildEmptyTicks" apps/web/src/domains/trade/lib/tickUtils.ts` — 3건 |
| F5 | `trade/lib/statsApi.ts`에 `fetchStats` 함수와 `ProtocolStats` 타입이 export됨 | `grep "fetchStats\|ProtocolStats" apps/web/src/domains/trade/lib/statsApi.ts` — 2건 |
| F6 | `morpho/lib/morphoMath.ts`가 `domains/defi/morpho/lib/`에 존재하고, 기존 7개 함수(`toAssetsDown`, `toSharesDown`, `borrowRateToAPR`, `utilization`, `supplyAPY`, `calculateHealthFactor`, `calculateLiquidationPrice`)를 모두 포함 | `grep "toAssetsDown\|toSharesDown\|borrowRateToAPR\|utilization\|supplyAPY\|calculateHealthFactor\|calculateLiquidationPrice" apps/web/src/domains/defi/morpho/lib/morphoMath.ts` — 7건 |
| F7 | `yield/lib/vaultMapper.ts`에 `buildVaultReadPlan`, `mapVaultResults` 함수가 export됨 | `grep "export function buildVaultReadPlan\|export function mapVaultResults" apps/web/src/domains/defi/yield/lib/vaultMapper.ts` — 2건 |
| F8 | `agent/lib/agentMapper.ts`에 `mapAgentResults` 함수가 export됨 (`useAgentList`/`useMyAgents` 공통 매핑) | `grep "export function mapAgentResults" apps/web/src/domains/agent/lib/agentMapper.ts` — 1건 |
| F9 | 추출 대상 hook 8개 모두 추출된 lib 함수를 import하여 사용 | `grep -l "from.*lib/" apps/web/src/domains/bridge/hooks/useBridgePipeline.ts apps/web/src/domains/defi/liquity/hooks/usePositionPreview.ts apps/web/src/domains/defi/liquity/hooks/useMarketRateStats.ts apps/web/src/domains/trade/hooks/usePoolTicks.ts apps/web/src/domains/trade/hooks/useProtocolStats.ts apps/web/src/domains/defi/yield/hooks/useYieldVaults.ts apps/web/src/domains/agent/hooks/useAgentList.ts apps/web/src/domains/agent/hooks/useMyAgents.ts` — 8개 파일 모두 매칭 |

### Goal 2: Layer Hygiene

| # | 조건 | 검증 방법 |
|---|------|----------|
| F10 | `sortTokens` 함수가 `packages/core/src/` 내 소스 파일에 `export function sortTokens`로 정의됨 | `grep -r "export function sortTokens" packages/core/src/` — 1건 |
| F11 | `parseTokenAmount` 함수가 `packages/core/src/` 내 소스 파일에 `export function parseTokenAmount`로 정의됨 | `grep -r "export function parseTokenAmount" packages/core/src/` — 1건 |
| F12 | `needsApproval` 순수 함수가 `packages/core/src/` 내 소스 파일에 `export function needsApproval`로 정의됨 | `grep -r "export function needsApproval" packages/core/src/` — 1건 |
| F13 | `TxStep`, `TxPhase`, `TxStepType`, `TxStepStatus` 타입이 `apps/web/src/core/types/tx.ts`에 존재 | `grep -c "TxStep\|TxPhase\|TxStepType\|TxStepStatus" apps/web/src/core/types/tx.ts` — 4건 이상 |
| F14 | `shared/types/tx.ts`는 `core/types/tx.ts`를 re-export | `grep "export.*from.*core/types/tx" apps/web/src/shared/types/tx.ts` — 1건 |
| F15 | `shared/lib/morphoMath.ts`가 `domains/defi/morpho/lib/morphoMath.ts`를 re-export | `grep "export.*from.*morpho/lib/morphoMath\|export.*from.*domains" apps/web/src/shared/lib/morphoMath.ts` — 1건 |
| F16 | `TokenSelector.tsx`가 `domains/trade/components/`에 존재 | `ls apps/web/src/domains/trade/components/TokenSelector.tsx` — 파일 존재 |
| F17 | `shared/components/common/TokenAmount.tsx`가 삭제됨 | `ls apps/web/src/shared/components/common/TokenAmount.tsx` — exit code ≠ 0 (파일 없음) |
| F18 | `apps/web/src/core/`를 **제외한** `apps/web/src/` 영역에서 `@snowball/core/src/` deep import가 0건 | `grep -r "@snowball/core/src/" apps/web/src/domains/ apps/web/src/shared/ apps/web/src/app/` — 0건 |
| F19 | `scripts/deploy/deploy-uniswap-v3.ts`에서 로컬 `sortTokens` 함수 정의가 제거되고 `@snowball/core` import로 교체됨 | `grep "function sortTokens" scripts/deploy/deploy-uniswap-v3.ts` — 0건 + `grep "@snowball/core" scripts/deploy/deploy-uniswap-v3.ts` — 1건 이상 |

### Goal 3: App Page Slimming

| # | 조건 | 검증 방법 |
|---|------|----------|
| F20 | `borrow/page.tsx`에서 `handleOpenTrove`, validation(`errors`/`canOpen`), quick-fill(`handleHalf`/`handleMax`/`handleSafe`) 정의가 제거되고 domain hook/lib 호출로 대체됨 | `grep -c "const handleOpenTrove\|const errors\|const canOpen\|const handleHalf\|const handleMax\|const handleSafe" apps/web/src/app/\(defi\)/liquity/borrow/page.tsx` — 0건 |
| F21 | `useOpenTrovePipeline.ts` hook이 `domains/defi/liquity/hooks/`에 존재하고 `handleOpenTrove` 함수를 export | `grep "export.*function useOpenTrovePipeline\|handleOpenTrove" apps/web/src/domains/defi/liquity/hooks/useOpenTrovePipeline.ts` — 1건 이상 |
| F22 | `TroveDelegation.tsx`가 `domains/defi/liquity/components/`에 존재하고, agent domain hook(`useVaultPermission`, `useAgentList`) 직접 호출 없음 | `grep -c "useVaultPermission\|useAgentList" apps/web/src/domains/defi/liquity/components/TroveDelegation.tsx` — 0건 |
| F23 | `pool/add/page.tsx`에서 매직넘버 인라인 할당(`= 3000`, `= 50`, `= 600`)이 상수 import로 교체됨 | `grep -c "= 3000\|= 50\|= 600" apps/web/src/app/\(trade\)/pool/add/page.tsx` — 0건 |

### Goal 4: 매직 넘버 정리

| # | 조건 | 검증 방법 |
|---|------|----------|
| F24 | `liquity/lib/constants.ts`에 `ETH_GAS_COMPENSATION`, `BRANCH_INDEX`, `MIN_DEBT` 등 export | `grep -c "export" apps/web/src/domains/defi/liquity/lib/constants.ts` ≥ 3 |
| F25 | `trade/lib/constants.ts`에 `DEFAULT_FEE_TIER`, `DEFAULT_SLIPPAGE_BPS`, `DEFAULT_DEADLINE_SECONDS` 등 export | `grep -c "export" apps/web/src/domains/trade/lib/constants.ts` ≥ 3 |
| F26 | `morpho/lib/constants.ts`에 `ORACLE_SCALE`, `FALLBACK_BORROW_APR_MULTIPLIER` 등 export | `grep -c "export" apps/web/src/domains/defi/morpho/lib/constants.ts` ≥ 2 |
| F27 | `yield/lib/constants.ts`에 `STRATEGY_FEE_MULTIPLIER` 등 export | `grep -c "export" apps/web/src/domains/defi/yield/lib/constants.ts` ≥ 1 |
| F28 | `agent/lib/constants.ts`에 `KNOWN_TOKENS`, `PERMISSION_EXPIRY_SECONDS`, `AGENT_RATE_BOUNDS` 등 export | `grep -c "export" apps/web/src/domains/agent/lib/constants.ts` ≥ 3 |
| F29 | Liquity hook에서 `ETH_GAS_COMPENSATION` 인라인 정의(`200000000000000000n` 또는 `0.2e18`)가 constants import로 교체됨 | `grep -rn "200000000000000000n" apps/web/src/domains/defi/liquity/hooks/` — 0건 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | `apps/web` 빌드 성공 (타입 에러 0, import 누락 0) | `cd apps/web && npx next build` — exit code 0 |
| N2 | `apps/server` 빌드 성공 (packages/core 변경이 server에 영향 없음) | `cd apps/server && npx tsc --noEmit` — exit code 0 |
| N3 | Behavior-preserving: 모든 수치 계산/포맷팅/tx 시퀀스 결과가 리팩토링 전후 동일 | 변경된 도메인 페이지(bridge, borrow, lend, yield, trade, agent) 수동 접속 + 렌더링/수치 확인 |
| N4 | Options 모듈 무수정 | `git diff -- "apps/web/src/app/(options)/" "apps/web/src/domains/options/"` — 변경 0건 |
| N5 | re-export 패턴 적용: 이동된 파일의 원래 위치에 re-export 존재 | `grep "export.*from" apps/web/src/shared/types/tx.ts apps/web/src/shared/lib/morphoMath.ts` — 각 파일 1건 이상 |
| N6 | `apps/web/src/core/` 기존 deep re-export 파일(`core/abis/`, `core/config/`, `core/dex/`)은 이번 Phase에서 변경하지 않음 (유예) | `git diff -- "apps/web/src/core/abis/" "apps/web/src/core/config/" "apps/web/src/core/dex/"` — 변경 0건 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | re-export 체이닝: `shared/types/tx.ts` → `core/types/tx.ts` 이동 후 기존 `shared/types/tx` import가 동작 | 기존 import 유지 | 빌드 성공(N1)으로 확인 |
| E2 | `formatUsdCompact` 통합 후 기존 `formatUsd` 사용처 동작 | 포맷팅 결과 동일 | 해당 페이지 수동 확인 (수치 비교) |
| E3 | `yield → morpho/lib` cross-domain import | 정상 빌드 + 런타임 동작 | 빌드 성공(N1) + Yield 페이지 접속 확인 |
| E4 | `TroveDelegation` props-only 분리 후 delegation flow | delegate/undelegate 플로우 정상 | borrow 페이지에서 delegation 위저드 수동 확인 |
| E5 | `useOpenTrovePipeline` 추출 후 openTrove tx 플로우 | tx 시퀀스(approve→openTrove) 정상 실행 | borrow 페이지에서 trove 생성 수동 확인 |
| E6 | `packages/core`에 추가된 `sortTokens`가 외부(scripts)에서 정상 import 가능 | import 시 타입 에러 없음 | `npx tsx -e "import { sortTokens } from '@snowball/core'; console.log(typeof sortTokens)"` — "function" 출력 |
| E7 | bridge session/steps 분리 후 bridge flow | bridge 페이지 정상 렌더링 + step 진행 | bridge 페이지 수동 확인 |

## PRD 목표 ↔ DoD 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. Hook Slimming | F1~F9 | ✅ |
| 2. Layer Hygiene | F10~F19 | ✅ |
| 3. App Page Slimming | F20~F23 | ✅ |
| 4. 매직 넘버 정리 | F24~F29 | ✅ |
| 제약: Behavior-preserving | N3 | ✅ |
| 제약: Options 무수정 | N4 | ✅ |
| 제약: Sprint 단위 PR | 개발 Step에서 Sprint별 빌드 확인 | ✅ |

## Known Baseline Issues

| # | 이슈 | 설명 | 비고 |
|---|------|------|------|
| KB1 | `next build --webpack` /pool prerender 실패 | `WagmiProviderNotFoundError` — Turbopack 기본 빌드(`next build`)는 정상, `--webpack` 모드에서만 /pool 경로 prerender 시 발생. 이번 Phase에서 /pool/page.tsx는 변경하지 않음 | 리팩토링 이전부터 존재하던 기존 이슈. N1 빌드 검증은 표준 `next build`(Turbopack) 기준 |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| re-export 패턴 | N5 | ✅ |
| domain/lib/ 표준 | F1~F8, F24~F28 | ✅ |
| packages/core 확장 (sortTokens, parseTokenAmount, needsApproval만) | F10~F12 | ✅ |
| cross-domain 의존성 (yield→morpho 허용) | E3 | ✅ |
| TroveDelegation UI-only (agent hook은 app layer) | F22 | ✅ |
| deep import 제거 (core/ 자체 re-export 제외) | F18, N6 | ✅ |
| `apps/web/src/core/*` 기존 deep re-export 유예 | N6 | ✅ |
