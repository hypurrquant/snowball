# Snowball DEX — Frontend Design Specification

> Algebra V4 기반 Concentrated Liquidity AMM on Creditcoin Testnet
>
> 작성일: 2026-02-24
> 대상: Frontend 개발자 핸드오프용 기획서

---

## 1. Overview

### 1.1 Product Summary

Snowball DEX는 Creditcoin 테스트넷(Chain ID: 102031)에 배포된 Concentrated Liquidity AMM입니다. Algebra V4 (Integral) 포크 기반으로, 동적 수수료(Dynamic Fee Plugin)와 집중 유동성(Concentrated Liquidity) NFT 포지션을 지원합니다.

### 1.2 Core Features

| Feature | Contract | Description |
|---------|----------|-------------|
| Token Swap | SnowballRouter | 단일/멀티홉 토큰 스왑 |
| Liquidity Provision | NonfungiblePositionManager | 가격 범위 지정 유동성 공급, NFT 포지션 |
| Price Quotes | QuoterV2 | 스왑 가격 시뮬레이션 (off-chain) |
| Dynamic Fees | DynamicFeePlugin | 변동성 기반 수수료 자동 조정 |

### 1.3 Initial Pools (4개)

| Pool | Token Pair | Fee Range | Category |
|------|-----------|-----------|----------|
| sbUSD/USDC | Stablecoin-Stablecoin | 0.01%~0.1% | Stablecoin |
| wCTC/sbUSD | Native-Stable | 0.05%~1.0% | Major |
| wCTC/USDC | Native-Stable | 0.05%~1.0% | Major |
| lstCTC/wCTC | LST-Native | 0.01%~0.1% | Correlated |

### 1.4 Deployed Contracts

```json
{
  "network": { "name": "Creditcoin Testnet", "chainId": 102031 },
  "rpc": "https://rpc.cc3-testnet.creditcoin.network",
  "explorer": "https://creditcoin-testnet.blockscout.com",
  "core": {
    "snowballFactory": "0x04dca03a979b2ad38ee964e8d32c9d36c1301040",
    "snowballPoolDeployer": "0x71f39dc01dce21358e0733a9981f4b5010312dbb",
    "snowballRouter": "0x151211ea233c72d466e7c159bf07673771164e4e",
    "dynamicFeePlugin": "0x962267ce45eeef519212243fe8d954b951e31f2c",
    "nonfungiblePositionManager": "0x16534c66e4249ac8cd39a8c91cc80d3f0389a71f",
    "quoterV2": "0x36bab7a5dcfb2c4e980dc5bf86009e61a3c35c77"
  }
}
```

---

## 2. Tech Stack (Recommended)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5.x |
| Blockchain | wagmi v2 + viem | latest |
| Wallet | RainbowKit | latest |
| State | Zustand or TanStack Query | latest |
| Styling | Tailwind CSS | 3.x |
| Charts | Lightweight Charts (TradingView) + Recharts | latest |
| UI Components | shadcn/ui (Radix-based) | latest |

---

## 3. Information Architecture

### 3.1 Navigation Structure

```
[Logo] [Swap] [Pool] [Analytics] [Docs(외부)]  ........  [Network Badge] [Connect Wallet]
```

**Top Navigation Bar (고정)**
- **Logo**: Snowball DEX 로고, 클릭 시 Swap 페이지로 이동
- **Swap**: 기본 랜딩 페이지, 토큰 스왑
- **Pool**: 유동성 풀 목록 + 내 포지션 관리
- **Analytics**: 프로토콜 통계 대시보드
- **Docs**: 외부 링크 (GitBook 등)
- **Network Badge**: "Creditcoin Testnet" 표시 + 네트워크 상태
- **Connect Wallet**: 지갑 연결/주소 표시

**모바일**: 하단 탭 바 (Swap | Pool | Analytics | More)

### 3.2 Site Map

```
/                     → Swap (default landing)
/swap                 → Swap page
/pool                 → Pool list + My Positions
/pool/add             → Add Liquidity (new position)
/pool/add/:pair       → Add Liquidity with pre-selected pair
/pool/:tokenId        → Position Detail
/analytics            → Protocol overview
/analytics/pool/:addr → Pool detail analytics
/analytics/token/:addr → Token detail analytics
```

---

## 4. Page Designs

### 4.1 Swap Page (메인 랜딩)

