# 작업 티켓 - v0.7.0 Swap 가격 차트

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | Mock 가격 데이터 생성 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | PriceChart 컴포넌트 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | Swap 페이지 레이아웃 변경 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (mock 데이터) → 02 (PriceChart) → 03 (레이아웃 변경)
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 2컬럼 레이아웃 변경 | Step 03 | ✅ |
| Recharts Area Chart 표시 | Step 02 | ✅ |
| ~1개월 mock 데이터 시각화 | Step 01, 02 | ✅ |
| 토큰 쌍 따라 차트 동적 변경 | Step 01 (유틸), 02 (렌더), 03 (연동) | ✅ |
| 반응형 레이아웃 | Step 03 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: 데스크탑 2컬럼 Grid | Step 03 | ✅ |
| F2: AreaChart + gradient fill | Step 02 | ✅ |
| F3: 차트 헤더 (쌍 이름 + 현재가 + 변동률) | Step 02 | ✅ |
| F4: 토큰 변경 시 차트 즉시 갱신 | Step 01 (데이터), 03 (props 전달) | ✅ |
| F5: flip 시 역방향 가격 | Step 01 (1/price), 03 (props 전달) | ✅ |
| F6: hover tooltip | Step 02 | ✅ |
| F7: 모바일 세로 스택 | Step 03 | ✅ |
| N1: TypeScript strict 에러 0 | Step 01, 02, 03 각각 | ✅ |
| N2: 린트 통과 | Step 03 최종 | ✅ |
| N3: 빌드 성공 | Step 03 최종 | ✅ |
| N4: 기존 스왑 기능 정상 | Step 03 | ✅ |
| E1: 동일 토큰 placeholder | Step 01 (빈 배열), 02 (placeholder UI) | ✅ |
| E2: 데이터 없는 쌍 | Step 02 (placeholder UI) | ✅ |
| E3: 브라우저 리사이즈 | Step 02 (ResponsiveContainer), 03 (Grid) | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| CSS Grid 12칼럼 7:5 비율 | Step 03 | ✅ |
| Recharts AreaChart + linearGradient | Step 02 | ✅ |
| mock 데이터 + getPriceData 유틸 | Step 01 | ✅ |
| trade 도메인 배치 | Step 01, 02 | ✅ |

## Step 상세
- [Step 01: Mock 가격 데이터 생성](step-01-mock-data.md)
- [Step 02: PriceChart 컴포넌트](step-02-price-chart.md)
- [Step 03: Swap 페이지 레이아웃 변경](step-03-layout.md)
