# v0.13.1 Micro Steps

## 티켓 현황

| Step | 설명 | 의존성 | 상태 |
|------|------|--------|------|
| 01 | Slider 컴포넌트 생성 | 없음 | ⏳ |
| 02 | usePositionPreview + useMarketRateStats 훅 | 없음 | ⏳ |
| 03 | Open Trove 다이얼로그 리디자인 | 01, 02 | ⏳ |

## 커버리지 매트릭스

| PRD 목표 | DoD | 티켓 |
|----------|-----|------|
| Interest Rate 슬라이더 | F-1 | Step 01 + 03 |
| Position Summary | F-2 | Step 02 + 03 |
| HALF/MAX/SAFE 버튼 | F-3 | Step 03 |
| 시장 이율 통계 | F-4 | Step 02 + 03 |
| 엣지케이스 | E-1~4 | Step 03 |