```
┌─────────────────────────────────────────────────────────┐
│  [Navigation Bar]                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│           ┌────────────────────────────┐                │
│           │  Swap          [⚙ Settings]│                │
│           ├────────────────────────────┤                │
│           │ From          Balance: 100 │                │
│           │ ┌────────┐    ┌──────────┐ │                │
│           │ │ amount  │    │ CTC  ▼  │ │                │
│           │ └────────┘    └──────────┘ │                │
│           │ ~$45.00              [MAX] │                │
│           ├────────────────────────────┤                │
│           │         [ ⇅ ]             │                │
│           ├────────────────────────────┤                │
│           │ To            Balance: 0   │                │
│           │ ┌────────┐    ┌──────────┐ │                │
│           │ │ amount  │    │ USDC ▼  │ │                │
│           │ └────────┘    └──────────┘ │                │
│           │ ~$44.85                    │                │
│           ├────────────────────────────┤                │
│           │ ▼ Trade Details            │                │
│           │  Rate: 1 CTC = 0.45 USDC  │                │
│           │  Dynamic Fee: 0.3%         │                │
│           │  Price Impact: <0.01%      │                │
│           │  Min Received: 44.72 USDC  │                │
│           │  Route: CTC → wCTC → USDC  │                │
│           ├────────────────────────────┤                │
│           │ [       Swap             ] │                │
│           └────────────────────────────┘                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.1 Swap Card Components

**Token Input Card (From/To)**
- 금액 입력 필드: 큰 폰트, 숫자만 입력 가능, 소수점 지원
- 토큰 선택 버튼: 아이콘 + 심볼, 클릭 시 Token Selector Modal 오픈
- 잔고 표시: 우측 상단, "Balance: {amount}"
- MAX 버튼: 최대 금액 자동 입력 (네이티브 토큰은 가스비 예약)
- USD 환산 표시: 금액 아래 회색 텍스트

**Swap Direction Button (⇅)**
- From/To 토큰 쌍 반전
- 중앙 원형 버튼, 호버 시 회전 애니메이션

**Trade Details Panel (접기/펼치기)**
- Exchange Rate: "1 CTC = 0.45 USDC" (클릭 시 역방향 표시)
- Dynamic Fee: DynamicFeePlugin에서 실시간 조회
- Price Impact: 색상 코딩 (green < 1%, yellow 1~3%, red > 3%)
- Minimum Received: 슬리피지 적용된 최소 수령량
- Route: 스왑 경로 시각화 (토큰 아이콘 → 아이콘)

**Action Button (상태별 변화)**

| State | Button Text | Style |
|-------|-----------|-------|
| 지갑 미연결 | Connect Wallet | Primary |
| 토큰 미선택 | Select a token | Disabled |
| 금액 미입력 | Enter an amount | Disabled |
| 잔고 부족 | Insufficient {TOKEN} balance | Error |
| 승인 필요 | Approve {TOKEN} | Warning |
| 준비 완료 | Swap | Primary Active |
| 처리 중 | Swapping... | Loading |

#### 4.1.2 Settings Modal (⚙)

```
┌──────────────────────────┐
│ Transaction Settings  [X]│
├──────────────────────────┤
│ Slippage Tolerance       │
│ [0.1%] [0.5%] [1.0%] [Custom: ___%]│
│                          │
│ Transaction Deadline     │
│ [20] minutes             │
│                          │
│ □ Expert Mode            │
└──────────────────────────┘
```

#### 4.1.3 Token Selector Modal

```
┌──────────────────────────┐
│ Select a Token        [X]│
├──────────────────────────┤
│ [🔍 Search name or addr]│
├──────────────────────────┤
│ Popular:                 │
│ [CTC] [wCTC] [USDC]     │
│ [sbUSD] [lstCTC]         │
├──────────────────────────┤
│ Token List:              │
│ ● CTC      Creditcoin    │
│   Balance: 100.00        │
│ ● wCTC     Wrapped CTC   │
│   Balance: 50.00         │
│ ● USDC     USD Coin      │
│   Balance: 1,000.00      │
│ ● sbUSD    Snowball USD   │
│   Balance: 500.00        │
│ ● lstCTC   Liquid Staked  │
│   Balance: 25.00         │
└──────────────────────────┘
```

- 잔고순 정렬 (높은 잔고 우선)
- 커스텀 토큰 주소 붙여넣기 지원
- 지갑 미연결 시에도 토큰 목록 표시 (잔고 없이)

#### 4.1.4 Swap Confirmation Flow

```
Step 1: Preview          Step 2: Wallet         Step 3: Pending        Step 4: Success
┌──────────────┐         ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Review Swap  │         │  Confirm in  │       │  Transaction │       │     ✓        │
│              │         │  your wallet │       │  Submitted   │       │  Swap        │
│ 100 CTC      │    →    │              │   →   │              │   →   │  Complete!   │
│    ↓         │         │   [Wallet    │       │  [Spinner]   │       │              │
│ 44.85 USDC   │         │    Icon]     │       │              │       │ 100 CTC →    │
│              │         │              │       │ View on      │       │ 44.85 USDC   │
│ Fee: 0.3%    │         │ Waiting...   │       │ Explorer ↗   │       │              │
│ Impact: <0.01%│         │              │       │              │       │ View on      │
│              │         │              │       │              │       │ Explorer ↗   │
│[Confirm Swap]│         │              │       │              │       │ [Close]      │
└──────────────┘         └──────────────┘       └──────────────┘       └──────────────┘
```

#### 4.1.5 QuoterV2 Integration

**실시간 견적 조회 로직:**

```typescript
// 단일 풀 스왑
const quote = await quoterV2.read.quoteExactInputSingle([{
  tokenIn: token0Address,
  tokenOut: token1Address,
  amountIn: parseUnits(amount, decimals),
  limitSqrtPrice: 0n, // no limit
}]);
// returns: [amountOut, afterSqrtPrice, afterTick, fee]

