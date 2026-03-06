# ABI 감사 리포트 — Frontend vs. Contract Source 전수 대조

> `apps/web/src/abis/` 5개 파일의 모든 ABI를 실제 컨트랙트 소스코드와 1:1 대조하여 불일치·누락을 식별

---

## 개요

프론트엔드가 사용하는 ABI가 실제 배포된 컨트랙트와 일치하는지 전수 검사.
각 패키지의 Solidity 소스코드를 직접 읽고, 함수 이름·파라미터 타입·반환값·이벤트 시그니처를 대조했다.

### 감사 범위

| ABI 파일 | 대상 패키지 | ABI 수 |
|----------|------------|--------|
| `dex.ts` | `packages/algebra` (외부), `packages/integration` | 7개 |
| `lend.ts` | `packages/morpho` | 3개 |
| `liquity.ts` | `packages/liquity` | 6개 |
| `options.ts` | `packages/options`, `packages/oracle` | 4개 |
| `yield.ts` | `packages/yield` | 3개 |

### 결과 요약

| 등급 | 건수 | 설명 |
|------|------|------|
| **CRITICAL** (revert) | 12건 | 함수 셀렉터 불일치 — 온체인 호출 시 revert |
| **HIGH** (누락) | 7건 | 핵심 사용자 기능의 ABI 누락 |
| **MEDIUM** (불완전) | 6건 | 타입 불일치 또는 부분 누락 |
| **OK** (정상) | 4개 ABI | 완전 일치 확인 |

---

## 1. liquity.ts — Liquity V2

소스: `packages/liquity/contracts/src/`

### 1-1. BorrowerOperationsABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `openTrove(...)` | O | O | |
| `adjustTrove(...)` | O | O | |
| `closeTrove(uint256)` | O | O | |
| `adjustTroveInterestRate(...)` | O | O | |
| `CCR()` | O | O | public immutable |
| `MCR()` | O | O | public immutable |
| `MIN_ANNUAL_INTEREST_RATE()` | **X** | — | **CRITICAL**: 파일레벨 상수 (`Constants.sol`). 온체인 접근 불가. 하드코딩 필요: `5e15` (0.5%) |
| `MAX_ANNUAL_INTEREST_RATE()` | **X** | — | **CRITICAL**: 동일. 하드코딩 필요: `25e17` (250%) |

**누락된 사용자 함수 (HIGH)**:

| 함수 | 용도 |
|------|------|
| `addColl(uint256,uint256)` | 담보 추가 (adjustTrove 대신 편의 함수) |
| `withdrawColl(uint256,uint256)` | 담보 인출 |
| `withdrawBold(uint256,uint256,uint256)` | sbUSD 추가 대출 |
| `repayBold(uint256,uint256)` | sbUSD 상환 |
| `claimCollateral()` | 청산 후 잔여 담보 회수 |
| `SCR()` | Shutdown Collateral Ratio |

**누락된 배치 매니저 함수 (MEDIUM)**:

| 함수 | 용도 |
|------|------|
| `openTroveAndJoinInterestBatchManager(...)` | 배치 참여하며 Trove 열기 |
| `registerBatchManager(...)` | 배치 매니저 등록 |
| `setBatchManagerAnnualInterestRate(...)` | 배치 이율 설정 |
| `setInterestBatchManager(...)` | Trove를 배치에 합류 |
| `removeFromBatch(...)` | 배치에서 이탈 |
| `interestBatchManagerOf(uint256)` | 어떤 배치에 속하는지 조회 |
| `getInterestBatchManager(address)` | 배치 매니저 정보 |

---

### 1-2. TroveManagerABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `getTroveAnnualInterestRate(uint256)` | O | O | |
| `getTroveEntireColl(uint256)` | **X** | — | **CRITICAL**: 함수 없음. `getLatestTroveData(uint256)` 반환 struct의 `.entireColl` 사용 |
| `getTroveEntireDebt(uint256)` | **X** | — | **CRITICAL**: 동일. `.entireDebt` 사용 |
| `getTroveStatus(uint256)` | O | △ | 반환 타입 `uint8` (enum)이지만 ABI는 `uint256`. 동작은 하지만 부정확 |
| `getEntireSystemColl()` | **X** | — | **CRITICAL**: 이름 틀림. `getEntireBranchColl()` |
| `getEntireSystemDebt()` | **X** | — | **CRITICAL**: 이름 틀림. `getEntireBranchDebt()` |
| `getTCR(uint256)` | **X** | — | **CRITICAL**: `_getTCR`은 internal. 외부 호출 불가 |

