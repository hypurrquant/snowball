# DoD (Definition of Done) - v0.13.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | Token0 입력 시 tick coefficient 기반으로 Token1 값이 자동 계산됨. Fixture: `currentTick=0, tickLower=-600, tickUpper=600, input0="100"` → Token1 = `100 * (c1/c0)` (허용 오차 ±0.1%) | 단위 테스트 + 브라우저 수동 확인 |
| F2 | Token1 입력 시 Token0 값이 자동 계산됨. 동일 fixture에서 `input1="100"` → Token0 = `100 * (c0/c1)` (허용 오차 ±0.1%) | 단위 테스트 + 브라우저 수동 확인 |
| F3 | Max 버튼 클릭 시 `L = min(balance0/c0, balance1/c1)` 기반 양쪽 금액 자동 채움. Fixture: `balance0=1000e18, balance1=500e18, tick=0, range=[-600,600]` → 어느 쪽도 잔고 초과하지 않고, L 기반 정확 계산 (허용 오차 ±0.1%) | 단위 테스트 (`calcMaxAmountsFromBalances`) + 브라우저 수동 확인 |
| F4 | Half 버튼 클릭 시 해당 토큰 잔고의 50%가 입력되고, paired 토큰은 ratio 기반 자동 계산됨 | 브라우저에서 Half0 클릭 → Token0 = balance0/2 표시, Token1 자동 계산 확인 |
| F5 | Out-of-range below (currentTick < tickLower): Token1 input의 disabled 속성 true + 표시값 "0", Token0만 입력 가능 | 브라우저에서 range를 current price 위로 설정 → Token1 input disabled DOM 속성 확인 |
| F6 | Out-of-range above (currentTick >= tickUpper): Token0 input의 disabled 속성 true + 표시값 "0", Token1만 입력 가능 | 브라우저에서 range를 current price 아래로 설정 → Token0 input disabled DOM 속성 확인 |
| F7 | Range 변경 시 anchor 토큰(lastEditedToken) 기준 재계산. Fixture: `input0="100"` 입력 후 range를 `[-1200, 1200]`으로 변경 → Token0=100 유지, Token1은 새 coefficient 기반 재계산 (허용 오차 ±0.1%) | 브라우저 수동 확인 |
| F8 | Token0에 잔고 비율 대비 과도한 값 입력 시, 양쪽 표시 금액이 각각의 잔고 이하로 자동 축소됨. Fixture: `balance0=1000, balance1=10`, Token0에 900 입력 → 양쪽 표시값 모두 각 토큰 잔고 이하 | 브라우저 수동 확인: Token0에 큰 값 입력 → Token0 ≤ 1000, Token1 ≤ 10 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `npx tsc --noEmit` 실행 후 에러 0건 |
| N2 | `calcCoefficients`, `calcOtherTokenAmount`, `calcMaxAmountsFromBalances` 단위 테스트 통과 | `npx tsx packages/core/src/dex/tokenAllocation.test.ts` (assert 기반 스크립트, vitest 불필요) |
| N3 | Pure math 함수는 `packages/core/src/dex/tokenAllocation.ts`에 위치하며 React 의존성 없음 | `grep -r "from.*react" packages/core/src/dex/tokenAllocation.ts` 결과 0건 |
| N4 | Hook은 `apps/web/src/domains/trade/hooks/useSmartDeposit.ts`에 위치 | `ls apps/web/src/domains/trade/hooks/useSmartDeposit.ts` 성공 |
| N5 | web에서 core 함수 import 시 `@/core/dex/tokenAllocation` shim 경유 | `cat apps/web/src/core/dex/tokenAllocation.ts` → re-export 확인 + `grep "from.*@/core/dex/tokenAllocation" apps/web/src/domains/trade/hooks/useSmartDeposit.ts` 결과 1건 이상 |
| N6 | 금액 변환에 `parseTokenAmount(value, decimals)` 사용, `parseEther` 미사용 | `grep "parseEther" apps/web/src/domains/trade/hooks/useSmartDeposit.ts` 결과 0건 |
| N7 | 웹 빌드 성공 | `cd apps/web && npm run build` 에러 0건 |
| N8 | 웹 린트 통과 | `cd apps/web && npm run lint` 에러 0건 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | currentTick 미로딩 (pool 데이터 로딩 중) | coeff = null → 양쪽 input disabled | 브라우저: pool 로딩 중 입력 불가 확인 |
| E2 | 잔고 0인 토큰으로 Max 클릭 | 양쪽 모두 input "0" 유지 | 브라우저: balance 0 상태에서 Max → "0" 확인 |
| E3 | out-of-range → in-range 복귀 | 양쪽 모두 input "0" 표시, lastEditedToken = null (설계 design.md:37과 일치) | 브라우저: range 변경 후 양쪽 "0" 표시 확인 |
| E4 | 빈 문자열/비숫자 입력 ("abc", "") | raw amount = 0n (내부), input 표시값은 사용자 입력 그대로 유지, paired 토큰 = "0" | 브라우저: "abc" 입력 → paired 토큰 "0", 에러 없음 |
| E5 | 큰 tick 값 (±800,000) | `isFinite(coefficient)` false → coeff null 처리, 입력 비활성화 | 단위 테스트: `calcCoefficients(800000, 790000, 810000)` → coefficient 유효성 체크 |
| E6 | tickLower >= tickUpper (zero/negative-width range) | UI에서 발생 불가 (PriceRangeSelector가 방지). 방어적으로 calcCoefficients에서 null 반환 → 입력 비활성화 | 단위 테스트: `calcCoefficients(0, 600, 600)` → null 확인 |

## PRD 목표 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 양방향 금액 자동계산 | F1, F2 | ✅ |
| Max Mint | F3 | ✅ |
| Out-of-range 처리 | F5, F6 | ✅ |
| Range 변경 시 재계산 | F7 | ✅ |

## 설계 결정 커버리지

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| Number 타입 coefficient | N2 (단위 테스트), E5 (overflow) | ✅ |
| lastEditedToken anchor | F7 | ✅ |
| out-of-range → disabled + 0 + null | F5, F6, E3 | ✅ |
| range 복귀 → 빈 상태 | E3 | ✅ |
| Max → calcMaxAmountsFromBalances | F3 | ✅ |
| Half → 기존 의미 + paired | F4 | ✅ |
| import shim 경유 | N5 | ✅ |
| parseTokenAmount (decimals-aware) | N6 | ✅ |