// 멀티홉 스왑 (e.g. lstCTC → wCTC → USDC)
const path = encodePacked(
  ['address', 'address', 'address'],
  [lstCTCAddr, wCTCAddr, USDCAddr]
);
const quote = await quoterV2.read.quoteExactInput([path, amountIn]);
```

**디바운스**: 사용자 입력 후 300ms 디바운스하여 QuoterV2 호출
**에러 처리**: 유동성 부족 시 "Insufficient liquidity" 표시

---

### 4.2 Pool Page

#### 4.2.1 Pool List (기본 뷰)

```
┌─────────────────────────────────────────────────────────────┐
│  Pools                                  [+ New Position]    │
├──────┬─────────────┬─────────┬──────────┬─────────┬────────┤
│ Pair │ Dynamic Fee │   TVL   │ Volume   │ 24h Fee │  APR   │
├──────┼─────────────┼─────────┼──────────┼─────────┼────────┤
│●● wCTC/USDC │ 0.52% │ $125K │ $45K    │ $234   │ 68.2% │
│●● wCTC/sbUSD│ 0.48% │ $98K  │ $32K    │ $154   │ 57.3% │
│●● sbUSD/USDC│ 0.05% │ $210K │ $180K   │ $90    │ 15.6% │
│●● lstCTC/wCTC│0.04% │ $45K  │ $12K    │ $5     │  4.1% │
└──────┴─────────────┴─────────┴──────────┴─────────┴────────┘
```

- 각 행 클릭 시 Pool Detail로 이동
- "Dynamic Fee" 컬럼: 현재 DynamicFeePlugin 수수료 실시간 표시
- TVL/Volume: 온체인 이벤트 기반 계산 또는 subgraph
- APR: 24h 수수료 기반 연환산

#### 4.2.2 My Positions (탭 전환)

```
┌─────────────────────────────────────────────────────────────┐
│  [All Pools] [My Positions (3)]         [+ New Position]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ●● wCTC / USDC                    [🟢 In Range]    │   │
│  │ Dynamic Fee: 0.52%               NFT #42            │   │
│  │                                                      │   │
│  │ [===|=====X=====|===]                                │   │
│  │ Min: $0.32    Current: $0.45    Max: $0.65          │   │
│  │                                                      │   │
│  │ Liquidity: $2,450              Unclaimed: $12.34    │   │
│  │                                                      │   │
│  │ [Collect] [Increase] [Remove]                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ●● sbUSD / USDC                   [🔴 Out of Range]│   │
│  │ Dynamic Fee: 0.05%               NFT #38            │   │
│  │                                                      │   │
│  │ [=X|==============|===]                              │   │
│  │ Min: $0.998   Current: $1.002   Max: $1.005         │   │
│  │                                                      │   │
│  │ Liquidity: $5,000              Unclaimed: $3.21     │   │
│  │                                                      │   │
│  │ [Collect] [Increase] [Remove]                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Position Card Elements:**
- **Token Pair**: 아이콘 2개 + 이름
- **Range Status Badge**:
  - 🟢 In Range (green): 현재 가격이 설정 범위 내
  - 🔴 Out of Range (red): 현재 가격이 범위 밖
  - ⚫ Closed (gray): 유동성 0
- **Range Visualization**: 수평 바, X = 현재 가격, | = 범위 경계
- **Min/Current/Max Price**: 숫자 표시
- **Liquidity**: USD 환산 총 유동성
- **Unclaimed Fees**: 미수령 수수료 (토큰별 breakdown은 디테일에서)
- **Action Buttons**: Collect, Increase, Remove

---

### 4.3 Add Liquidity Page

Concentrated liquidity 포지션 생성 — 가장 복잡한 UI

#### 4.3.1 Full Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Liquidity                                    [← Back]     │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│  Step 1: Select Pair         │   Liquidity Distribution Chart   │
│  ┌──────┐   ┌──────┐       │                                  │
│  │wCTC ▼│   │USDC ▼│       │   ▓▓▓                            │
│  └──────┘   └──────┘       │   ▓▓▓▓                           │
│                              │   ▓▓▓▓▓▓                         │
│  Dynamic Fee: 0.52%          │  ▓▓▓▓▓▓▓▓                       │
│                              │  ▓▓▓▓▓▓▓▓▓▓                     │
│  Step 2: Price Range         │ ▓▓▓▓▓▓▓▓▓▓▓▓    ← 기존 유동성  │
│  Presets:                    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │
│  [Full] [Safe] [Common]     │ ▓▓▓▓▓[|||X|||]▓▓   ← 내 범위   │
│  [Expert]                    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 │
│                              │  ├───┤    ├───┤                 │
│  Min Price       Max Price   │  Min      Max                   │
│  ┌──────┐       ┌──────┐   │  (drag handles)                  │
│  │ [-]0.32[+] │ │ [-]0.65[+]││                                  │
│  └──────┘       └──────┘   │                                  │
│  USDC per wCTC               │                                  │
│                              │                                  │
│  Step 3: Deposit Amounts     │                                  │
│  ┌──────────────────────┐   │                                  │
│  │ wCTC    Balance: 50  │   │                                  │
│  │ [amount]       [MAX] │   │                                  │
│  └──────────────────────┘   │                                  │
│  ┌──────────────────────┐   │                                  │
│  │ USDC    Balance: 1000│   │                                  │
│  │ [amount]       [MAX] │   │                                  │
│  └──────────────────────┘   │                                  │
│                              │                                  │
│  [     Add Liquidity      ] │                                  │
│                              │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│  Preview:                                                       │
│  Deposit: 10 wCTC + 450 USDC | Range: 0.32-0.65 USDC/wCTC     │
│  Estimated APR: ~68% | Pool Share: 2.3%                        │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Price Range Presets