**누락된 핵심 함수 (HIGH)**:

| 함수 | 용도 |
|------|------|
| `getLatestTroveData(uint256) → LatestTroveData` | **Trove 상태 조회의 정석**. entireColl, entireDebt, accruedInterest, redistGain 등 전부 포함 |
| `getCurrentICR(uint256,uint256)` | 개별 Trove의 현재 담보비율 |
| `getTroveIdsCount()` | 활성 Trove 수 |
| `getTroveFromTroveIdsArray(uint256)` | Trove ID 열거 |
| `getLatestBatchData(address)` | 배치 매니저 데이터 |

**수정 방향**:

```typescript
// BEFORE (revert됨)
{ name: "getTroveEntireColl", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }] }

// AFTER
{ name: "getLatestTroveData", inputs: [{ name: "troveId", type: "uint256" }], outputs: [
  { name: "entireColl", type: "uint256" },
  { name: "entireDebt", type: "uint256" },
  { name: "annualInterestRate", type: "uint256" },
  { name: "accruedInterest", type: "uint256" },
  { name: "recordedDebt", type: "uint256" },
  { name: "redistBoldDebtGain", type: "uint256" },
  { name: "redistCollGain", type: "uint256" },
  // ... (LatestTroveData struct 전체)
] }
```

---

### 1-3. StabilityPoolABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `provideToSP(uint256,bool)` | O | O | |
| `withdrawFromSP(uint256,bool)` | O | O | |
| `claimAllCollGains()` | O | O | |
| `getCompoundedBoldDeposit(address)` | O | O | |
| `getDepositorCollGain(address)` | O | O | |
| `getTotalBoldDeposits()` | O | O | |

**누락된 핵심 함수 (HIGH)**:

| 함수 | 용도 |
|------|------|
| **`getDepositorYieldGain(address)`** | 사용자의 sbUSD 이자 수익. **Earn 페이지 필수** |
| **`getDepositorYieldGainWithPending(address)`** | 미발행 pending 수익 포함 — 더 정확한 실시간 표시 |
| `getYieldGainsOwed()` | 전체 미지급 이자 |
| `getYieldGainsPending()` | 전체 pending 이자 |
| `getCollBalance()` | SP가 보유한 총 담보 |

---

### 1-4. TroveNFTABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `balanceOf(address)` | O | O | ERC721 상속 |
| `tokenOfOwnerByIndex(address,uint256)` | **X** | — | **CRITICAL**: TroveNFT는 `ERC721`만 상속. `ERC721Enumerable` 아님. 이 함수 없음 |

**대안**: `TroveManager.getTroveIdsCount()` + `getTroveFromTroveIdsArray(index)` 로 열거 후 `ownerOf(troveId)` 로 필터

---

### 1-5. MockPriceFeedABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `getPrice()` | **X** | — | **CRITICAL**: 함수 없음. `lastGoodPrice()` (public state var) 사용 |
| `fetchPrice()` | O | △ | MockPriceFeed은 view, CreditcoinPriceFeed은 non-view. eth_call로는 동작 |

---

### 1-6. ActivePoolABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `getCollBalance()` | O | O | |
| `getBoldDebt()` | O | O | |

**누락 (MEDIUM)**:

| 함수 | 용도 |
|------|------|
| `calcPendingAggInterest()` | 미발행 누적 이자 |
| `calcPendingSPYield()` | 미발행 SP 수익 |

---

## 2. lend.ts — Morpho Blue

소스: `packages/morpho/src/`

### 2-1. SnowballLendABI (Morpho.sol)

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 |
|----------|:---:|:---:|
| `market(bytes32)` | O | O |
| `position(bytes32,address)` | O | O |
| `supply(...)` | O | O |
| `withdraw(...)` | O | O |
| `borrow(...)` | O | O |
| `repay(...)` | O | O |
| `supplyCollateral(...)` | O | O |
| `withdrawCollateral(...)` | O | O |

