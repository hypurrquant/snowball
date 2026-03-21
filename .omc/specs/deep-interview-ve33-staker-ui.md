# Deep Interview Spec: ve(3,3) Staker UI

## Metadata
- Interview ID: ve33-ui-20260319
- Rounds: 6
- Final Ambiguity Score: 16.5%
- Type: brownfield
- Generated: 2026-03-19
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.75 | 25% | 0.188 |
| Success Criteria | 0.85 | 25% | 0.213 |
| Context Clarity | 0.80 | 15% | 0.120 |
| **Total Clarity** | | | **0.835** |
| **Ambiguity** | | | **16.5%** |

## Goal

SnowballStaker 컨트랙트의 전체 UI를 구현한다. ve(3,3) 구조에서 emission 부분만 사용 (투표/lock/gauge 없음). 사용자는 LP NFT를 스테이킹하여 emission 보상 + swap fee를 받고, 누구나 인센티브를 생성할 수 있다. 기존 3개 훅(useStakerActions, useStakerDeposits, useStakerRewards)을 활용하여 3개 페이지 + 컴포넌트를 구현한다.

## 사용자 플로우 (7개)

### 스테이킹 플로우 (사용자)
1. **인센티브 목록 조회** — 활성 인센티브 목록 (풀, 보상 토큰, emission APR, 기간)
2. **LP NFT 선택** — 내 LP NFT 중 해당 풀에 스테이킹 가능한 것 선택
3. **depositAndStake 실행** — LP NFT를 Staker에 예치 + 인센티브에 스테이킹
4. **스테이킹 현황 확인** — 내 스테이킹된 포지션, 누적 보상, pending rewards
5. **claimReward 실행** — 누적된 emission 보상 청구
6. **collectFee 실행** — 스테이킹 중인 LP의 swap fee 수집
7. **unstake + withdrawToken** — 언스테이크 후 LP NFT 인출

### 인센티브 생성 플로우 (누구나)
8. **createIncentive** — 보상 토큰 + 대상 풀 + 기간 + 수량 입력 → 인센티브 생성

## Constraints
- **새 컨트랙트 없음** — 기존 SnowballStaker (0x1bea0762c858e56f9aace66280bd713ad17da287) 그대로 사용
- **기존 훅 활용** — useStakerActions (6 write fns), useStakerDeposits, useStakerRewards 이미 구현됨
- **온체인 데이터** — 인센티브 목록은 컨트랙트 이벤트 로그(IncentiveCreated)에서 파싱
- **기존 레이아웃 활용** — `/stake` 레이아웃에 3탭 네비게이션 이미 정의됨 (Overview, My Stakes, Rewards)
- **투표/lock/gauge 없음** — ve(3,3) 중 emission 구조만 사용

## Non-Goals
- veToken lock/unlock 시스템
- 거버넌스 투표 UI
- Gauge voting (emission 배분 투표)
- Bribe 마켓플레이스
- 어드민 전용 인센티브 관리 (누구나 생성 가능)

## Acceptance Criteria
- [ ] `/stake` (Overview): 활성 인센티브 목록 표시 (풀, 보상 토큰, APR 추정, 기간, 총 스테이킹량)
- [ ] `/stake` (Overview): 인센티브 클릭 → 스테이킹 플로우 진입 가능
- [ ] `/stake/my-stakes`: 내 스테이킹된 LP NFT 목록 (풀, 틱 범위, 유동성, 인센티브, pending 보상)
- [ ] `/stake/my-stakes`: 각 포지션에서 unstake + withdraw 가능
- [ ] `/stake/rewards`: 누적 보상 + 미청구 보상 표시, claimReward 실행 가능
- [ ] `/stake/rewards`: collectFee 실행 가능 (swap fee 수집)
- [ ] 인센티브 생성 폼: 보상 토큰, 대상 풀, 시작/종료 시간, 보상 수량 입력 → createIncentive 실행
- [ ] depositAndStake: 내 LP NFT 선택 → 인센티브 선택 → 스테이킹 TX 실행
- [ ] 이벤트 로그 파싱으로 인센티브 목록 동적 조회
- [ ] 기존 useTxPipeline 패턴 활용 (approve → execute → success CTA)

## Technical Context

### 기존 코드 (활용)
- **ABI:** `packages/core/src/abis/staker.ts` — 17 functions, 8 events
- **주소:** `STAKER.snowballStaker` = `0x1bea0762c858e56f9aace66280bd713ad17da287`
- **훅:**
  - `useStakerActions` — stakeToken, unstakeToken, claimReward, collectFee, withdrawToken, depositAndStake
  - `useStakerDeposits(tokenIds)` — 스테이킹된 포지션 조회 (owner, stakeCount, ticks)
  - `useStakerRewards` — useStakerRewardInfo (인센티브별), useStakerAccruedRewards (토큰별)
- **타입:** StakerIncentive, StakerDeposit, StakerRewardInfo, IncentiveKey
- **레이아웃:** `app/(defi)/stake/layout.tsx` — 3탭 네비 (Overview, My Stakes, Rewards)
- **LP NFT 조회:** `useUserPositions` (trade 도메인) — 사용자의 Uniswap V3 LP NFT 목록