| Preset | Description | Range Width |
|--------|-------------|-------------|
| **Full Range** | 전체 가격 범위 (V2 유사) | MIN_TICK ~ MAX_TICK |
| **Safe** | 현재 가격 ±50% | 넓은 범위, 낮은 자본 효율 |
| **Common** | 현재 가격 ±20% | 중간, 균형잡힌 |
| **Expert** | 현재 가격 ±5% | 좁은 범위, 높은 자본 효율 |

**Custom Input:**
- Min/Max 가격 직접 입력
- [+] / [-] 버튼으로 틱 단위 조정
- 차트에서 드래그로 범위 조정

#### 4.3.3 Deposit Amount Logic

```
if (currentPrice > maxPrice) → Token1만 입금
if (currentPrice < minPrice) → Token0만 입금
if (minPrice < currentPrice < maxPrice) → 양쪽 토큰, 비율 자동 계산
```

한쪽 금액 입력 시 다른 쪽 자동 계산 (현재 가격 & 범위 기반)

#### 4.3.4 NonfungiblePositionManager Interaction

```typescript
// 새 포지션 생성
const tx = await nftManager.write.mint([{
  token0: sortedToken0,
  token1: sortedToken1,
  tickLower: minTick,
  tickUpper: maxTick,
  amount0Desired: amount0,
  amount1Desired: amount1,
  amount0Min: amount0 * (1n - slippage),
  amount1Min: amount1 * (1n - slippage),
  recipient: userAddress,
  deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
}]);
```

---

### 4.4 Position Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Pool    wCTC / USDC    NFT #42    [🟢 In Range] │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│  Liquidity: $2,450          │   Price Chart (TradingView)  │
│  Current Price: 0.45 USDC   │   ┌─────────────────────┐   │
│                             │   │  ~~~~~/\~~~          │   │
│  Token Amounts:              │   │ ~~~~/    \~~~~      │   │
│  ● 2,722 wCTC ($1,225)     │   │ ~~/        \~~~~    │   │
│  ● 1,225 USDC ($1,225)     │   │ [====|range|====]   │   │
│                             │   │                     │   │
│  Range:                      │   │ [24h][7d][30d][1y] │   │
│  Min: 0.32 USDC/wCTC        │   └─────────────────────┘   │
│  Max: 0.65 USDC/wCTC        │                               │
│                             │   Liquidity Density Chart     │
│  Unclaimed Fees:             │   ┌─────────────────────┐   │
│  ● 3.45 wCTC ($1.55)       │   │ ▓▓▓▓                 │   │
│  ● 8.79 USDC ($8.79)       │   │ ▓▓▓▓▓▓[|MY|]▓▓      │   │
│  Total: $10.34               │   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │   │
│                             │   └─────────────────────┘   │
│  [Collect Fees]              │                               │
│  [Increase Liquidity]        │                               │
│  [Remove Liquidity]          │                               │
│                             │                               │
└─────────────────────────────┴───────────────────────────────┘
```

#### 4.4.1 Actions

**Collect Fees**
- 원클릭 수수료 수령
- `nftManager.collect({ tokenId, recipient, amount0Max, amount1Max })`
- 수령 전 금액 미리보기 표시

**Increase Liquidity**
- 기존 포지션에 유동성 추가 (같은 범위)
- `nftManager.increaseLiquidity({ tokenId, amount0Desired, amount1Desired, ... })`
- 양쪽 토큰 금액 입력

**Remove Liquidity**
- 슬라이더 또는 버튼 (25% / 50% / 75% / 100%)
- `nftManager.decreaseLiquidity({ tokenId, liquidity, ... })` → `nftManager.collect()`
- 100% 제거 시 NFT burn 옵션

---

### 4.5 Analytics Page

#### 4.5.1 Protocol Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Snowball DEX Analytics                                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│    TVL       │  24h Volume  │   24h Fees   │  Total Txns    │
│   $478K      │   $269K      │    $483      │   1,247        │
│   +5.2%      │   +12.3%     │    +8.1%     │   +3.4%        │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                                                              │
│  TVL Over Time           [24h] [7d] [30d] [All]             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  _______________                                      │   │
│  │ /               \___                                  │   │
│  │/                     \___________                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Volume Over Time                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ▓   ▓▓  ▓▓▓  ▓▓  ▓▓▓▓  ▓▓▓  ▓▓  ▓▓▓             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Top Pools                                                   │
│  ┌──────────┬──────┬─────────┬──────┬────────┐              │
│  │  Pool    │ TVL  │ Volume  │ Fees │  APR   │              │
│  ├──────────┼──────┼─────────┼──────┼────────┤              │
│  │wCTC/USDC │$125K │  $45K   │ $234 │ 68.2%  │              │
│  │wCTC/sbUSD│$98K  │  $32K   │ $154 │ 57.3%  │              │
│  │sbUSD/USDC│$210K │  $180K  │ $90  │ 15.6%  │              │
│  │lstCTC/wCTC│$45K │  $12K   │ $5   │  4.1%  │              │
│  └──────────┴──────┴─────────┴──────┴────────┘              │
│                                                              │
│  Top Tokens                                                  │
│  ┌──────────┬──────┬─────────┬──────────────┐               │
│  │  Token   │Price │ Change  │   Volume     │               │
│  ├──────────┼──────┼─────────┼──────────────┤               │
│  │ CTC      │$0.45 │  +2.3%  │    $89K      │               │
│  │ USDC     │$1.00 │  +0.01% │    $225K     │               │
│  │ sbUSD    │$1.00 │  -0.02% │    $212K     │               │
│  │ wCTC     │$0.45 │  +2.3%  │    $77K      │               │
│  │ lstCTC   │$0.47 │  +2.8%  │    $12K      │               │
│  └──────────┴──────┴─────────┴──────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5.2 Data Source Strategy

**Option A: Subgraph (추천)**
- The Graph 또는 자체 인덱서
- Swap, Mint, Burn 이벤트 인덱싱
- TVL = sum of all pool reserves
- Volume = sum of swap amounts per period

**Option B: Direct On-Chain + Caching**
- 이벤트 로그 직접 읽기 (`eth_getLogs`)
- 서버사이드 캐싱 (Redis/API)
- Creditcoin 테스트넷에서는 이 방식이 더 현실적

---

## 5. Wallet Connection

### 5.1 Configuration

```typescript
// wagmi config
const creditcoinTestnet = {
  id: 102031,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'CTC', symbol: 'tCTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://creditcoin-testnet.blockscout.com',
    },
  },
  testnet: true,
};

