# Deep Interview Spec: 목적 기반 네비게이션 재구성 + Agent-First UX

## Metadata
- Interview ID: di-snowball-uiux-001
- Rounds: 9
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

현재 프로토콜 이름 중심(Morpho, Liquity, Aave...)의 사이드바 네비게이션을 **유저 목적 중심 4그룹(Earn/Borrow/Trade/Manage)**으로 재구성한다. 동일 목적의 프로토콜은 통합 페이지에서 비교/선택할 수 있게 한다. 이 UI는 사람과 AI Agent 모두가 사용하는 인터페이스이다.

## 핵심 변경

### 네비게이션 구조 (Before → After)

**Before (프로토콜 중심 15개 항목):**
```
Trade: Swap, Pool, Positions
DeFi: CDP, Lending, Aave, Yield, ForwardX, Stake, Bridge
More: Faucet, Dashboard, Analytics, Agent, Chat
```

**After (목적 중심 4그룹 11개 항목):**
```
Earn (수익 내기)
  ├─ Supply (통합: Morpho + Aave 마켓 비교)
  ├─ Yield Vaults (자동 복리)
  └─ LP Staking (DEX LP + 에미션 보상)

Borrow (빌리기)
  ├─ CDP (Liquity — sbUSD 민트)
  └─ Lending Borrow (통합: Morpho + Aave 비교)

Trade (거래)
  ├─ Swap (토큰 교환)
  ├─ Pool (유동성 공급)
  └─ ForwardX (선물환)

Manage (관리)
  ├─ Dashboard (포트폴리오 통합 뷰)
  ├─ Agent (AI 위임 + Chat)
  └─ Bridge (크로스체인)
```

### 통합 Supply 페이지 (핵심 신규)

`/earn/supply` — 한 페이지에서 Morpho + Aave 마켓을 모두 표시:
- 자산별로 그룹화 (wCTC, lstCTC, sbUSD, USDC)
- 각 마켓의 APY, TVL, 프로토콜 라벨 표시
- 유저가 APY/리스크로 비교해서 선택
- 어느 프로토콜인지 몰라도 "가장 높은 APY에 Supply" 가능

### 통합 Borrow 페이지

`/borrow/lending` — Morpho + Aave의 borrow 마켓 비교:
- 자산별 borrow APR 비교
- LTV, Health Factor 시뮬레이션

## Constraints
- 기존 Next.js 16 + Tailwind + shadcn/ui 코드베이스 유지
- 기존 도메인 hooks (useMorphoMarkets, useAaveMarkets 등) 재사용
- 기존 ABIs, addresses.ts 변경 없음
- 기존 개별 프로토콜 페이지는 유지 (통합 페이지에서 링크)
- 사람과 Agent 모두 사용 가능한 구조

## Non-Goals
- DeFi Strategy Engine (AI 라우터) — Phase 2에서 별도 구현
- 자연어 Chat 개선 — Phase 3
- Agent 대시보드 고도화 — Phase 3
- 디자인 시스템 변경 (색상, 폰트 등) — 유지
- Options 모듈 — MVP 제외

## Acceptance Criteria
- [ ] 사이드바가 4그룹(Earn/Borrow/Trade/Manage)으로 재구성됨
- [ ] `/earn/supply` 통합 페이지에서 Morpho + Aave 마켓이 함께 표시됨
- [ ] `/borrow/lending` 통합 페이지에서 Morpho + Aave borrow 마켓 비교 가능
- [ ] 기존 개별 프로토콜 라우트(`/morpho/*`, `/aave/*` 등)가 정상 동작 (하위호환)
- [ ] `/earn/yield` → 기존 Yield Vaults 페이지 연결
- [ ] `/earn/stake` → 기존 Staker 페이지 연결
- [ ] `/borrow/cdp` → 기존 Liquity 페이지 연결
- [ ] `/trade/swap`, `/trade/pool`, `/trade/forward` → 기존 페이지 연결
- [ ] `/manage/dashboard` → 기존 Dashboard 연결
- [ ] `/manage/agent` → 기존 Agent 연결
- [ ] 모바일 MobileNav도 동일 구조로 업데이트
- [ ] 홈페이지가 4개 목적 그룹을 반영

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| UI 개선 = 비주얼 개선 | 실제로는 정보 아키텍처 + Strategy Engine 필요 | Phase 1은 nav 구조, Phase 2에서 Engine |
| 타겟 유저가 DeFi 중급 | 모든 레벨 커버 필요 | 목적 기반 nav로 초보도 직관적 |
| 프로토콜별 분리가 당연 | 유저는 프로토콜 아닌 목적으로 사고 | 통합 Supply/Borrow 페이지 |
| Agent는 별도 기능 | Agent = 또 하나의 유저 | Agent-first 인터페이스 설계 |
| Supply 페이지를 합칠 필요 | Morpho/Aave 개별 페이지도 가치 | 통합 뷰 + 개별 접근 모두 지원 |