### 신규 구현 필요
1. **인센티브 목록 훅** — `useActiveIncentives()`: IncentiveCreated 이벤트 로그 파싱 → 활성 인센티브 목록 반환
2. **Overview 페이지** — `/stake/page.tsx` 재구현: 인센티브 카드 목록, 스테이킹 액션
3. **My Stakes 페이지** — `/stake/my-stakes/page.tsx`: 내 스테이킹 포지션, unstake/withdraw
4. **Rewards 페이지** — `/stake/rewards/page.tsx`: 보상 현황, claim/collectFee
5. **컴포넌트:**
   - IncentiveCard — 인센티브 정보 표시 (풀, 보상, APR, 기간)
   - StakeDialog — LP NFT 선택 + depositAndStake 실행
   - StakedPositionCard — 스테이킹된 포지션 + pending rewards
   - RewardsSummary — 토큰별 누적/미청구 보상
   - CreateIncentiveForm — 인센티브 생성 폼
6. **인센티브 APR 추정** — (totalReward / duration) * (365 days) / totalStakedLiquidity

## 페이지 구조

```
/stake (Overview)
├── 전체 TVL, 활성 인센티브 수
├── [IncentiveCard] × N
│   ├── 풀명 (wCTC/USDC 0.3%)
│   ├── 보상 토큰 + APR 추정
│   ├── 기간 (시작~종료)
│   ├── 총 스테이킹량
│   └── [Stake] 버튼 → StakeDialog
└── [Create Incentive] 버튼 → CreateIncentiveForm

/stake/my-stakes
├── 내 스테이킹 포지션 없으면 → 빈 상태 + "/stake로 이동" CTA
└── [StakedPositionCard] × N
    ├── LP NFT 정보 (풀, 틱 범위, 유동성)
    ├── 인센티브 정보
    ├── Pending Reward 실시간
    ├── [Claim] [Collect Fee] [Unstake] 버튼

/stake/rewards
├── RewardsSummary (토큰별 총 보상)
├── 미청구 보상 목록
└── [Claim All] 버튼
```

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| SnowballStaker | external system | address, maxLeadTime, maxDuration | manages Incentives and Deposits |
| LP NFT Position | core domain | tokenId, pool, tickLower, tickUpper, liquidity | staked into Incentive via Staker |
| Incentive | core domain | rewardToken, pool, startTime, endTime, totalReward, totalStaked | created by anyone, earns Rewards |
| IncentiveKey | supporting | rewardToken, pool, startTime, endTime, refundee | identifies unique Incentive |
| Reward | core domain | token, amount, claimed/unclaimed | accrued from Incentive |
| Stake Flow | core domain | 7 steps (list → select → stake → monitor → claim → fee → unstake) | end-to-end user journey |
| Incentive Creator | core domain | any wallet, rewardToken, amount, duration | creates Incentive for any pool |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 4 | 4 | - | - | N/A |
| 2 | 4 | 0 | 0 | 4 | 100% |
| 3 | 5 | 1 | 0 | 4 | 80% |
| 4 | 6 | 1 | 0 | 5 | 83% |
| 5 | 6 | 0 | 0 | 6 | 100% |
| 6 | 6 | 0 | 0 | 6 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** ve(3,3) UI의 범위는 어디까지인가요?
**A:** ve(3,3) 중 emission 구조만 사용. 투표 없음. 기존 Staker UI 완성.
**Ambiguity:** 64.2% (Goal: 0.55, Constraints: 0.20, Criteria: 0.10, Context: 0.60)

### Round 2
**Q:** 사용자가 가장 먼저 보고 싶어하는 것은?
**A:** 사용 가능한 인센티브 목록
**Ambiguity:** 56.2% (Goal: 0.65, Constraints: 0.30, Criteria: 0.15, Context: 0.65)

### Round 3
**Q:** 전체 플로우가 다 동작해야 하나요?
**A:** 전체 플로우 필수 (인센티브 조회 → 스테이킹 → 보상 → 청구 → fee → 언스테이크)
**Ambiguity:** 38.3% (Goal: 0.75, Constraints: 0.40, Criteria: 0.60, Context: 0.70)

### Round 4 (CONTRARIAN MODE)
**Q:** 인센티브를 누가 생성하나요?
**A:** 누구나 가능 (오픈)
**Ambiguity:** 29.5% (Goal: 0.80, Constraints: 0.60, Criteria: 0.65, Context: 0.75)

### Round 5
**Q:** 인센티브 목록을 어떻게 가져오나요?
**A:** 온체인 직접 조회 (이벤트 로그 파싱)
**Ambiguity:** 25.8% (Goal: 0.80, Constraints: 0.70, Criteria: 0.70, Context: 0.75)

### Round 6 (SIMPLIFIER MODE)
**Q:** 7개 플로우가 전체 스코프인가요?
**A:** 맞다 — 이게 전부
**Ambiguity:** 16.5% (Goal: 0.90, Constraints: 0.75, Criteria: 0.85, Context: 0.80)

</details>
