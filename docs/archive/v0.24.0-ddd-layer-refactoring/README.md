# DDD Layer Refactoring - v0.24.0

## 문제 정의

### 현상
- **Hooks가 비대화**: React hook이 순수 계산 로직, 상수, 타입, 데이터 변환까지 포함
  - `apps/web/src/domains/bridge/hooks/useBridgePipeline.ts` (400줄+, state machine + session + polling)
  - `apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts` (150줄+, APY 계산 + read-plan)
  - `apps/web/src/domains/defi/morpho/hooks/useMorphoMarkets.ts` (tuple transform + fallback)
  - `apps/web/src/domains/defi/liquity/hooks/usePositionPreview.ts` (CR/fee/maxBorrow 계산)
  - `apps/web/src/domains/defi/liquity/hooks/useMarketRateStats.ts` (정렬/평균/중앙값)
  - `apps/web/src/domains/trade/hooks/usePoolTicks.ts` (bitmap/tick helper + display transform)
  - `apps/web/src/domains/trade/hooks/useProtocolStats.ts` (fetcher + formatter)
  - `apps/web/src/domains/agent/hooks/useAgentList.ts`, `useAgentProfile.ts` (contract builder + result mapper)
  - `apps/web/src/domains/agent/hooks/useVaultPermission.ts` (dedupe + constants)
- **App Page에 비즈니스 로직**: app layer는 orchestration만 해야 하는데 domain 로직이 혼재
  - `apps/web/src/app/(defi)/liquity/borrow/page.tsx` — validation, quick-fill, tx pipeline, delegate/undelegate flow
  - `apps/web/src/app/(trade)/pool/add/page.tsx` — legacy create-position flow, approve/mint orchestration
- **Shared가 dumping ground**: 특정 도메인 전용이거나 미사용 코드가 shared에 배치
  - `apps/web/src/shared/lib/morphoMath.ts` — Morpho 전용 수학 (yield에서도 import하지만 도메인 지식)
  - `apps/web/src/shared/components/common/TokenSelector.tsx` — trade/swap에서만 사용, SUPPORTED_TOKENS 하드코딩
  - `apps/web/src/shared/components/common/TokenAmount.tsx` — 현재 사용처 없음 (unused)
- **매직 넘버 산재**: 이름 없는 상수가 hooks/components에 흩어져 있음
  - `ETH_GAS_COMPENSATION` (useTroveActions.ts, useEditTrove.ts에서 중복)
  - `BRANCH_INDEX` (useTroveActions.ts, useAllTroves.ts에서 중복)
  - fee=3000, slippageBps=50, deadline 등 trade hooks에 인라인
  - APR fallback `util * 0.08` (useMorphoMarkets.ts)
  - permission expiry `30 days`, rate bounds/caps (DelegationSetupWizard.tsx)
- **cross-runtime 유틸 분리 부재**: scripts/server에서 재사용 불가
  - `sortTokens` — `shared/lib/utils.ts`에 있지만 `scripts/deploy/deploy-uniswap-v3.ts`에서 동일 로직 별도 구현
  - `parseTokenAmount` — bigint 파싱 순수 함수인데 shared에 위치

### 원인
- MVP 빠른 개발 과정에서 hook에 로직을 직접 넣는 패턴이 고착화
- `core = re-export only`, `shared = 공용 보관소`라는 암묵적 관행으로 레이어 역할 구분이 모호
- domain/lib/ 디렉토리를 만들어 순수 로직을 분리하는 관행이 일부 도메인(liquity)에만 적용

### 영향
- **유지보수 비용 증가**: hook 수정 시 React state + 순수 로직이 섞여있어 변경 범위 파악이 어려움
- **테스트 불가**: 순수 계산 로직이 hook에 묻혀있어 단위 테스트 작성 불가
- **버그 위험**: `formatUsd` 4곳 중복, `BRANCH_INDEX` 2곳 중복 등 한쪽만 수정 시 불일치 발생
- **코드 재사용 불가**: scripts/에서 동일 포맷팅/파싱 로직을 ad-hoc으로 재구현

### 목표
1. **Hook Slimming**: 대상 fat hook에서 순수 계산/변환/상수를 domain/lib/로 추출. Hook은 React wrapper만 담당
   - 대상: bridge(useBridgePipeline 포함), liquity, morpho, yield, trade(read-model hook), agent의 fat hook
   - useBridgePipeline은 state machine/session/polling 로직을 lib/로 분리 (hook 자체는 유지)
2. **Layer Hygiene**: 잘못된 레이어에 있는 코드를 올바른 위치로 이동
   - `packages/core` → cross-runtime 유틸: `sortTokens`, `parseTokenAmount`, ERC20 approval 판정 로직 (`needsApproval` 순수 함수 추출)
   - `apps/web/src/core/types/tx.ts` → web 전용 React-free 타입: `TxStep`, `TxPhase`, `TxStepType`, `TxStepStatus` (파일 전체 이동)
   - `domains/*/lib` → 도메인별 순수 로직 (protocol math, tuple transform, constants)
   - `shared` → React hook/UI/provider만 유지
   - **CLAUDE.md의 레이어 순서를 `core → shared → domains → app`으로 수정** (현재 `core → domains → shared → app`은 오류)
3. **App Page Slimming**: `apps/web/src/app/(defi)/liquity/borrow/page.tsx`, `apps/web/src/app/(trade)/pool/add/page.tsx`에서 비즈니스 로직을 domain hook/component로 이동
4. **매직 넘버 정리**: 이름 없는 상수를 domain/lib/constants.ts로 통합

### 비목표 (Out of Scope)
- UI redesign이나 기능 변경
- `packages/agent-runtime`, `apps/agent-server` 리팩토링 (web 프론트엔드만 대상)
- Options 모듈 수정 (MVP 제외 상태 유지)
- 새로운 테스트 프레임워크 도입 (lib 분리만, 테스트 작성은 별도 phase)
- routing 체계 변경
- `useSmartDeposit`, `useCreatePosition` 같은 복잡한 write hook 리팩토링 (상태/입력이 복잡하고 리스크 높음)

## 제약사항
- **Behavior-preserving**: 모든 수치 계산, 포맷팅, tx 시퀀스의 결과가 리팩토링 전후 동일해야 함
- `packages/core` 변경 시 `apps/server` 빌드도 깨지지 않아야 함
- Sprint 단위 PR로 나누어 리뷰 가능한 크기 유지
- Options 모듈은 절대 수정하지 않음