// RainbowKit config
const config = createConfig({
  chains: [creditcoinTestnet],
  connectors: [
    injectedConnector(),    // MetaMask
    walletConnectConnector({ projectId: '...' }),
  ],
  transports: {
    [creditcoinTestnet.id]: http(),
  },
});
```

### 5.2 Network Handling

- 사용자가 잘못된 네트워크에 있을 때: "Switch to Creditcoin Testnet" 버튼 표시
- Creditcoin Testnet이 지갑에 없을 때: 자동으로 네트워크 추가 prompt
- 네트워크 상태 표시: Nav bar에 초록 점 (connected) / 빨간 점 (wrong network)

### 5.3 Connected State

```
[🟢 Creditcoin Testnet] [0x1234...5678 ▼]
                         ├── Copy Address
                         ├── View on Explorer ↗
                         ├── Recent Transactions
                         └── Disconnect
```

---

## 6. Design System

### 6.1 Color Palette

**Dark Theme (Default)**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0B14` | 페이지 배경 |
| `--bg-card` | `#141525` | 카드 배경 |
| `--bg-input` | `#1C1D30` | 입력 필드 배경 |
| `--accent-primary` | `#60A5FA` | 기본 액센트 (아이스 블루) |
| `--accent-gradient` | `#60A5FA → #818CF8` | CTA 버튼 그래디언트 |
| `--text-primary` | `#F5F5F7` | 기본 텍스트 |
| `--text-secondary` | `#8B8D97` | 보조 텍스트 |
| `--text-tertiary` | `#4A4B57` | 비활성 텍스트 |
| `--success` | `#34D399` | In Range, 상승 |
| `--warning` | `#FBBF24` | Price Impact 경고 |
| `--error` | `#F87171` | Out of Range, 에러 |
| `--border` | `#1F2037` | 카드/구분선 |

**Light Theme (옵션)**
- bg-primary: `#FFFFFF`, bg-card: `#F8F9FC`, accent 동일

### 6.2 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page Title | Inter | 24px | 700 |
| Section Header | Inter | 18px | 600 |
| Card Title | Inter | 16px | 600 |
| Body | Inter | 14px | 400 |
| Amount (Large) | JetBrains Mono | 28px | 500 |
| Amount (Small) | JetBrains Mono | 16px | 400 |
| Label | Inter | 12px | 500 |
| Caption | Inter | 11px | 400 |

### 6.3 Component Specifications

**Card**
- Border radius: 16px
- Background: `--bg-card`
- Border: 1px solid `--border`
- Padding: 20px
- Shadow: none (flat design)

**Button (Primary)**
- Background: `--accent-gradient`
- Border radius: 12px
- Height: 52px
- Font: 16px, 600
- Hover: opacity 0.9
- Active: scale 0.98

