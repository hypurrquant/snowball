# Deep Interview Spec: DeFi Strategy Router

## Metadata
- Interview ID: di-strategy-router-002
- Rounds: 5
- Final Ambiguity Score: 16.3%
- Type: brownfield
- Generated: 2026-03-17
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.92 | 35% | 0.322 |
| Constraint Clarity | 0.75 | 25% | 0.188 |
| Success Criteria | 0.80 | 25% | 0.200 |
| Context Clarity | 0.85 | 15% | 0.128 |
| **Total Clarity** | | | **0.837** |
| **Ambiguity** | | | **16.3%** |

## Goal

프론트엔드에서 유저가 보유 자산(wCTC/lstCTC/sbUSD/USDC)과 금액을 입력하면, Snowball 프로토콜 전체에서 가능한 수익 경로 6개를 계산하고 APY순으로 정렬해서 보여준다. 각 경로에 [실행] 버튼이 있어 tx-pipeline-modal로 다단계 실행 가능.

## 경로 목록 (6개, MVP)

### 단일홉 (4개)
1. **Aave Supply** — `asset → Aave Pool.supply()` — APY: 온체인 조회
2. **Morpho Supply** — `asset → Morpho.supply()` — APY: 온체인 조회
3. **Yield Vault** — `asset → SnowballYieldVault.deposit()` — APY: vault share 기반 계산
4. **Stability Pool** — `sbUSD → StabilityPool.provideToSP()` — APY: 청산 수익 추정

### 멀티홉 (2개)
5. **CDP → sbUSD LP → Staker** — `wCTC → Liquity.openTrove() → sbUSD → DEX.mint(LP) → Staker.stake()` — APY: 이자비용 + LP fee + emission 합산
6. **CDP → Morpho Supply** — `wCTC → Liquity.openTrove() → sbUSD → Morpho.supply()` — APY: 이자비용 + supply APY

### 각 경로 표시 정보
- 경로명 + 프로토콜 배지
- 예상 APY (%)
- 리스크 레벨 (낮음/중간/높음)
- 경로 단계 시각화 (token → protocol → token → ...)
- [실행] 버튼

## 라우트

`/earn/strategy` — Earn 그룹 하위, nav에 추가

## UI 구조

```
┌─────────────────────────────────────────────────┐
│  Strategy Router                                 │
│  "자산을 선택하고 최적의 수익 경로를 찾으세요"       │
│                                                  │
│  [wCTC ▼]  [1000        ]  [경로 찾기]            │
│                                                  │
│  ─── 추천 경로 (APY 높은 순) ───                   │
│                                                  │
│  ★ CDP → sbUSD LP → Staker         APY ~18%     │
│    wCTC → Liquity → sbUSD → LP → Stake          │
│    리스크: 중 (청산+IL)  단계: 4     [실행 →]      │
│                                                  │
│  2. Yield Vault (Stability Pool)    APY ~12%     │
│     wCTC → Liquity → sbUSD → Vault              │
│     리스크: 중         단계: 2       [실행 →]      │
│                                                  │
│  3. Aave Supply                     APY ~7%      │
│     wCTC → Aave                                  │
│     리스크: 낮         단계: 1       [실행 →]      │
│                                                  │
│  4. Morpho Supply                   APY ~5%      │
│     wCTC → Morpho                               │
│     리스크: 낮         단계: 1       [실행 →]      │
│                                                  │
│  5. CDP → Morpho Supply             APY ~8%      │
│     wCTC → Liquity → sbUSD → Morpho             │
│     리스크: 중         단계: 2       [실행 →]      │
│                                                  │
│  6. Stability Pool                  APY ~12%     │
│     wCTC → Liquity → sbUSD → SP                 │
│     리스크: 중         단계: 2       [실행 →]      │
└─────────────────────────────────────────────────┘
```

## Constraints
- 프론트엔드 전용 (hook + 컴포넌트)
- 기존 읽기 hooks 재사용 (useMorphoMarkets, useAaveMarkets, useYieldVaults 등)
- 기존 액션 hooks 재사용 (useMorphoActions, useAaveActions 등)
- 온체인 APY 데이터 실시간 조회 → 로컬 경로 계산
- 기존 tx-pipeline-modal 활용 (멀티스텝 실행)
- 기존 디자인 시스템 (ice-blue, card, badge) 유지