**8개 함수 전부 정확히 매치.**

**누락 (MEDIUM)**:

| 함수 | 용도 |
|------|------|
| `idToMarketParams(bytes32)` | 마켓 ID에서 파라미터 역조회. 하드코딩 회피 |
| `liquidate(...)` | 청산 UI |
| `setAuthorization(address,bool)` | 포지션 위임 |
| `isAuthorized(address,address)` | 위임 상태 조회 |

### 2-2. AdaptiveCurveIRMABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 |
|----------|:---:|:---:|
| `borrowRateView(...)` | O | O |

**정상. 참고**: 프론트엔드 훅(`useLendMarkets.ts`)에서 실제로는 근사치(`util * 0.08`) 사용 중. ABI는 있지만 미사용.

### 2-3. MockOracleABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `getPrice()` | **X** | — | **CRITICAL**: Morpho IOracle 인터페이스는 `price()`. 셀렉터 `0x98d5fdca` vs `0xa035b1fe` 불일치 |

**수정**:
```typescript
// BEFORE
{ name: "getPrice", ... }
// AFTER
{ name: "price", ... }
```

### 2-4. MetaMorpho Vault ABI — 완전 누락

`packages/morpho/src/metamorpho/MetaMorpho.sol` (ERC-4626 Vault)의 ABI가 프론트엔드에 전혀 없음.
Vault 기능 (deposit, withdraw, redeem, totalAssets 등)을 사용하려면 별도 ABI 필요.

---

## 3. options.ts — Binary Options

소스: `packages/options/src/`

### 3-1. OptionsClearingHouseABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `deposit(uint256)` | **X** | — | **CRITICAL**: 컨트랙트는 `deposit()` (인자 없음, `msg.value` 사용). 셀렉터 `0xb6b55f25` vs `0xd0e30db0` |
| `withdraw(uint256)` | O | O | |
| `balanceOf(address)` | O | O | |
| `escrowOf(address)` | O | O | |

**수정**:
```typescript
// BEFORE
{ name: "deposit", inputs: [{ name: "amount", type: "uint256" }], stateMutability: "payable" }
// AFTER
{ name: "deposit", inputs: [], stateMutability: "payable" }
```

### 3-2. OptionsVaultABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `deposit(uint256)` | **X** | — | **CRITICAL**: 동일 문제. `deposit()` payable, 인자 없음 |
| `requestWithdraw(uint256)` | O | O | |
| `executeWithdraw()` | O | O | |
| `sharesOf(address)` | O | O | |
| `totalDeposited()` | O | O | |
| `totalShares()` | O | O | |

**누락된 핵심 함수 (HIGH)**:

| 함수 | 용도 |
|------|------|
| **`pendingWithdrawShares(address)`** | 사용자의 출금 대기 수량 표시 |
| **`withdrawUnlockTime(address)`** | 출금 가능 시점 카운트다운 |
| `availableLiquidity()` | 출금 가능 유동성 |
| `lockedCollateral()` | 잠긴 담보 표시 |
| `WITHDRAW_DELAY()` | 24시간 대기 상수 |

### 3-3. SnowballOptionsABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 | 비고 |
|----------|:---:|:---:|------|
| `currentRound()` | **X** | — | **CRITICAL**: 컨트랙트는 `currentRoundId()`. 셀렉터 불일치 |
| `rounds(uint256)` | **X** | — | **CRITICAL**: 컨트랙트는 `getRound(uint256)` — 다른 이름, 다른 반환 구조 |
| `commissionFee()` | O | O | |

**이벤트 불일치**:

| ABI 이벤트 | 컨트랙트 이벤트 | 매치 |
|-----------|---------------|:---:|
| `RoundStarted(uint256 indexed, uint256 startPrice, uint256 duration)` | `RoundStarted(uint256 indexed, uint256 lockPrice, uint256 lockTimestamp, uint256 duration)` | **X** — 파라미터 수 다름 (3 vs 4), 이름 다름 |
| `RoundExecuted(uint256 indexed, uint256 endPrice)` | `RoundExecuted(uint256 indexed, uint256 closePrice)` | △ — 이름만 다름, 인코딩은 동일 |
| `OrderSettled(uint256 indexed, address indexed, bool, uint256, uint256)` | `OrderSettled(uint256 indexed, uint256 indexed, address, uint256)` | **X** — 완전 불일치. 파라미터 수·타입·indexed 전부 다름 |

