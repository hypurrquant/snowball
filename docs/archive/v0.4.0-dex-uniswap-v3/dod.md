# DoD (Definition of Done) - v0.4.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `dex.ts`에서 `UniswapV3FactoryABI`가 `getPool(address,address,uint24)→address` 와 `createPool(address,address,uint24)→address` 시그니처를 포함 | `grep -c "getPool\|createPool" apps/web/src/abis/dex.ts` → 2 |
| F2 | `dex.ts`에서 `UniswapV3PoolABI`가 `slot0()` 함수를 포함하고 7개 반환값 (`sqrtPriceX96`, `tick`, `observationIndex`, `observationCardinality`, `observationCardinalityNext`, `feeProtocol`, `unlocked`) 정의 | 수동 확인: dex.ts에서 `slot0` 함수 outputs 배열 길이 7, 각 이름/타입 일치 |
| F3 | `dex.ts`에서 `UniswapV3PoolABI`가 `fee()→uint24` 함수를 포함 (독립 함수, ABI entry의 `name: "fee"`, `outputs: [{ type: "uint24" }]`) | 수동 확인: dex.ts에서 `{ type: "function", name: "fee", ... outputs: [{ type: "uint24" }] }` 존재 |
| F4 | `dex.ts`에서 `SwapRouterABI.exactInputSingle` params에 `deployer` 없고 `fee`(uint24) + `sqrtPriceLimitX96`(uint160) 포함 | 수동 확인: dex.ts exactInputSingle components 배열에 deployer 없음, fee와 sqrtPriceLimitX96 존재 |
| F5 | `dex.ts`에서 `QuoterV2ABI.quoteExactInputSingle` params에 `deployer` 없고 `fee`(uint24) + `sqrtPriceLimitX96` 포함, outputs 4개 (`amountOut`, `sqrtPriceX96After`, `initializedTicksCrossed`, `gasEstimate`) | 수동 확인: dex.ts quoteExactInputSingle outputs 배열 길이 4 + deployer 없음 |
| F6 | `dex.ts`에서 `NonfungiblePositionManagerABI.positions` outputs에 `deployer` 없고 `fee`(uint24) 포함, `nonce` 타입이 `uint96` | 수동 확인: dex.ts positions outputs에서 nonce type "uint96", fee type "uint24", deployer 없음 |
| F7 | `dex.ts`에서 `NonfungiblePositionManagerABI.mint` params에 `deployer` 없고 `fee`(uint24) 포함 | 수동 확인: dex.ts mint components 배열에 deployer 없음, fee 존재 |
| F8 | `dex.ts`에서 `DynamicFeePluginABI` export가 존재하지 않음 | `grep -c "DynamicFeePlugin" apps/web/src/abis/dex.ts` → 0 |
| F9 | `dex.ts`에서 `SnowballFactoryABI`, `SnowballPoolABI`, `SnowballRouterABI` export가 존재하지 않음 | `grep -c "Snowball" apps/web/src/abis/dex.ts` → 0 |
| F10 | `index.ts`에서 `UniswapV3FactoryABI`, `UniswapV3PoolABI`, `SwapRouterABI` re-export 존재하고, `DynamicFeePluginABI`와 `SnowballFactoryABI`/`SnowballPoolABI`/`SnowballRouterABI` re-export 없음 | `grep -c "UniswapV3FactoryABI\|UniswapV3PoolABI\|SwapRouterABI" apps/web/src/abis/index.ts` → 3, `grep -c "DynamicFeePlugin\|Snowball" apps/web/src/abis/index.ts` → 0 |
| F11 | `addresses.ts`의 DEX 섹션에서 `snowballPoolDeployer`, `dynamicFeePlugin` 필드 삭제됨 | `grep -c "snowballPoolDeployer\|dynamicFeePlugin" apps/web/src/config/addresses.ts` → 0 |
| F12 | `addresses.ts`의 DEX 섹션에서 `snowballFactory` → `factory`, `snowballRouter` → `swapRouter` 으로 변경됨 | `grep -c "snowballFactory\|snowballRouter" apps/web/src/config/addresses.ts` → 0, `grep -c "factory:\|swapRouter:" apps/web/src/config/addresses.ts` → 2 |
| F13 | `addresses.ts`의 DEX 주석이 `"Uniswap V3"`를 포함 | `grep -c "Uniswap V3" apps/web/src/config/addresses.ts` → 1+ |
| F14 | `usePool.ts`가 `UniswapV3FactoryABI.getPool` 호출 (fee 파라미터 포함), `poolByPair` 호출 없음 | `grep -c "getPool" apps/web/src/hooks/trade/usePool.ts` → 1+, `grep -c "poolByPair" apps/web/src/hooks/trade/usePool.ts` → 0 |
| F15 | `usePool.ts`가 `UniswapV3PoolABI.slot0` 호출, `globalState` 호출 없음 | `grep -c "slot0" apps/web/src/hooks/trade/usePool.ts` → 1+, `grep -c "globalState" apps/web/src/hooks/trade/usePool.ts` → 0 |
| F16 | `usePool.ts`에서 `DynamicFeePluginABI` import 없음, `DEX.dynamicFeePlugin` 참조 없음 | `grep -c "DynamicFeePlugin\|dynamicFeePlugin" apps/web/src/hooks/trade/usePool.ts` → 0 |
| F17 | `useSwap.ts`에서 `deployer` 참조 없음, `limitSqrtPrice` 참조 없음 | `grep -c "deployer\|limitSqrtPrice" apps/web/src/hooks/trade/useSwap.ts` → 0 |
| F18 | `useSwap.ts`에서 `sqrtPriceLimitX96` 사용하고 `fee` 파라미터를 quote/swap params에 전달 | `grep -c "sqrtPriceLimitX96" apps/web/src/hooks/trade/useSwap.ts` → 2 (quote + swap), 수동 확인: fee가 params에 포함 |
| F19 | `useSwap.ts`에서 `quoteData?.[5]` (Algebra fee 반환값) 참조 없음 | `grep -c "\[5\]" apps/web/src/hooks/trade/useSwap.ts` → 0 |
| F20 | `useSwap.ts`에서 `SwapRouterABI` import 존재, `SnowballRouterABI` import 없음 | `grep -c "SwapRouterABI" apps/web/src/hooks/trade/useSwap.ts` → 1+, `grep -c "SnowballRouterABI" apps/web/src/hooks/trade/useSwap.ts` → 0 |
| F21 | `useAddLiquidity.ts`에서 mint params의 `deployer` → `fee` 교체됨 | `grep -c "deployer" apps/web/src/hooks/trade/useAddLiquidity.ts` → 0, 수동 확인: mint args에 fee 필드 존재 |
| F22 | 문서에서 `Algebra` 텍스트 참조가 `docs/archive/`, `docs/phases/` 를 제외한 대상 문서에서 0건 (대상: `docs/guide/OPERATIONS.md`, `docs/ssot/DEPLOY_ADDRESSES_UPDATE.md`, `docs/security/SECURITY_AUDIT.md`, `docs/report/abi-audit.md`, `docs/design/DESIGN_TOKENOMICS_V2.md`, `docs/LAST_TASK.md`, `docs/INDEX.md`, `docs/CHANGELOG.md`) | `grep -l "Algebra" docs/guide/OPERATIONS.md docs/ssot/DEPLOY_ADDRESSES_UPDATE.md docs/security/SECURITY_AUDIT.md docs/report/abi-audit.md docs/design/DESIGN_TOKENOMICS_V2.md docs/LAST_TASK.md docs/INDEX.md docs/CHANGELOG.md` → 0 결과 |
| F23 | ABI 소스가 Uniswap V3 canonical 버전 기준: `@uniswap/v3-core@1.0.1` (Factory, Pool), `@uniswap/v3-periphery@1.4.4` (SwapRouter, QuoterV2, NonfungiblePositionManager) | dex.ts 주석에 소스 버전 명시 확인 + 시그니처가 GitHub 소스와 일치하는지 수동 교차 검증 |
| F24 | `addresses.ts`의 DEX 주소 값이 기존과 동일 (factory: `0xd478...`, swapRouter: `0xd604...`, nonfungiblePositionManager: `0x54b8...`, quoterV2: `0xeb2b...`) | `git diff apps/web/src/config/addresses.ts` 에서 주소 hex 값 변경 없음 확인 (필드 이름만 변경) |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 (`apps/web` 범위) | `cd apps/web && npx tsc --noEmit` exit code 0 |
| N2 | Next.js 빌드 성공 (`apps/web` 범위) | `cd apps/web && npx next build` exit code 0 |
| N3 | Algebra 관련 import가 프로젝트 전체에서 0건 (`SnowballFactoryABI`, `SnowballPoolABI`, `SnowballRouterABI`, `DynamicFeePluginABI`) | `grep -r "SnowballFactory\|SnowballPool\|SnowballRouter\|DynamicFeePlugin" apps/` → 0 |
| N4 | `DEX.snowballPoolDeployer`, `DEX.snowballFactory`, `DEX.snowballRouter`, `DEX.dynamicFeePlugin` 참조가 전체 코드에서 0건 | `grep -r "snowballPoolDeployer\|snowballFactory\|snowballRouter\|dynamicFeePlugin" apps/` → 0 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | `useSwap`에서 `fee` 파라미터 없이 호출 시 | hook 시그니처에 `fee` 파라미터 기본값 `3000` (number) 설정. viem이 uint24를 number로 매핑하므로 BigInt 변환 불필요 | 수동 확인: `useSwap` 함수 시그니처에서 `fee: number = 3000` 확인 |
| E2 | `usePool`에서 `fee` 파라미터 없이 호출 시 | hook 시그니처에 `fee` 파라미터 기본값 `3000` (number) 설정 | 수동 확인: `usePool` 함수 시그니처에서 `fee: number = 3000` 확인 |
| E3 | `docs/archive/` 내부 문서에 Algebra 참조가 남아있는 경우 | 정상 — archive는 frozen snapshot이므로 변경하지 않음 | `grep -r "Algebra" docs/archive/` → 존재해도 OK |
| E4 | `docs/phases/v0.3.0-abi-correction/` 내부에 Algebra 참조가 있는 경우 | 이전 phase 문서이므로 "(deprecated → v0.4.0에서 Uniswap V3로 전환)" 주석 추가 | 해당 파일에서 주석 존재 확인 |
| E5 | `usePool`에서 `getPool` 호출 결과가 `address(0)` (풀 미생성) 인 경우 | 기존 동작 유지: `poolExists` 체크로 `address(0)` 감지, pool 데이터 조회 스킵 | 수동 확인: usePool.ts에서 `poolExists` 체크 로직 존재 (기존 코드와 동일 패턴) |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. dex.ts ABI를 Uniswap V3 표준으로 전면 리라이트 | F1~F9, F23 | ✅ |
| 2. hooks/trade/ 3개 훅 Uniswap V3 인터페이스 수정 | F14~F21 | ✅ |
| 3. config/addresses.ts DEX 섹션 변경 | F11~F13, F24 | ✅ |
| 4. 운영/구현 문서 Algebra 참조 업데이트 | F22 | ✅ |
| 5. tsc --noEmit + next build 통과 | N1, N2 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| ABI export 이름 변경 (Snowball→Uniswap V3) | F9, F10, N3 | ✅ |
| DynamicFeePluginABI 삭제 | F8, F16, N3 | ✅ |
| globalState→slot0 | F2, F15 | ✅ |
| poolByPair→getPool+fee | F1, F14 | ✅ |
| deployer 파라미터 제거 | F4, F5, F6, F7, F17, F21 | ✅ |
| limitSqrtPrice→sqrtPriceLimitX96 | F4, F17, F18 | ✅ |
| addresses.ts 필드 이름 변경 + 주소 값 유지 | F11, F12, F24, N4 | ✅ |
| fee tier 기본값 3000 | E1, E2 | ✅ |
| archive/ 제외 | E3 | ✅ |
| ABI 소스 버전 (`v3-core@1.0.1`, `v3-periphery@1.4.4`) | F23 | ✅ |
