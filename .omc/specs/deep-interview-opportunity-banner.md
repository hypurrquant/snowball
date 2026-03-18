# Deep Interview Spec: 온체인 기회 토스트 + Agent SaaS CTA

## Metadata
- Interview ID: di-banner-agent-saas-003
- Rounds: 8
- Final Ambiguity Score: 17.0%
- Type: brownfield
- Generated: 2026-03-18
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.80 | 25% | 0.200 |
| Success Criteria | 0.75 | 25% | 0.188 |
| Context Clarity | 0.85 | 15% | 0.128 |
| **Total Clarity** | | | **0.830** |
| **Ambiguity** | | | **17.0%** |

## Goal

실시간 온체인 데이터 기반으로 DeFi 기회를 비방해 토스트 알림으로 유저에게 알려준다. 각 토스트에는 [직접 실행]과 [Agent 자동화] 두 CTA가 있어 Agent SaaS 구독을 유도한다. MVP에서는 결제 없이 토스트 UI + /agent 페이지 연결까지만 구현.

## 토스트 트리거 (3종)

### 1. APY 변동 감지
- 기존 hooks(useAaveMarkets, useMorphoMarkets)에서 APY 폴링 (15초)
- APY가 이전 대비 2%p 이상 상승 시 토스트
- 예: "Aave wCTC Supply APY 10.2%↑ — 지금 공급하면 $500/년 수익 가능"

### 2. 유저 자산 기반 추천
- 유저 지갑 잔고 읽기 (useTokenBalance)
- 유휴 자산이 $100 이상이면 맞춤 추천 토스트
- 예: "wCTC 1,000개 보유 중 → Aave Supply로 7% APY 가능"
- 로그인 시 1회 + 이후 비활성 자산 변동 시

### 3. 신규 인센티브 생성
- Staker의 IncentiveCreated 이벤트 감지 (또는 폴링)
- 예: "새 LP 인센티브 생성! wCTC/USDC Pool — 추가 보상 시작"

## 토스트 UI

```
┌────────────────────────────────────┐
│ 📈 Aave wCTC Supply APY 10.2%↑     │
│ 지금 공급하면 $500/년 수익 가능      │
│                                    │
│ [직접 실행]  [Agent 자동화 →]        │
└────────────────────────────────────┘
```

- 위치: 페이지 하단 우측 (sonner 기본 위치)
- 스타일: bg-card, border-ice-400, ice-blue accent
- [직접 실행]: 해당 프로토콜 페이지로 이동 (예: /aave/supply)
- [Agent 자동화 →]: /agent 페이지로 이동 (MVP, 결제는 Phase 2)
- [X] 닫기 버튼 → 24시간 동일 알림 안 뜸

## 빈도 제한 정책
- 하루 최대 3개 토스트
- 동일 기회 24시간 내 재알림 없음
- 디스미스한 기회 24시간 억제
- localStorage에 상태 저장

## Constraints
- 프론트엔드 전용 (hook + 컴포넌트)
- 기존 읽기 hooks 재사용
- 기존 sonner Toaster 인프라 활용 (또는 커스텀 토스트)
- 비방해 UX: 하단 작은 토스트, 빈도 제한
- MVP에서 결제 없음 — [Agent 자동화] → /agent 링크만

## Non-Goals
- X402 온체인 결제 — Phase 2
- Stripe 결제 통합 — Phase 2
- Agent 자동 실행 구독 관리 — Phase 2
- 알림 설정 커스터마이징 (임계값 변경) — Phase 2
- Push notification / 이메일 알림 — Phase 3

## Acceptance Criteria
- [ ] APY 2%p+ 상승 시 토스트 표시됨
- [ ] 유저 유휴 자산($100+) 기반 추천 토스트 표시됨
- [ ] 토스트에 [직접 실행] + [Agent 자동화 →] 버튼 2개 존재
- [ ] [직접 실행] 클릭 → 해당 프로토콜 페이지 이동
- [ ] [Agent 자동화 →] 클릭 → /agent 페이지 이동
- [ ] 하루 최대 3개 토스트 (localStorage 기반)
- [ ] 디스미스 후 24시간 동일 알림 억제
- [ ] 토스트 디자인이 ice-blue 테마와 일관
- [ ] 모바일에서도 정상 표시

## Technical Context

### 새로 만들 파일
- `shared/hooks/useOpportunityDetector.ts` — APY 변동 + 자산 기반 + 인센티브 감지
- `shared/components/OpportunityToast.tsx` — 커스텀 토스트 컴포넌트 (sonner 확장)
- `shared/lib/opportunityStorage.ts` — localStorage 기반 빈도 제한/디스미스 관리
- `app/layout.tsx` 수정 — OpportunityDetector 마운트

### 기존 활용
- `useMorphoMarkets()`, `useAaveMarkets()` — APY 데이터
- `useTokenBalance()` — 유저 자산 잔고
- `sonner` Toaster — 토스트 인프라
- `TOKEN_INFO` — 토큰 가격/심볼

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| OpportunityToast | core | type, title, description, actions[], tokenAddress | Shown to user |
| OpportunityTrigger | core | type (apy/asset/incentive), threshold, data | Generates OpportunityToast |
| FrequencyLimit | supporting | maxPerDay, cooldownHours, dismissedIds | Controls toast frequency |
| AgentCTA | CTA | label, href, price? | Links to Agent SaaS |
| DirectCTA | CTA | label, href, protocol | Links to protocol page |

## Interview Transcript
<details>
<summary>Full Q&A (8 rounds)</summary>

### Round 1
**Q:** 배너와 에이전트 SaaS — 어떻게 연결?
**A:** 배너가 에이전트 SaaS를 홍보
**Ambiguity:** 63.0%

### Round 2
**Q:** SaaS 과금 모델?
**A:** 월 구독 + X402 성과 기반
**Ambiguity:** 55.0%

### Round 3
**Q:** 배너 UI 형태?
**A:** 토스트/팝업 알림
**Ambiguity:** 48.8%

### Round 4
**Q:** 토스트 트리거 조건?
**A:** 복합 (APY 변동 + 자산 기반 + 신규 인센티브)
**Ambiguity:** 39.5%

### Round 5 (Contrarian)
**Q:** 유저를 방해하지 않으려면?
**A:** 비방해 토스트 + 빈도 제한
**Ambiguity:** 33.1%

### Round 6
**Q:** Agent SaaS CTA 구체적 형태?
**A:** 토스트 내 [직접 실행] + [Agent 자동화 $29/mo] 버튼
**Ambiguity:** 25.2%

### Round 7
**Q:** X402 결제 MVP 범위?
**A:** X402 온체인 결제 포함
**Ambiguity:** 22.0%

### Round 8
**Q:** MVP에서 실제로 어디까지?
**A:** 배너 + 토스트만 MVP. X402는 Phase 2
**Ambiguity:** 17.0% — PASSED
</details>