## Non-Goals
- Agent 자동 실행 연동 — Phase 2
- Chat → Strategy 연동 — Phase 3
- 자연어 명령 처리 — Phase 3
- 온체인 strategy 컨트랙트 — 불필요 (FE에서 계산)
- ForwardX/Bridge 경로 — Phase 2

## Acceptance Criteria
- [ ] `/earn/strategy` 페이지가 200 OK로 로딩됨
- [ ] 자산 선택기 (wCTC/lstCTC/sbUSD/USDC) + 금액 입력 UI 존재
- [ ] 6개 경로가 APY 내림차순으로 표시됨
- [ ] 각 경로에 프로토콜 배지, APY, 리스크 레벨, 단계 수 표시
- [ ] 단일홉 경로의 APY는 온체인 데이터 기반 (기존 hooks에서 읽기)
- [ ] 멀티홉 경로의 APY는 합산 계산 (차입 이자 차감)
- [ ] 각 경로에 [실행] 버튼이 있음
- [ ] [실행] 클릭 시 tx-pipeline-modal 열림 (단일홉: 1-2 step, 멀티홉: 3-4 step)
- [ ] Nav에 "Strategy" 항목이 Earn 그룹에 추가됨
- [ ] 로딩 중 skeleton UI 표시

## Technical Context

### 기존 읽기 Hooks (재사용)
- `useMorphoMarkets()` → supplyAPY, borrowAPR
- `useAaveMarkets()` → supplyAPY, borrowAPY
- `useYieldVaults()` (존재 여부 확인 필요, 없으면 생성)
- `useStabilityPool()` (Liquity, 존재 여부 확인 필요)
- `useUnifiedSupplyMarkets()` → 통합 supply APY

### 새로 만들 파일
- `domains/defi/strategy/types.ts` — YieldPath, PathStep, RiskLevel 타입
- `domains/defi/strategy/hooks/useStrategyRoutes.ts` — 경로 계산 hook
- `domains/defi/strategy/lib/pathCalculator.ts` — 경로별 APY 계산 로직
- `domains/defi/strategy/lib/constants.ts` — 리스크 레벨, 경로 정의
- `domains/defi/strategy/components/StrategyCard.tsx` — 경로 카드 컴포넌트
- `domains/defi/strategy/components/AssetSelector.tsx` — 자산/금액 입력
- `app/(earn)/earn/strategy/page.tsx` — 페이지
- `shared/config/nav.tsx` — Strategy 항목 추가

### APY 계산 방식
- 단일홉: 해당 프로토콜의 온체인 APY 직접 사용
- 멀티홉 (CDP → X):
  - `netAPY = targetAPY - borrowCost`
  - `borrowCost`: Liquity 이자율 (유저가 설정, 기본 5%)
  - CDP 경로는 LTV 기반으로 발행 가능 sbUSD 계산
  - 예: 1000 CTC ($5000) × LTV 65% = 3250 sbUSD 발행 가능

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| YieldPath | core domain | name, steps[], estimatedAPY, riskLevel, protocol | Shown in strategy page |
| PathStep | core domain | action, protocol, inputToken, outputToken, amount | Belongs to YieldPath |
| AssetInput | UI | token, amount | Triggers route calculation |
| StrategyPage | UI | paths[], selectedAsset, isLoading | Renders YieldPaths |
| RiskLevel | enum | LOW, MEDIUM, HIGH | Assigned to YieldPath |
| TxPipeline | existing | steps[], status | Executes YieldPath |

## Interview Transcript
<details>
<summary>Full Q&A (5 rounds)</summary>

### Round 1
**Q:** Strategy Router의 경로 계산이 온체인/오프체인?
**A:** 하이브리드 (온체인 데이터 + 로컬 계산)
**Ambiguity:** 48.3%

### Round 2
**Q:** agent-runtime 위에 만들까 별도로?
**A:** 프론트엔드 전용
**Ambiguity:** 40.8%

### Round 3
**Q:** 어떤 경로들을 보여줄까?
**A:** 멀티홉 + 실행 버튼
**Ambiguity:** 29.0%

### Round 4
**Q:** MVP 경로 범위?
**A:** 단일홉 4 + 멀티홉 2 (총 6개)
**Ambiguity:** 20.3%

### Round 5
**Q:** 라우트와 입력 방식?
**A:** /earn/strategy, 자산 선택 + 금액 입력
**Ambiguity:** 16.3% — PASSED
</details>
