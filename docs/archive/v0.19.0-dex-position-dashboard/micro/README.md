# 작업 티켓 - v0.19.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | getPositionAmounts 순수 함수 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | useUserPositions hook | 🔴 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | PositionCard 컴포넌트 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | LPPortfolioSummary 컴포넌트 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | /pool/positions 페이지 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 06 | MyPositionsBanner + Pool 수정 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 → 02 → 03 (병렬 가능)
          → 04 (병렬 가능)
     03,04 → 05 → 06
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| Open LP 포지션 조회 | Step 02, 05 | ✅ |
| 핵심 지표 표시 (페어, 유동성, In/Out Range, 수수료) | Step 01, 02, 03 | ✅ |
| 포지션 관리 진입점 | Step 03 (Manage 버튼), 06 (배너 View All) | ✅ |
| Total Net Value (Oracle 기반 USD) | Step 02 (가격 조회), 04 (요약 UI) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: /pool/positions 접근 가능 | Step 05 | ✅ |
| F2: Open LP 포지션 목록 표시 | Step 02, 05 | ✅ |
| F3: 풀 페어, Fee tier, 유동성 USD | Step 03 | ✅ |
| F4: In/Out of Range badge | Step 02 (isInRange), 03 (badge) | ✅ |
| F5: tokensOwed 표시 | Step 02 (데이터), 03 (UI) | ✅ |
| F6: Portfolio 요약 StatCard 3개 | Step 04, 05 | ✅ |
| F7: Oracle 기반 USD 환산 | Step 02 (Phase 6 oracle fetch) | ✅ |
| F8: Manage 버튼 → 풀 상세 | Step 03 | ✅ |
| F9: MyPositionsBanner 표시 | Step 06 | ✅ |
| F10: View All → /pool/positions | Step 06 | ✅ |
| F11: positionCount 전체, 목록 최대 20개 | Step 02, 05 | ✅ |
| N1: tsc --noEmit 통과 | 전체 (빌드 검증) | ✅ |
| N2: lint 통과 | 전체 | ✅ |
| N3: build 성공 | 전체 | ✅ |
| N4: getPositionAmounts 수식 정확성 | Step 01 | ✅ |
| N5: DDD 4계층 구조 준수 | 전체 (파일 경로) | ✅ |
| E1: 지갑 미연결 | Step 05 | ✅ |
| E2: 포지션 0개 | Step 05 | ✅ |
| E3: 미지 토큰 | Step 02, 03 | ✅ |
| E4: Pool 페이지 balanceOf=0 | Step 06 | ✅ |
| E5: 오라클 없는 토큰 fallback | Step 02 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| Hybrid (배너 + 전용 페이지) | Step 05, 06 | ✅ |
| 6-phase waterfall fetch | Step 02 | ✅ |
| In/Out Range: tickLower <= tick < tickUpper | Step 02 | ✅ |
| tokensOwed만 사용 | Step 02 | ✅ |
| Oracle 우선 + mockPriceUsd fallback | Step 02 | ✅ |
| 최대 20개 (인덱스 0~19) | Step 02, 05 | ✅ |
| getPositionAmounts 순수 함수 | Step 01 | ✅ |

## Step 상세
- [Step 01: getPositionAmounts 순수 함수](step-01-position-amounts.md)
- [Step 02: useUserPositions hook](step-02-user-positions-hook.md)
- [Step 03: PositionCard 컴포넌트](step-03-position-card.md)
- [Step 04: LPPortfolioSummary 컴포넌트](step-04-portfolio-summary.md)
- [Step 05: /pool/positions 페이지](step-05-positions-page.md)
- [Step 06: MyPositionsBanner + Pool 수정](step-06-banner.md)
