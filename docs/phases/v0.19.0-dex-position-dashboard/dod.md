# DoD (Definition of Done) - v0.19.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `/pool/positions` 페이지가 존재하고 접근 가능 | 브라우저에서 `/pool/positions` 접속 확인 |
| F2 | 지갑 연결 시 사용자의 Open LP 포지션(liquidity > 0)이 목록으로 표시됨 | 테스트넷에서 LP 생성 후 페이지 확인 |
| F3 | 각 포지션 카드에 풀 페어(토큰 심볼), Fee tier, 유동성 크기(USD)가 표시됨 | 포지션 카드 렌더링 수동 확인 |
| F4 | 각 포지션에 In Range / Out of Range 상태가 badge로 표시됨 | currentTick 기준으로 tickLower <= currentTick < tickUpper 판정 결과와 UI 일치 확인 |
| F5 | 각 포지션에 미수령 수수료(tokensOwed0, tokensOwed1)가 표시됨 | positions() 호출 결과의 tokensOwed 값과 UI 표시 값 일치 확인 |
| F6 | 상단에 LP Portfolio 요약 표시: Total Net Value(USD), Active Positions 수, Total Uncollected Fees(USD) | StatCard 3개 렌더링 + 값이 개별 포지션 합계와 일치 확인 |
| F7 | Total Net Value는 CreditcoinOracle price() 기반 USD 환산 (오라클 없는 토큰은 TOKEN_INFO.mockPriceUsd fallback) | 오라클 가격(1e36 스케일) / 1e36 × amount 계산이 UI 값과 일치 확인 |
| F8 | 각 포지션 카드에 Manage 버튼이 있고, 클릭 시 해당 풀 상세 페이지(`/pool/{token0}-{token1}`)로 이동 | Manage 버튼 클릭 후 라우팅 확인 |
| F9 | `/pool` 페이지에 MyPositionsBanner가 표시되고, balanceOf > 0일 때 "You have N active LP positions [View All]" 형태로 렌더링됨 | 지갑 연결 + LP 존재 시 배너 표시 확인 |
| F10 | MyPositionsBanner의 "View All" 클릭 시 `/pool/positions`로 이동 | 클릭 후 라우팅 확인 |
| F11 | positionCount는 balanceOf의 **전체 개수** 반영, 목록은 최대 20개(인덱스 0~19) 표시. 20개 초과 시 "최대 20개만 표시" 안내 문구 | balanceOf > 20인 경우 안내 문구 렌더링 확인 (테스트넷에서 재현 어려울 수 있음 — 코드 리뷰로 대체) |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `cd apps/web && npx tsc --noEmit` |
| N2 | 린트 통과 | `cd apps/web && pnpm lint` |
| N3 | 빌드 성공 | `cd apps/web && pnpm build` |
| N4 | `getPositionAmounts()` 순수 함수가 정확한 Uniswap V3 수식을 구현 | 코드 리뷰: known tick/liquidity 입력에 대해 수동 계산과 대조 |
| N5 | DDD 4계층 구조 준수: hook → `domains/trade/hooks/`, 컴포넌트 → `domains/trade/components/`, 페이지 → `app/(trade)/` | 파일 경로 검증 (코드 리뷰) |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 지갑 미연결 | "Connect your wallet to view positions" 안내 표시 | 지갑 미연결 상태에서 `/pool/positions` 접속 |
| E2 | 지갑 연결 + 포지션 0개 | "No active positions" 빈 상태 + "New Position" CTA 링크 표시 | LP 없는 지갑으로 접속 |
| E3 | TOKEN_INFO에 없는 토큰이 포함된 포지션 | symbol "???" 표시, mockPriceUsd 0으로 처리 (USD에서 해당 토큰 금액 제외) | 코드 리뷰 (테스트넷에서 재현 어려움) |
| E4 | 지갑 연결 + Pool 페이지에서 balanceOf = 0 | MyPositionsBanner 미표시 | LP 없는 지갑으로 `/pool` 접속 |
| E5 | 오라클이 없는 토큰 (예: USDC) | TOKEN_INFO.mockPriceUsd fallback 사용 | 코드 리뷰: LEND.oracles에 없는 토큰 주소일 때 fallback 경로 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 |
|----------|---------|
| Open LP 포지션 조회 | F1, F2 |
| 핵심 지표 표시 (페어, 유동성, In/Out Range, 수수료) | F3, F4, F5 |
| 포지션 관리 진입점 | F8, F10 |
| Total Net Value (Oracle 기반 USD) | F6, F7 |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 |
|----------|---------|
| Hybrid (배너 + 전용 페이지) | F1, F9, F10 |
| 6-phase waterfall fetch | F2 (포지션 열거 동작) |
| In/Out Range: tickLower <= currentTick < tickUpper | F4 |
| tokensOwed만 사용 | F5 |
| Oracle 우선 + mockPriceUsd fallback | F7, E5 |
| 최대 20개 (인덱스 0~19) | F11 |
| getPositionAmounts() 순수 함수 | N4 |