**Button (Disabled)**
- Background: `--bg-input`
- Color: `--text-tertiary`
- Cursor: not-allowed

**Input**
- Background: `--bg-input`
- Border radius: 12px
- Border: 1px solid transparent (focus: `--accent-primary`)
- Height: 48px
- Font: JetBrains Mono 16px

**Token Badge**
- Height: 36px
- Border radius: 18px
- Background: `--bg-input`
- 아이콘 24px + 토큰 심볼

---

## 7. Mobile Responsive Design

### 7.1 Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | 단일 컬럼, 하단 탭 바 |
| Tablet | 640-1024px | 단일 컬럼, 상단 네비 |
| Desktop | > 1024px | 멀티 컬럼, 상단 네비 |

### 7.2 Mobile Adaptations

**Swap Page**
- 카드 전체 너비
- Settings → 하단 Sheet로 슬라이드업
- Token Selector → 전체 화면 모달

**Add Liquidity**
- 2컬럼 → 단일 컬럼 (차트 위, 폼 아래)
- Price Range 프리셋 → 2x2 그리드
- 범위 입력 → 세로 스택

**Position Cards**
- 전체 너비
- Action 버튼 → 아이콘만 표시 또는 하단 Action Sheet

**Analytics**
- 통계 카드 → 2x2 그리드
- 테이블 → 수평 스크롤 또는 카드 리스트

### 7.3 Bottom Tab Bar (Mobile)