**수정 방향**:
```typescript
// BEFORE
{ name: "currentRound", ... }
{ name: "rounds", inputs: [{ name: "roundId", type: "uint256" }], ... }

// AFTER
{ name: "currentRoundId", ... }
{ name: "getRound", inputs: [{ name: "roundId", type: "uint256" }], outputs: [
  { name: "lockPrice", type: "uint256" },
  { name: "closePrice", type: "uint256" },
  { name: "lockTimestamp", type: "uint256" },
  { name: "duration", type: "uint256" },
  { name: "totalOverAmount", type: "uint256" },
  { name: "totalUnderAmount", type: "uint256" },
  { name: "status", type: "uint8" },
  { name: "totalOrders", type: "uint256" },
] }
```

### 3-4. OptionsRelayer — ABI 완전 누락 (HIGH)

`packages/options/src/OptionsRelayer.sol` — 사용자가 EIP-712 서명으로 주문하는 핵심 컨트랙트.

프론트엔드에서 주문 서명을 구성하려면 최소한 필요:

| 함수 | 용도 |
|------|------|
| `DOMAIN_SEPARATOR()` | EIP-712 도메인 |
| `nonces(address)` | 현재 nonce |
| `ORDER_TYPEHASH()` | 주문 타입 해시 |
| `getDigest(...)` | 서명 다이제스트 생성 |

### 3-5. BTCMockOracleABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 |
|----------|:---:|:---:|
| `price()` | O | O |
| `lastUpdated()` | O | O |
| `fetchPrice()` | O | O |

**정상. 문제 없음.**

---

## 4. yield.ts — Yield Vault

소스: `packages/yield/src/`

### 4-1. SnowballYieldVaultABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 |
|----------|:---:|:---:|
| `want()` | O | O |
| `balance()` | O | O |
| `available()` | O | O |
| `totalSupply()` | O | O |
| `balanceOf(address)` | O | O |
| `getPricePerFullShare()` | O | O |
| `strategy()` | O | O |
| `name()` | O | O |
| `symbol()` | O | O |
| `decimals()` | O | O |
| `allowance(address,address)` | O | O |
| `deposit(uint256)` | O | O |
| `depositAll()` | O | O |
| `withdraw(uint256)` | O | O |
| `withdrawAll()` | O | O |
| `Transfer` event | O | O |

**15개 함수 + 1 이벤트 전부 정확히 매치. 문제 없음.**

참고: V2 Vault (`SnowballYieldVaultV2`)는 ERC-4626 기반으로 `deposit(uint256,address)` 등 시그니처가 다름. V2 배포 시 별도 ABI 필요.

### 4-2. SnowballStrategyABI

| ABI 함수 | 컨트랙트 존재 | 시그니처 매치 |
|----------|:---:|:---:|
| `balanceOf()` | O | O |
| `balanceOfPool()` | O | O |
| `balanceOfWant()` | O | O |
| `lockedProfit()` | O | O |
| `lastHarvest()` | O | O |
| `paused()` | O | O |
| `withdrawFee()` | O | O |
| `rewardsAvailable()` | O | O |
| `harvest()` | O | O |

**9개 함수 전부 매치. 문제 없음.**

### 4-3. ERC20ApproveABI

| ABI 함수 | 시그니처 매치 |
|----------|:---:|
| `approve(address,uint256)` | O |
| `allowance(address,address)` | O |

**정상.**

---

## 5. dex.ts — Uniswap V3 DEX

소스: `@uniswap/v3-core@1.0.1`, `@uniswap/v3-periphery@1.4.4` canonical ABI 기준. v0.4.0에서 전면 리라이트 완료.

### 5-1. UniswapV3FactoryABI