## Technical Context

### 파일 변경 범위
- `src/shared/config/nav.tsx` — 4그룹 구조로 재작성
- `src/app/` — 새 route groups 생성 (`(earn)`, `(borrow)`, `(trade-new)`, `(manage)`)
- `src/domains/defi/earn/` — 새 도메인 (통합 Supply hook + 컴포넌트)
- `src/domains/defi/borrow/` — 통합 Borrow hook + 컴포넌트
- `src/shared/components/layout/Sidebar.tsx` — 그룹 렌더링 업데이트
- `src/app/page.tsx` — 홈페이지 4그룹 반영

### 기존 코드 재사용
- `useMorphoMarkets()`, `useAaveMarkets()` → 통합 Supply에서 merge
- `useMorphoActions()`, `useAaveActions()` → 통합 페이지에서 선택적 호출
- 기존 프로토콜 컴포넌트 → 상세 페이지에서 그대로 사용

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| NavGroup | core domain | title, items[], icon | Contains NavItems |
| NavItem | core domain | href, label, icon, protocol? | Belongs to NavGroup |
| UnifiedMarket | core domain | protocol, asset, apy, tvl, risk | Shown in Supply/Borrow page |
| EarnSupplyPage | UI | markets[], filters[], sort | Aggregates Morpho+Aave markets |
| BorrowLendingPage | UI | markets[], filters[], sort | Aggregates Morpho+Aave borrow |
| UserGoal | concept | earn/borrow/trade/manage | Maps to NavGroup |
| Agent | actor | commands, positions, actions | Uses same UI as human |
| StrategyEngine | future | asset→route calculator | Phase 2 |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability |
|-------|-------------|-----|---------|--------|-----------|
| 1 | 6 | 6 | - | - | N/A |
| 2 | 8 | 2 | 0 | 6 | 75% |
| 3 | 9 | 1 | 0 | 8 | 89% |
| 4 | 12 | 3 | 0 | 9 | 75% |
| 5 | 13 | 1 | 0 | 12 | 92% |
| 6 | 13 | 0 | 0 | 13 | 100% |
| 7 | 14 | 1 | 0 | 13 | 93% |
| 8 | 14 | 0 | 0 | 14 | 100% |
| 9 | 15 | 1 | 0 | 14 | 93% |

## Interview Transcript
<details>
<summary>Full Q&A (9 rounds)</summary>

### Round 1
**Q:** 현재 사이드바에 15개 항목이 나열되어 있고, 프로토콜마다 개별 페이지로 이동합니다. UI/UX 개선의 핵심 문제가 뭐라고 보시나요?
**A:** 전부 다 문제 (정보 과부하 + 프로토콜 간 연결 끊김 + 프로토콜 중심 구조)
**Ambiguity:** 75.4%

### Round 2
**Q:** 이 플랫폼의 타겟 유저가 누구인가요?
**A:** 모든 레벨 다 커버 (초보~파워유저)
**Ambiguity:** 71.7%

### Round 3
**Q:** 완성된 UI를 보여드렸을 때 "바로 이거야!" 하려면 어떤 경험이어야 하나요?
**A:** Agent가 이 도구를 활용할 수 있구나 하는 느낌. CLI를 도구로 사용하고 에이전트가 사용할 수 있게.
**Ambiguity:** 59.4% — 핵심 전환점: Agent-first UX

### Round 4
**Q:** "에이전트가 도구를 활용"이 구체적으로 어떤 흐름?
**A:** 에이전트도 하나의 UI. 사람도 이걸 사용해야 해. ve33DEX 에미션, sbUSD 민트→LP→수익, CTC로 어떻게 수익 낼 수 있는지 경로.
**Ambiguity:** 46.0%

### Round 5 (Contrarian)
**Q:** UI 디자인 vs Strategy Engine — 진짜 목표는?
**A:** 둘 다 함께
**Ambiguity:** 43.5%

### Round 6 (Simplifier)
**Q:** 범위: 기존 코드 유지? 리빌드?
**A:** 기존 코드베이스 위에 개선
**Ambiguity:** 34.0%

### Round 7
**Q:** 딱 하나만 먼저 만든다면?
**A:** 목적 기반 네비게이션 재구성
**Ambiguity:** 27.7%

### Round 8
**Q:** 4그룹 구조 예시 선택
**A:** 예시 A (Earn/Borrow/Trade/Manage 4그룹) 선택
**Ambiguity:** 20.3%

### Round 9
**Q:** Morpho+Aave Supply를 통합 페이지? 별도 페이지?
**A:** 통합 페이지
**Ambiguity:** 16.3% — Threshold PASSED
</details>