```
┌──────────┬──────────┬──────────┬──────────┐
│  [↔]     │  [💧]    │  [📊]   │  [≡]     │
│  Swap    │  Pool    │ Analytics│  More    │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 8. Transaction & Notification System

### 8.1 Toast Notifications

```
┌──────────────────────────────────┐
│ ● Swap Submitted                  │
│ 100 CTC → 44.85 USDC             │
│ View on Explorer ↗         [X]   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✓ Swap Confirmed                  │
│ 100 CTC → 44.85 USDC             │
│ View on Explorer ↗         [X]   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✕ Swap Failed                     │
│ User rejected transaction         │
│                             [X]   │
└──────────────────────────────────┘
```

**위치**: 우측 상단 (데스크탑), 상단 중앙 (모바일)
**자동 닫기**: 성공 5초, 실패 10초, 수동 닫기 가능

### 8.2 Transaction History

최근 트랜잭션 목록 (지갑 드롭다운에서 접근):
- 상태 아이콘 (pending/success/failed)
- 요약 텍스트 (e.g., "Swap 100 CTC for 44.85 USDC")
- 타임스탬프
- Explorer 링크

---

## 9. Contract Interaction Map

### 9.1 Read Functions (View, No Gas)

| Feature | Contract | Function | Returns |
|---------|----------|----------|---------|
| Pool 목록 | Factory | `poolByPair(token0, token1)` | address |
| Pool 상태 | Pool | `globalState()` | price, tick, fee, pluginConfig, ... |
| 현재 수수료 | DynamicFeePlugin | `getFee(pool)` | uint16 |
| 스왑 견적 | QuoterV2 | `quoteExactInputSingle(params)` | amountOut, fee, ... |
| NFT 포지션 | NFTManager | `positions(tokenId)` | tickLower, tickUpper, liquidity, ... |
| 사용자 NFT 수 | NFTManager | `balanceOf(user)` | count |
| 사용자 NFT ID | NFTManager | `tokenOfOwnerByIndex(user, index)` | tokenId |
| Pool 유동성 | Pool | `liquidity()` | uint128 |
| 틱 데이터 | Pool | `ticks(tick)` | liquidityGross, liquidityNet, ... |

### 9.2 Write Functions (Gas Required)

| Feature | Contract | Function | Params |
|---------|----------|----------|--------|
| 토큰 승인 | ERC20 | `approve(spender, amount)` | Router or NFTManager |
| 스왑 (단일) | Router | `exactInputSingle(params)` | tokenIn, tokenOut, recipient, deadline, amountIn, amountOutMinimum, limitSqrtPrice |
| 스왑 (멀티홉) | Router | `exactInput(params)` | path, recipient, deadline, amountIn, amountOutMinimum |
| 유동성 추가 | NFTManager | `mint(params)` | token0, token1, tickLower, tickUpper, amount0Desired, amount1Desired, ... |
| 유동성 증가 | NFTManager | `increaseLiquidity(params)` | tokenId, amount0Desired, amount1Desired, ... |
| 유동성 감소 | NFTManager | `decreaseLiquidity(params)` | tokenId, liquidity, amount0Min, amount1Min, deadline |
| 수수료 수령 | NFTManager | `collect(params)` | tokenId, recipient, amount0Max, amount1Max |

### 9.3 ABI Location

ABIs are exported from: `packages/shared/src/abis/index.ts`

```typescript
import {
  SnowballFactoryABI,
  SnowballPoolABI,
  SnowballRouterABI,
  NonfungiblePositionManagerABI,
  QuoterV2ABI,
  DynamicFeePluginABI,
  MockERC20ABI,
} from '@snowball/shared/abis';
```

---

## 10. Key UX Patterns

### 10.1 Token Approval Flow

**Best Practice**: Approve + Swap을 하나의 버튼으로
```
[Approve wCTC] → (TX 1) → [Swap] → (TX 2) → Done
```
- 첫 번째 클릭: approve 트랜잭션 전송
- 자동 대기 후 버튼이 "Swap"으로 변경
- 두 번째 클릭: 실제 스왑 실행

**Infinite Approval**: 기본적으로 무한 승인, Settings에서 "Exact Amount" 옵션 제공

### 10.2 Dynamic Fee Display

Algebra V4의 핵심 차별점 — 수수료가 고정이 아닌 동적:

```
┌─────────────────────┐
│ Dynamic Fee: 0.52%   │
│ ◐ 0.05% ━━━━●━ 1.0% │
│ (Auto-adjusting)     │
└─────────────────────┘
```

- 현재 수수료 숫자 표시
- 수수료 범위 게이지 바 (minFee~maxFee)
- "Dynamic" 라벨 + 툴팁: "수수료는 시장 변동성에 따라 자동 조정됩니다"

### 10.3 Price Impact Warning

```
Impact < 1%   → 초록색, 정상
Impact 1-3%   → 노란색, "Price impact warning"
Impact 3-5%   → 주황색, 경고 모달 (확인 필요)
Impact > 5%   → 빨간색, "HIGH PRICE IMPACT" 강조, Expert Mode에서만 실행 가능
```

### 10.4 Stale Price Detection

QuoterV2 결과가 오래된 경우 (15초 이상):
- "Price may have changed. Click to refresh." 배너
- 자동 새로고침 타이머 (configurable)

### 10.5 Error States

| Scenario | UI Response |
|----------|-------------|
| RPC 연결 실패 | "Unable to connect to Creditcoin Testnet. Please check your connection." |
| 트랜잭션 실패 | Toast + 에러 메시지 + "Try again" 버튼 |
| 유동성 부족 | "Insufficient liquidity for this trade" |
| 가스 부족 | "Insufficient CTC for gas fees" |
| 네트워크 불일치 | "Please switch to Creditcoin Testnet" + 자동 전환 버튼 |

---

## 11. Development Phases

### Phase 1: MVP (2-3 weeks)

- [x] Swap Page (full functionality)
- [x] Token Selector Modal
- [x] Wallet Connection (RainbowKit)
- [x] Network handling (Creditcoin Testnet)
- [x] QuoterV2 integration for price quotes
- [x] Transaction flow (approve → swap)
- [x] Toast notifications

### Phase 2: Liquidity (2-3 weeks)

- [ ] Pool List page
- [ ] My Positions page
- [ ] Add Liquidity page (concentrated liquidity UI)
- [ ] Position Detail page
- [ ] Collect / Increase / Remove liquidity actions
- [ ] Liquidity density chart

### Phase 3: Analytics & Polish (1-2 weeks)

- [ ] Analytics dashboard
- [ ] Pool detail page
- [ ] Token detail page
- [ ] Price charts (TradingView Lightweight Charts)
- [ ] Dark/Light theme toggle
- [ ] Mobile optimization

### Phase 4: Advanced (Future)

- [ ] Multi-hop swap routing visualization
- [ ] Historical fee data charts (DynamicFeePlugin)
- [ ] Farm/Staking page (if reward contracts deployed)
- [ ] Automated liquidity management integration
- [ ] Transaction history persistence (localStorage)
- [ ] PWA support

---

## 12. File Structure (Recommended)

```
packages/frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout + providers
│   │   ├── page.tsx              # → Swap page
│   │   ├── swap/
│   │   │   └── page.tsx
│   │   ├── pool/
│   │   │   ├── page.tsx          # Pool list + My Positions
│   │   │   ├── add/
│   │   │   │   └── page.tsx      # Add Liquidity
│   │   │   └── [tokenId]/
│   │   │       └── page.tsx      # Position Detail
│   │   └── analytics/
│   │       ├── page.tsx          # Protocol overview
│   │       ├── pool/
│   │       │   └── [address]/
│   │       │       └── page.tsx  # Pool analytics
│   │       └── token/
│   │           └── [address]/
│   │               └── page.tsx  # Token analytics
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── MobileTabBar.tsx
│   │   │   └── Footer.tsx
│   │   ├── swap/
│   │   │   ├── SwapCard.tsx
│   │   │   ├── TokenInput.tsx
│   │   │   ├── SwapButton.tsx
│   │   │   ├── TradeDetails.tsx
│   │   │   └── SwapConfirmModal.tsx
│   │   ├── pool/
│   │   │   ├── PoolTable.tsx
│   │   │   ├── PositionCard.tsx
│   │   │   ├── PriceRangeSelector.tsx
│   │   │   ├── LiquidityChart.tsx
│   │   │   └── DepositAmounts.tsx
│   │   ├── common/
│   │   │   ├── TokenSelector.tsx
│   │   │   ├── TokenIcon.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── ConnectButton.tsx
│   │   │   └── NetworkBadge.tsx
│   │   └── analytics/
│   │       ├── StatsCards.tsx
│   │       ├── TVLChart.tsx
│   │       ├── VolumeChart.tsx
│   │       └── PoolsTable.tsx
│   ├── hooks/
│   │   ├── useSwap.ts            # Swap logic + QuoterV2
│   │   ├── usePool.ts            # Pool data fetching
│   │   ├── usePositions.ts       # NFT position management
│   │   ├── useTokenBalance.ts    # Token balance
│   │   ├── useApproval.ts        # ERC20 approval
│   │   ├── useDynamicFee.ts      # DynamicFeePlugin queries
│   │   └── useTokenList.ts       # Token metadata
│   ├── config/
│   │   ├── addresses.json        # Contract addresses
│   │   ├── tokens.ts             # Token list + metadata
│   │   ├── chains.ts             # Chain config
│   │   └── wagmi.ts              # wagmi config
│   ├── lib/
│   │   ├── contracts.ts          # Contract instances
│   │   ├── math.ts               # Price/tick math utils
│   │   ├── format.ts             # Number formatting
│   │   └── constants.ts          # App constants
│   └── styles/
│       └── globals.css           # Tailwind + CSS variables
├── public/
│   ├── tokens/                   # Token icon images
│   │   ├── ctc.svg
│   │   ├── wctc.svg
│   │   ├── usdc.svg
│   │   ├── sbusd.svg
│   │   └── lstctc.svg
│   └── favicon.ico
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 13. Token List