| ABI 함수 | Uniswap V3 존재 | 매치 |
|----------|:---:|:---:|
| `getPool(address,address,uint24)` | O | O |
| `createPool(address,address,uint24)` | O | O |

**정상.**

### 5-2. UniswapV3PoolABI

| ABI 함수 | Uniswap V3 존재 | 매치 |
|----------|:---:|:---:|
| `slot0()` | O | O |
| `liquidity()` | O | O |
| `token0()` | O | O |
| `token1()` | O | O |
| `fee()` | O | O |
| `tickSpacing()` | O | O |

**정상.** (v0.3.0에서 누락이었던 `tickSpacing` 포함)

### 5-3. SwapRouterABI

| ABI 함수 | Uniswap V3 존재 | 매치 |
|----------|:---:|:---:|
| `exactInputSingle(...)` | O | O |
| `exactInput(...)` | O | O |
| `multicall(bytes[])` | O | O |

**정상.** (v0.3.0에서 누락이었던 `exactInput`, `multicall` 포함)

### 5-4. QuoterV2ABI

| ABI 함수 | Uniswap V3 존재 | 매치 |
|----------|:---:|:---:|
| `quoteExactInputSingle(...)` | O | O |

**정상.**

### 5-5. NonfungiblePositionManagerABI

| ABI 함수 | Uniswap V3 존재 | 매치 |
|----------|:---:|:---:|
| `positions(uint256)` | O | O |
| `mint(...)` | O | O |
| `collect(...)` | O | O |
| `decreaseLiquidity(...)` | O | O |
| `balanceOf(address)` | O | O |
| `tokenOfOwnerByIndex(address,uint256)` | O | O |
| `increaseLiquidity(...)` | O | O |
| `burn(uint256)` | O | O |
| `multicall(bytes[])` | O | O |

**정상.** (v0.3.0에서 누락이었던 `increaseLiquidity`, `multicall`, `burn` 포함)

### 5-6. DynamicFeePluginABI

| ABI 함수 | 매치 |
|----------|:---:|
| `getFee(address)` | O |

**정상.** `poolConfig(address)` 누락은 nice-to-have.

### 5-7. MockERC20ABI

| ABI 함수 | 매치 |
|----------|:---:|
| `approve`, `allowance`, `balanceOf`, `decimals`, `symbol`, `transfer`, `transferFrom` | 전부 O |

**정상.**

---

## 6. Integration 패키지 — ABI 완전 누락

`packages/integration/src/` 에 있는 컨트랙트들은 프론트엔드 ABI가 **하나도 없음**.

| 컨트랙트 | 용도 | ABI 존재 |
|----------|------|:---:|
| `SnowballRouter.sol` | 1-click 레버리지 (borrow → supply/deposit/swap) | X |
| `SnowballOracle.sol` | 멀티 에셋 오라클 | X |
| `SnowballInterestRouter.sol` | sbUSD 이자 분배 (Morpho/Treasury) | X |
| `LiquityPriceFeedAdapter.sol` | Liquity 가격 어댑터 | X |
| `MorphoOracleAdapter.sol` | Morpho 가격 어댑터 (1e36) | X |

**SnowballRouter** 는 특히 중요 — 프론트엔드에서 "1-click Borrow & Supply" 등의 기능을 구현하려면 필수:

```solidity
// SnowballRouter.sol 주요 함수
function borrowAndSupply(BorrowParams, MorphoSupplyParams) external
function borrowAndDeposit(BorrowParams, address vault) external
function borrowSwapAndSupply(BorrowParams, SwapParams, MorphoSupplyParams) external
function execute(ActionType[], bytes[]) external  // 범용 배치
```

---

## 종합 — CRITICAL 이슈 목록

### 즉시 수정 필요 (revert되는 ABI)

