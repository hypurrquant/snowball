# DoD (Definition of Done) - v0.22.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | Morpho 볼트 3개(sbUSD, wCTC, USDC)에 Est. APY가 `"X.XX%"` 형태로 표시됨 | 브라우저에서 /yield 접속 → 3개 Morpho VaultCard에 APY 숫자 확인 |
| F2 | StabilityPool 볼트에 `"Variable"` 텍스트가 APY 위치에 표시됨 | 브라우저에서 /yield 접속 → StabilityPool VaultCard 확인 |
| F3 | VaultCard의 TVL 옆에 USD 환산 금액이 병행 표시됨 | 브라우저에서 /yield 접속 → 4개 VaultCard에서 `(~$X.XX)` 형태 USD 표시 확인 |
| F4 | 페이지 상단 Total Deposits StatCard가 USD 합산 금액을 표시함 (이종 토큰 합산) | 브라우저에서 /yield 접속 → Total Deposits 값이 `$X,XXX.XX` 형태인지 확인 |
| F5 | Deposit 시 잔고 초과 입력하면 "Insufficient balance" 에러 표시 + 버튼 비활성화 | VaultActionDialog → Deposit 탭에서 잔고보다 큰 값 입력 → 에러 메시지 + 버튼 disabled 확인 |
| F6 | Withdraw 시 share 초과 입력하면 "Exceeds shares" 에러 표시 + 버튼 비활성화 | VaultActionDialog → Withdraw 탭에서 보유 share보다 큰 값 입력 → 에러 메시지 + 버튼 disabled 확인 |
| F7 | 비숫자 입력(예: "abc") 시 "Invalid amount" 에러 표시 + 버튼 비활성화 | VaultActionDialog에서 "abc" 입력 → parseEther 크래시 없이 에러 메시지 표시 |
| F8 | Withdraw Max 클릭 시 `withdrawAll()` 컨트랙트 함수가 호출됨 | Max 클릭 → Withdraw 버튼 → TX 성공 후 Blockscout에서 TX input의 function selector가 `withdrawAll()` (`0x853828b6`)인지 확인 |
| F9 | Withdraw Max 클릭 후 금액을 수동 수정하면 일반 `withdraw(uint256)` 함수가 호출됨 | Max 클릭 → 금액 수정 → Withdraw 버튼 → TX 성공 후 Blockscout에서 TX input의 function selector가 `withdraw(uint256)` (`0x2e1a7d4d`)인지 확인 |
| F10 | VaultCard 로딩 시 Skeleton 애니메이션이 표시됨 | 브라우저에서 /yield 새로고침 → 데이터 도착 전 Skeleton 표시 확인 |
| F11 | StatCard 3개 로딩 시 Skeleton이 표시됨 ("..." 대신) | 브라우저에서 /yield 새로고침 → StatCard에 Skeleton 표시 확인 |
| F12 | `morphoMath.ts`가 `shared/lib/`에 위치하고, Morpho + Yield 두 도메인에서 모두 import 가능 | `grep -r "morphoMath" apps/web/src/` → 모든 import가 `@/shared/lib/morphoMath` 경로 |
| F13 | addresses.ts YIELD 설정에 `strategyType`과 `morphoMarketId` 필드가 존재하고, wCTC 마켓 값이 정확함 | addresses.ts에서 (1) 4개 볼트에 strategyType 존재, (2) Morpho 3개에 morphoMarketId 존재, (3) wCTC의 morphoMarketId가 `0xdb8d70912f854011992e1314b9c0837bf14e7314dccb160584e3b7d24d20f6bd`인지 확인, (4) sbUSD/USDC의 morphoMarketId가 LEND.markets의 id와 일치하는지 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `cd apps/web && npx tsc --noEmit` 종료코드 0 |
| N2 | 빌드 성공 | `cd apps/web && npm run build` 종료코드 0 |
| N3 | DDD 계층 위반 없음 — yield 도메인이 shared/core 외 다른 도메인을 import하지 않음 | `grep -rn "@/domains/" apps/web/src/domains/defi/yield/` 실행 → `@/domains/defi/yield/` 자기 자신 외의 `@/domains/` import가 0건 |
| N4 | useYieldVaults 훅 코드가 이번 Phase에서 변경되지 않음 | `git diff 379cb38..HEAD -- apps/web/src/domains/defi/yield/hooks/useYieldVaults.ts` → diff 없음 (379cb38 = Phase 시작 직전 커밋) |
| N5 | ApyState discriminated union 사용 — `number | null | undefined` 패턴 아님 | `useYieldVaultAPY.ts`에서 반환 타입이 `Record<Address, ApyState>`이고 ApyState가 `{ kind: "loading" | "variable" | "ready" | "error" }` 형태인지 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 온체인 APY 조회 실패 (RPC 에러) | VaultCard APY 위치에 `"—"` 표시 (ApyState `error`) | DevTools Network 탭에서 RPC 요청을 block한 후 /yield 접속 → Morpho VaultCard APY 영역에 "—" 표시 확인 |
| E2 | Morpho 마켓 유동성 0 (totalSupply=0) | utilization=0, APY=0.00% 표시 | 현재 테스트넷 wCTC loan market에 유동성이 0이므로 해당 볼트에서 APY "0.00%" 확인. 유동성이 있으면 콘솔에서 `utilization(0n, 0n)` 호출 결과가 0인지 확인 |
| E3 | 지갑 미연결 상태 | (1) APY/TVL/USD 정상 표시, (2) Your Deposit은 "0.00", (3) Deposit 버튼 비활성화 (isConnected 체크), (4) Withdraw 버튼 비활성화 | 지갑 연결 해제 → /yield 접속 → (1) APY 숫자 확인 (2) Your Deposit 0.00 확인 (3) Deposit 버튼 disabled 확인 (4) Withdraw 버튼 disabled 확인 |
| E4 | TVL > 1,000 토큰 | USD 환산이 NaN이 아닌 정상 숫자 | 시뮬레이션 계정으로 1000+ 토큰을 deposit → /yield에서 USD 값이 숫자인지 확인. 또는 콘솔에서 `Number(formatUnits(parseEther("1234"), 18))` 결과가 NaN이 아닌지 확인 |
| E5 | 빈 입력("") 상태에서 Deposit/Withdraw 버튼 | 버튼이 disabled 상태, 에러 메시지 없음 (빈 입력은 에러가 아닌 초기 상태) | VaultActionDialog 열기 → 아무것도 입력하지 않은 상태에서 버튼 disabled + 에러 메시지 없음 확인 |
| E6 | 매우 작은 금액 입력 (0.000000000000000001 = 1 wei) | parseEther 성공, 버튼 활성화, TX 제출 가능 | VaultActionDialog에서 "0.000000000000000001" 입력 → 버튼 활성화 확인 → 실제 Deposit TX 제출 → Blockscout에서 TX 확인 |
| E7 | APY 로딩과 vault data 로딩 타이밍 차이 | vault data 먼저 표시 + APY 영역만 Skeleton → APY 도착 시 값 전환 | DevTools Network 탭에서 RPC 응답을 throttle → /yield 새로고침 → TVL 등 vault 데이터가 먼저 나타나고 APY 영역만 Skeleton 유지되다가 해소되는지 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. Est. APY 표시 | F1, F2, E1, E2 | ✅ |
| 2. USD 환산 병행 표시 | F3, F4, E4 | ✅ |
| 3. 입력 검증 | F5, F6, F7, E5, E6 | ✅ |
| 4. 로딩 스켈레톤 | F10, F11, E7 | ✅ |
| 5. withdrawAll | F8, F9 | ✅ |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| TD-1: morphoMath shared 승격 | F12, N3 | ✅ |
| TD-2: strategyType + morphoMarketId | F13 | ✅ |
| TD-3: ApyState union | N5, E1, E7 | ✅ |
| TD-4: useYieldVaultAPY 훅 | F1, F2 | ✅ |
| TD-5: formatUnits USD 환산 | F3, F4, E4 | ✅ |
| TD-6: VaultCard props 확장 | F3, F10 | ✅ |