```typescript
export const TOKENS = {
  CTC: {
    symbol: 'CTC',
    name: 'Creditcoin',
    decimals: 18,
    address: null, // native token
    icon: '/tokens/ctc.svg',
    isNative: true,
  },
  wCTC: {
    symbol: 'wCTC',
    name: 'Wrapped CTC',
    decimals: 18,
    address: '0x1aced2a3e477c5813d9d0d82135d142dd4d9146e',
    icon: '/tokens/wctc.svg',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0xcdce6a74a3e5a33ddb689da0ce1e2b6caaa38235',
    icon: '/tokens/usdc.svg',
  },
  sbUSD: {
    symbol: 'sbUSD',
    name: 'Snowball USD',
    decimals: 18,
    address: '0x0d8b839133d2a2ce7956ea69d48f0e68bd915d9c',
    icon: '/tokens/sbusd.svg',
  },
  lstCTC: {
    symbol: 'lstCTC',
    name: 'Liquid Staked CTC',
    decimals: 18,
    address: '0x13e6d846c3846c496764990a3ae2561a96fc87bf',
    icon: '/tokens/lstctc.svg',
  },
};
```

---

## 14. Algebra V4 특이사항 (Uniswap V3 대비)

| Feature | Uniswap V3 | Algebra V4 (Snowball) |
|---------|-----------|----------------------|
| Pool per Pair | 여러 fee tier별 별도 풀 | **풀 1개/페어** (단일 풀) |
| Fee | 고정 (0.01/0.05/0.3/1%) | **동적** (DynamicFeePlugin) |
| Fee Tier 선택 UI | 필요 (fee tier 선택) | **불필요** (자동) |
| Pool 조회 | `getPool(token0, token1, fee)` | `poolByPair(token0, token1)` |
| Pool State | `slot0()` | `globalState()` |
| Plugin System | 없음 | Plugin hooks (beforeSwap, afterSwap...) |
| Router | SwapRouter | SnowballRouter (3-arg 생성자) |

**UI 영향**: fee tier 선택 단계가 없어 Swap/LP 플로우가 더 간단합니다.

---

## Appendix A: Figma/Design Reference

참고할 DEX UI:
- **QuickSwap V3** (Polygon, Algebra 기반): quickswap.exchange
- **SwapX** (Sonic, Algebra V4 기반): swapx.fi
- **Camelot V2** (Arbitrum): app.camelot.exchange
- **Uniswap V3**: app.uniswap.org (concentrated liquidity 표준)

---

## Appendix B: Key Contract ABIs

ABIs는 `packages/shared/src/abis/index.ts`에서 import.

주요 함수 시그니처:

```solidity
// SnowballRouter
function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

// QuoterV2
function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
    external returns (uint256 amountOut, uint16 fee);
function quoteExactInput(bytes memory path, uint256 amountIn)
    external returns (uint256 amountOut, uint16[] memory fees);

// NonfungiblePositionManager
function mint(MintParams calldata params) external payable
    returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
function increaseLiquidity(IncreaseLiquidityParams calldata params)
    external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);
function decreaseLiquidity(DecreaseLiquidityParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);
function collect(CollectParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);

// IAlgebraPool
function globalState() external view
    returns (uint160 price, int24 tick, uint16 lastFee, uint8 pluginConfig, uint16 communityFee, bool unlocked);
function liquidity() external view returns (uint128);

// DynamicFeePlugin
function getFee(address pool) external view returns (uint16);
function poolConfig(address pool) external view
    returns (uint16 minFee, uint16 maxFee, uint32 volatilityWindow, bool registered);
```
