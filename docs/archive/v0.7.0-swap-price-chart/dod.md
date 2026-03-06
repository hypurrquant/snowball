# DoD (Definition of Done) - v0.7.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | /swap 페이지가 데스크탑(1024px+)에서 2컬럼 Grid 레이아웃으로 표시됨 (좌: 차트, 우: 스왑) | 브라우저 1280px 너비에서 /swap 접속, 좌우 배치 확인 |
| F2 | Recharts AreaChart로 토큰 쌍의 ~1개월 가격 추이가 표시됨 (gradient fill + Ice Blue 선) | /swap 접속 시 차트 영역에 Area Chart 렌더링 확인 |
| F3 | 차트 헤더에 현재 토큰 쌍 이름(예: "wCTC / sbUSD")과 현재가, 변동률이 표시됨 | 차트 상단 텍스트 확인 |
| F4 | TokenSelector에서 토큰 변경 시 차트가 해당 쌍의 데이터로 즉시 갱신됨 | wCTC/sbUSD → wCTC/USDC로 변경, 차트 데이터 변경 확인 |
| F5 | flip 버튼 클릭 시 차트가 역방향 가격(1/price)으로 갱신됨 | flip 후 차트의 Y축 값이 역수로 변경 확인 |
| F6 | 차트 hover 시 해당 날짜의 가격을 tooltip으로 표시 | 차트 위에 마우스 hover, tooltip 팝업 확인 |
| F7 | 모바일(<1024px)에서 차트가 위, 스왑 카드가 아래로 세로 스택됨 | 브라우저 375px 너비에서 /swap 접속, 세로 배치 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `npx tsc --noEmit` |
| N2 | 린트 통과 | `npm run lint` |
| N3 | 빌드 성공 | `npm run build` |
| N4 | 기존 스왑 기능(토큰 선택, 금액 입력, approve, swap)이 정상 동작 | 기존 스왑 플로우 수동 테스트 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | tokenIn === tokenOut (동일 토큰 선택) | 차트 대신 "Select a different pair" placeholder 표시 | 양쪽 TokenSelector에서 동일 토큰 선택 |
| E2 | mock 데이터에 없는 토큰 쌍 | 빈 차트 or "No data available" placeholder | 해당 쌍 데이터 제거 후 확인 |
| E3 | 브라우저 리사이즈 (데스크탑 ↔ 모바일) | 레이아웃이 반응형으로 전환, 차트가 새 크기에 맞게 리사이즈 | 브라우저 너비를 1024px 전후로 조절 |

## 커버리지 매핑

### PRD 목표 → DoD

| PRD 목표 | DoD 항목 |
|----------|---------|
| 2컬럼 레이아웃 변경 | F1, F7 |
| Recharts Area Chart 표시 | F2, F6 |
| ~1개월 mock 데이터 시각화 | F2 |
| 토큰 쌍 따라 차트 동적 변경 | F3, F4, F5 |
| 반응형 레이아웃 | F1, F7, E3 |

### 설계 결정 → DoD

| 설계 결정 | DoD 반영 |
|----------|---------|
| CSS Grid 12칼럼 7:5 비율 | F1, F7 |
| Recharts AreaChart + linearGradient | F2 |
| mock 데이터 + getPriceData 유틸 | F4, F5, E1, E2 |
| trade 도메인 PriceChart 컴포넌트 | N1, N2, N3 |