| # | 파일 | 현재 ABI | 올바른 함수 | 원인 |
|---|------|----------|------------|------|
| 1 | `liquity.ts` | `MIN_ANNUAL_INTEREST_RATE()` | 하드코딩 `5e15` | 파일레벨 상수 |
| 2 | `liquity.ts` | `MAX_ANNUAL_INTEREST_RATE()` | 하드코딩 `25e17` | 파일레벨 상수 |
| 3 | `liquity.ts` | `getTroveEntireColl(uint256)` | `getLatestTroveData(uint256).entireColl` | 함수 없음 |
| 4 | `liquity.ts` | `getTroveEntireDebt(uint256)` | `getLatestTroveData(uint256).entireDebt` | 함수 없음 |
| 5 | `liquity.ts` | `getEntireSystemColl()` | `getEntireBranchColl()` | 이름 변경 |
| 6 | `liquity.ts` | `getEntireSystemDebt()` | `getEntireBranchDebt()` | 이름 변경 |
| 7 | `liquity.ts` | `getTCR(uint256)` | 프론트엔드에서 계산 | internal 함수 |
| 8 | `liquity.ts` | `TroveNFT.tokenOfOwnerByIndex()` | TroveManager로 열거 | ERC721Enumerable 아님 |
| 9 | `liquity.ts` | `MockPriceFeed.getPrice()` | `lastGoodPrice()` | 함수 없음 |
| 10 | `lend.ts` | `MockOracle.getPrice()` | `price()` | IOracle 인터페이스 |
| 11 | `options.ts` | `ClearingHouse.deposit(uint256)` | `deposit()` payable | 셀렉터 불일치 |
| 12 | `options.ts` | `Vault.deposit(uint256)` | `deposit()` payable | 셀렉터 불일치 |
| 13 | `options.ts` | `Options.currentRound()` | `currentRoundId()` | 이름 불일치 |
| 14 | `options.ts` | `Options.rounds(uint256)` | `getRound(uint256)` | 이름·구조 불일치 |
| 15 | `options.ts` | `OrderSettled` event (5 params) | 4 params, 다른 indexed | 시그니처 완전 불일치 |
| 16 | `options.ts` | `RoundStarted` event (3 params) | 4 params | 파라미터 누락 |

### 핵심 기능 누락 (HIGH)

| # | 대상 | 누락 ABI | 영향 |
|---|------|----------|------|
| 1 | StabilityPool | `getDepositorYieldGain(address)` | Earn 수익 표시 불가 |
| 2 | TroveManager | `getLatestTroveData(uint256)` | Trove 정보 제대로 못 읽음 |
| 3 | OptionsRelayer | 전체 ABI 없음 | EIP-712 주문 서명 불가 |
| 4 | OptionsVault | `pendingWithdrawShares` / `withdrawUnlockTime` | 출금 상태 표시 불가 |
| 5 | NonfungiblePositionManager | `increaseLiquidity` / `multicall` | LP 포지션 관리 제한 |
| 6 | SwapRouter | `exactInput` (멀티홉) | 단일홉만 가능 |
| 7 | SnowballRouter (integration) | 전체 ABI 없음 | 1-click 전략 불가 |

### 정상 확인 (OK)

| 파일 | ABI | 상태 |
|------|-----|------|
| `lend.ts` | `SnowballLendABI` (8개 함수) | 전부 매치 |
| `yield.ts` | `SnowballYieldVaultABI` (15+1) | 전부 매치 |
| `yield.ts` | `SnowballStrategyABI` (9개) | 전부 매치 |
| `options.ts` | `BTCMockOracleABI` (3개) | 전부 매치 |
| `dex.ts` | `MockERC20ABI` (7개) | 전부 매치 |

---

## 결론

### 심각도 분포

```
CRITICAL (revert)  ████████████████  16건
HIGH (누락)        ███████           7건
MEDIUM (불완전)    ██████            6건
OK (정상)          █████             5개 ABI
```

**`options.ts`가 가장 심각** — 거의 모든 함수·이벤트가 불일치. 프로토타입 단계에서 컨트랙트가 크게 변경된 후 ABI가 업데이트되지 않은 것으로 추정.

**`yield.ts`가 가장 정확** — V1 Vault 기준 100% 일치.

**다음 조치**:
1. 16건의 CRITICAL revert 이슈 즉시 수정
2. `OptionsRelayer` ABI 신규 추가
3. `integration/SnowballRouter` ABI 신규 추가 (1-click 전략 지원 시)
4. 멀티홉 스왑 지원 시 DEX 관련 ABI 확장

---

**작성일**: 2026-03-06 KST
