# Snowball Lend — 프론트엔드 개발 요청서

## 1. 개요

Snowball Lend(Morpho Blue 포크)의 렌딩 프로토콜 프론트엔드를 **기존 Snowball FE**(`/snowball/packages/frontend/`)에 통합 개발합니다.

**기존 Snowball FE**: Liquity 포크 기반 CDP(Trove) 프로토콜 UI
**추가할 Snowball Lend**: Morpho Blue 포크 기반 P2P 렌딩 마켓 UI

하나의 앱 안에서 사이드바 네비게이션으로 두 프로토콜을 전환할 수 있어야 합니다.

---

## 2. 기존 Snowball FE 기술 스택 (반드시 동일하게 사용)

| 항목 | 기술 |
|------|------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3.4 (커스텀 다크 테마) |
| Web3 | Wagmi 2 + Viem 2 |
| Auth | Privy (Email, Wallet, Google) |
| Data Fetching | TanStack React Query 5 |
| Routing | React Router DOM 6 |
| Charts | Recharts |
| Icons | Lucide React |
| Network | Creditcoin Testnet (Chain ID: 102031) |

---

## 3. 디자인 시스템 (기존 Snowball FE 준수)

### 컬러 팔레트

```
배경:     dark-900 (#0a0a0f), dark-800 (#0d1117), dark-700 (#111827)
카드:     dark-600 (#1a2035), dark-500 (#1e293b), dark-400 (#2d3748)
액센트:   ice-50 ~ ice-600 (primary: #60a5fa)
상태:     safe (#22c55e), warn (#eab308), danger (#ef4444)
```

### 타이포그래피

```
Sans: Inter, system-ui, sans-serif
Mono: JetBrains Mono, Fira Code (수치 표시용)
```

### 기존 CSS 유틸리티 재사용

```css
.card          — 다크 카드 (border + padding + rounded-2xl)
.card-hover    — hover 효과
.btn-primary   — 블루 그라데이션 버튼
.btn-secondary — 다크 보조 버튼
.input         — 폼 입력 필드
```

### 컴포넌트 패턴

- 카드: `rounded-2xl`, `p-4` ~ `p-6`, `border border-dark-500`
- 간격: `gap-2`, `gap-3`, `gap-4`, `gap-6` 일관 유지
- 로딩: `animate-pulse` 스켈레톤
- 에러: `AlertTriangle` 아이콘 + 빨간 텍스트
- 성공: `CheckCircle` 아이콘 + 초록 텍스트
- 모바일: `lg:` 이상에서 사이드바, 미만에서 하단 네비게이션

---

## 4. 사이드바 네비게이션 통합

기존 사이드바에 **"Lend" 섹션**을 추가합니다.

```
┌──────────────────────┐
│  ❄️ Snowball          │
│                      │
│  ── Protocol ──      │
│  📊 Dashboard        │
│  💰 Borrow (Trove)   │
│  🏦 Earn (SP)        │
│  📈 Stats            │
│                      │
│  ── Lend ──          │  ← 새로 추가
│  🏪 Markets          │
│  💵 Supply           │
│  🔑 Borrow           │
│  📋 Positions        │
│                      │
│  ── AI ──            │
│  🤖 Agent            │
│  💬 Chat             │
└──────────────────────┘
```

---

## 5. 새 라우트 구조

```
/lend                  → Lend 대시보드 (마켓 요약 + 내 포지션 요약)
/lend/markets          → 마켓 리스트 (전체 마켓 탐색)
/lend/markets/:id      → 마켓 상세 (Supply/Borrow 실행)
/lend/positions        → 내 포지션 전체 보기
```

---

## 6. 페이지별 상세 디자인

### 6.1 Lend Dashboard (`/lend`)

프로토콜 전체 현황 + 내 포지션 요약을 한 눈에 보여주는 페이지.

```
┌─────────────────────────────────────────────────────────┐
│  Snowball Lend                                          │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Total     │ │Total     │ │Total     │ │ Markets  │  │
│  │Supply    │ │Borrow    │ │Liquidity │ │ Active   │  │
│  │$2.4M    │ │$1.1M    │ │$1.3M    │ │ 3       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ── My Positions ──────────────────────────────────     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ wCTC / sbUSD          Supply: 500 sbUSD         │   │
│  │ LLTV 77%   APY 3.2%   Earned: +2.1 sbUSD       │   │
│  │                                    [Manage →]   │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ lstCTC / sbUSD        Borrow: 200 sbUSD         │   │
│  │ LLTV 80%   APR 5.1%   Collateral: 100 lstCTC   │   │
│  │ Health: ████████░░ 1.82        [Manage →]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ── Top Markets ───────────────────────────────────     │
│                                                         │
│  ┌───────────────┬──────────┬──────────┬──────────┐   │
│  │ Market        │ Supply   │ Borrow   │ Supply   │   │
│  │               │ APY      │ APR      │ TVL      │   │
│  ├───────────────┼──────────┼──────────┼──────────┤   │
│  │ wCTC/sbUSD    │ 3.2%     │ 5.1%     │ $1.2M    │   │
│  │ lstCTC/sbUSD  │ 3.5%     │ 5.4%     │ $800K    │   │
│  │ sbUSD/USDC    │ 2.1%     │ 3.8%     │ $400K    │   │
│  └───────────────┴──────────┴──────────┴──────────┘   │
│                              [View All Markets →]      │
└─────────────────────────────────────────────────────────┘
```

**데이터 소스:**
- `market(id)` → totalSupplyAssets, totalBorrowAssets
- `AdaptiveCurveIRM.borrowRateView()` → APR 계산
- Supply APY = Borrow APR × utilization × (1 - fee)
- 오라클 가격으로 USD 환산

---

### 6.2 Markets (`/lend/markets`)

전체 마켓 리스트. 각 마켓의 핵심 지표를 카드 또는 테이블 형태로 표시.

```
┌─────────────────────────────────────────────────────────┐
│  Markets                                    [Search 🔍] │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  wCTC / sbUSD                                    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │Util.   │ │Supply  │ │Borrow  │ │LLTV    │   │   │
│  │  │65.3%   │ │APY     │ │APR     │ │77%     │   │   │
│  │  │████▓░░ │ │3.2%    │ │5.1%    │ │        │   │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │   │
│  │                                                  │   │
│  │  Total Supply: $1.2M    Total Borrow: $780K      │   │
│  │  Available Liquidity: $420K                      │   │
│  │                                                  │   │
│  │  [Supply →]  [Borrow →]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  lstCTC / sbUSD                                  │   │
│  │  ... (동일 구조)                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  sbUSD / USDC                                    │   │
│  │  ... (동일 구조)                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Utilization Bar**: 시각적 게이지 (파란색 그라데이션, 90% 이상이면 빨간색)

---

### 6.3 Market Detail (`/lend/markets/:id`)

특정 마켓의 상세 정보 + Supply/Borrow 실행 패널.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back    wCTC / sbUSD    LLTV 77%                     │
│                                                         │
│  ┌─── Market Info ──────────────────────────────────┐  │
│  │                                                   │  │
│  │  Total Supply    Total Borrow   Utilization       │  │
│  │  $1,200,000      $780,000       65.3%             │  │
│  │                                                   │  │
│  │  Supply APY     Borrow APR     Available          │  │
│  │  3.2%           5.1%           $420,000           │  │
│  │                                                   │  │
│  │  Oracle Price: $5.00    IRM: Adaptive Curve       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─── Interest Rate Curve (Recharts) ───────────────┐  │
│  │                                                   │  │
│  │  Y: Borrow APR (%)                                │  │
│  │  X: Utilization (0% → 100%)                       │  │
│  │  현재 위치를 점으로 표시                             │  │
│  │  90% 타겟 지점에 점선                               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─── Action Panel ─────────────────────────────────┐  │
│  │                                                   │  │
│  │  [ Supply ]  [ Borrow ]    ← 탭 전환               │  │
│  │                                                   │  │
│  │  ┌─── Supply 탭 ────────────────────────────┐     │  │
│  │  │                                          │     │  │
│  │  │  Amount   [_______________] [MAX]         │     │  │
│  │  │  Balance: 1,234.56 sbUSD                 │     │  │
│  │  │                                          │     │  │
│  │  │  You will receive: ~1,234 supply shares  │     │  │
│  │  │  Current APY: 3.2%                       │     │  │
│  │  │                                          │     │  │
│  │  │  [Approve sbUSD]  →  [Supply]            │     │  │
│  │  └──────────────────────────────────────────┘     │  │
│  │                                                   │  │
│  │  ┌─── Borrow 탭 ───────────────────────────┐     │  │
│  │  │                                          │     │  │
│  │  │  Collateral  [_______________] [MAX]      │     │  │
│  │  │  Balance: 500.00 wCTC                    │     │  │
│  │  │                                          │     │  │
│  │  │  Borrow Amount [_______________]          │     │  │
│  │  │  Max Borrow: 1,925 sbUSD (77% LLTV)      │     │  │
│  │  │                                          │     │  │
│  │  │  Health Factor: ████████░░ 1.82           │     │  │
│  │  │  Liquidation Price: $2.60                │     │  │
│  │  │  Current APR: 5.1%                       │     │  │
│  │  │                                          │     │  │
│  │  │  [Approve wCTC] → [Supply Collateral]    │     │  │
│  │  │                 → [Borrow]               │     │  │
│  │  └──────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Health Factor 계산:**
```
healthFactor = (collateral × oraclePrice × LLTV) / borrowedAssets
색상: >= 2.0 green, >= 1.5 yellow, < 1.5 red
```

**Liquidation Price 계산:**
```
liqPrice = borrowedAssets / (collateral × LLTV)
```

---

### 6.4 My Positions (`/lend/positions`)

사용자의 모든 Supply/Borrow 포지션을 마켓별로 표시.

```
┌─────────────────────────────────────────────────────────┐
│  My Positions                                           │
│                                                         │
│  ── Supply Positions ──────────────────────────────     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  wCTC / sbUSD                                    │   │
│  │                                                  │   │
│  │  Supplied: 500 sbUSD ($500)                      │   │
│  │  Shares: 499,998,000                             │   │
│  │  APY: 3.2%    Earned: +2.1 sbUSD                │   │
│  │                                                  │   │
│  │  [Withdraw]  [Supply More]                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ── Borrow Positions ─────────────────────────────     │
│                                                         │
│  │ ┌─────────────────────────────────────────────┐ │   │
│  │ │  lstCTC / sbUSD                              │ │   │
│  │ │                                              │ │   │
│  │ │  Collateral: 100 lstCTC ($500)               │ │   │
│  │ │  Borrowed: 200 sbUSD ($200)                  │ │   │
│  │ │  APR: 5.4%                                   │ │   │
│  │ │                                              │ │   │
│  │ │  Health: ████████████░░░ 2.00                │ │   │
│  │ │  Liq. Price: $2.50                           │ │   │
│  │ │                                              │ │   │
│  │ │  [Repay] [Add Collateral] [Withdraw Coll.]   │ │   │
│  │ └─────────────────────────────────────────────┘ │   │
│                                                         │
│  ── No Supply Collateral without Borrow ───────────    │
│  (담보만 넣고 빌리지 않은 포지션 표시)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 트랜잭션 플로우 (Multi-Step)

기존 Snowball FE의 multi-step 패턴 동일 적용:

```
[Idle] → [Approving...] → [Signing...] → [Confirming...] → [Done ✓]
          Loader2 spin     Loader2 spin    Loader2 spin     CheckCircle
```

### 7.1 Supply 플로우

```
1. 사용자 입력: amount (assets) 또는 shares
2. [Approve] loanToken → SnowballLend 컨트랙트
3. [Supply] lend.supply(id, assets, 0, onBehalf, "0x")
4. 성공 → 포지션 업데이트, 토스트 알림
```

### 7.2 Borrow 플로우 (Collateral + Borrow 2단계)

```
1. 사용자 입력: collateral amount + borrow amount
2. [Approve] collateralToken → SnowballLend
3. [Supply Collateral] lend.supplyCollateral(id, collAmount, onBehalf, "0x")
4. [Borrow] lend.borrow(id, borrowAmount, 0, onBehalf, receiver)
5. 성공 → Health Factor 표시, 토스트 알림
```

### 7.3 Withdraw 플로우

```
1. 사용자 입력: amount 또는 shares
2. [Withdraw] lend.withdraw(id, assets, 0, onBehalf, receiver)
3. 성공 → 잔액 업데이트
```

### 7.4 Repay 플로우

```
1. 사용자 입력: repay amount 또는 shares
2. [Approve] loanToken → SnowballLend
3. [Repay] lend.repay(id, assets, 0, onBehalf, "0x")
4. 성공 → Health Factor 업데이트
```

### 7.5 Withdraw Collateral 플로우

```
1. 사용자 입력: amount
2. [Withdraw Collateral] lend.withdrawCollateral(id, assets, onBehalf, receiver)
3. 실패 시: "Insufficient collateral — Health Factor would be too low"
```

---

## 8. 필요한 React Hooks

### 데이터 읽기 (useQuery)

```typescript
// hooks/lend/useLendMarkets.ts
// 모든 마켓의 상태를 읽어옴
// - market(id) → totalSupplyAssets, totalBorrowAssets, totalSupplyShares, totalBorrowShares, lastUpdate, fee
// - idToMarketParams(id) → loanToken, collateralToken, oracle, irm, lltv
// - oracle.getPrice() → 가격
// - irm.borrowRateView(id, totalSupply, totalBorrow) → 현재 금리
// refetchInterval: 10_000 (10초)

// hooks/lend/useLendPosition.ts
// 특정 마켓에서 사용자의 포지션
// - supplyShares(id, user) → shares
// - borrowShares(id, user) → shares
// - collateral(id, user) → amount
// shares → assets 변환은 프론트에서 계산:
//   assets = shares * (totalAssets + 1) / (totalShares + 1e6)

// hooks/lend/useLendPositions.ts
// 사용자의 모든 마켓 포지션 (3개 마켓 순회)

// hooks/lend/useHealthFactor.ts
// 특정 포지션의 Health Factor 계산
// healthFactor = (collateral * oraclePrice / 1e36 * lltv / 1e18) / borrowedAssets

// hooks/lend/useTokenBalance.ts
// ERC-20 토큰 잔액 조회 (기존 useUserBalance 확장)
```

### 트랜잭션 실행 (useMutation)

```typescript
// hooks/lend/useLendSupply.ts
// 1. approve loanToken
// 2. lend.supply(id, assets, 0, user, "0x")

// hooks/lend/useLendWithdraw.ts
// lend.withdraw(id, assets, 0, user, user)

// hooks/lend/useLendBorrow.ts
// lend.borrow(id, assets, 0, user, user)

// hooks/lend/useLendRepay.ts
// 1. approve loanToken
// 2. lend.repay(id, assets, 0, user, "0x")

// hooks/lend/useLendSupplyCollateral.ts
// 1. approve collateralToken
// 2. lend.supplyCollateral(id, assets, user, "0x")

// hooks/lend/useLendWithdrawCollateral.ts
// lend.withdrawCollateral(id, assets, user, user)
```

---

## 9. 컨트랙트 연동 정보

### 배포된 컨트랙트 주소

```json
{
  "snowballLend": "0x7d604b31297b36aace73255931f65e891cf289d3",
  "adaptiveCurveIRM": "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
  "tokens": {
    "wCTC": "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969",
    "lstCTC": "0x72968ff9203dc5f352c5e42477b84d11c8c8f153",
    "sbUSD": "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",
    "mockUSDC": "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed"
  },
  "oracles": {
    "wCTCOracle": "0x42ca12a83c14e95f567afc940b0118166d8bd852",
    "lstCTCOracle": "0x192f1feb36f319e79b3bba25a17359ee72266a14",
    "sbUSDOracle": "0xc39f222e034f4bd4f3c858e6fde9ce4398400a26"
  }
}
```

### ABI 임포트

```typescript
import {
  SnowballLendABI,
  AdaptiveCurveIRMABI,
  MockOracleABI,
  MockERC20ABI,
} from "@snowball/shared/abis";
```

### 마켓 ID 계산

```typescript
import { encodeAbiParameters, keccak256 } from "viem";

function getMarketId(params: {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
      ],
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    )
  );
}
```

### 마켓 정의 (하드코딩 가능)

```typescript
const LEND_MARKETS = [
  {
    name: "wCTC / sbUSD",
    loanToken: TOKENS.sbUSD,
    collateralToken: TOKENS.wCTC,
    oracle: ORACLES.wCTC,
    irm: CONTRACTS.adaptiveCurveIRM,
    lltv: parseEther("0.77"),
    loanSymbol: "sbUSD",
    collSymbol: "wCTC",
    loanDecimals: 18,
    collDecimals: 18,
  },
  {
    name: "lstCTC / sbUSD",
    loanToken: TOKENS.sbUSD,
    collateralToken: TOKENS.lstCTC,
    oracle: ORACLES.lstCTC,
    irm: CONTRACTS.adaptiveCurveIRM,
    lltv: parseEther("0.80"),
    loanSymbol: "sbUSD",
    collSymbol: "lstCTC",
    loanDecimals: 18,
    collDecimals: 18,
  },
  {
    name: "sbUSD / USDC",
    loanToken: TOKENS.mockUSDC,
    collateralToken: TOKENS.sbUSD,
    oracle: ORACLES.sbUSD,
    irm: CONTRACTS.adaptiveCurveIRM,
    lltv: parseEther("0.86"),
    loanSymbol: "USDC",
    collSymbol: "sbUSD",
    loanDecimals: 6,     // ⚠️ USDC는 6 decimals
    collDecimals: 18,
  },
];
```

---

## 10. Shares ↔ Assets 변환 공식

프론트엔드에서 반드시 올바르게 구현해야 하는 핵심 수학:

```typescript
const VIRTUAL_SHARES = 1_000_000n;  // 1e6
const VIRTUAL_ASSETS = 1n;

// shares → assets (내림, 사용자가 실제로 받을 수 있는 양)
function toAssetsDown(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
}

// assets → shares (내림, supply/repay 시 사용자에게 유리하지 않은 방향)
function toSharesDown(assets: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return (assets * (totalShares + VIRTUAL_SHARES)) / (totalAssets + VIRTUAL_ASSETS);
}
```

---

## 11. 금리 표시 계산

```typescript
// IRM에서 반환하는 borrowRate는 "초당 이율" (WAD 단위)
// APR로 변환:
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;

function borrowRateToAPR(ratePerSecond: bigint): number {
  // APR = ratePerSecond × secondsPerYear × 100
  return Number(ratePerSecond * SECONDS_PER_YEAR) / 1e18 * 100;
}

// Supply APY = Borrow APR × utilization × (1 - fee)
function supplyAPY(borrowAPR: number, utilization: number, fee: number): number {
  return borrowAPR * utilization * (1 - fee);
}

// Utilization = totalBorrow / totalSupply
function utilization(totalBorrow: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number(totalBorrow * 10000n / totalSupply) / 100; // percentage
}
```

---

## 12. 토큰 아이콘 매핑

```
wCTC   → Creditcoin 로고 (또는 파란 원형 C)
lstCTC → Creditcoin 로고 + 스테이킹 표시
sbUSD  → Snowball 로고 (❄️ 눈꽃)
USDC   → USDC 로고 (파란 달러)
```

마켓 카드에서 두 토큰을 겹쳐서 표시:
```
[collToken]
  [loanToken]  wCTC / sbUSD
```

---

## 13. 모바일 반응형

| Breakpoint | 레이아웃 |
|------------|---------|
| < `lg` | 하단 네비게이션, 단일 컬럼, 카드 전체 너비 |
| >= `lg` | 사이드바 + 메인 컨텐츠, 2-3 컬럼 그리드 |

Market Detail 페이지의 Action Panel:
- **데스크톱**: 오른쪽 사이드 패널 (sticky)
- **모바일**: 하단 시트 또는 전체 너비 카드

---

## 14. 에러 처리

| 시나리오 | UI 표시 |
|---------|---------|
| 지갑 미연결 | "Connect Wallet" 버튼 표시 |
| 잔액 부족 | 입력 필드 빨간 테두리 + "Insufficient balance" |
| Health Factor < 1.0 | 빨간 경고 + 트랜잭션 차단 |
| Approve 실패 | 토스트 에러 + 재시도 버튼 |
| TX 실패 | 에러 메시지 + 블록스카우트 링크 |
| Liquidity 부족 (Withdraw/Borrow) | "Not enough liquidity in the market" |

---

## 15. 추가 기능 (Nice to Have)

### 15.1 Faucet 버튼

MockUSDC에 `faucet()` 함수가 있으므로 USDC 마켓 페이지에 Faucet 버튼 표시:

```
[🚰 Get Test USDC]  → MockERC20.faucet()
```

### 15.2 Authorization 관리

`setAuthorization` 기능 — Settings 또는 Positions 페이지에:

```
Authorized Addresses
┌─────────────────────────────────┐
│ 0xABC...DEF    [Revoke]        │
│ [+ Add Address]                │
└─────────────────────────────────┘
```

### 15.3 Interest Rate Curve 차트

Market Detail에서 Recharts `AreaChart`로 금리 커브 시각화:
- X축: Utilization 0% → 100%
- Y축: Borrow Rate
- 90% 타겟 유틸리제이션에 점선
- 현재 위치에 빛나는 점

---

## 16. 파일 구조 (신규 추가분)

```
src/
├── pages/
│   ├── lend/
│   │   ├── LendDashboard.tsx
│   │   ├── LendMarkets.tsx
│   │   ├── LendMarketDetail.tsx
│   │   └── LendPositions.tsx
│   └── ... (기존 페이지)
│
├── components/
│   ├── lend/
│   │   ├── MarketCard.tsx          # 마켓 요약 카드
│   │   ├── PositionCard.tsx        # 포지션 카드 (supply/borrow)
│   │   ├── SupplyPanel.tsx         # Supply 실행 패널
│   │   ├── BorrowPanel.tsx         # Borrow 실행 패널 (collateral + borrow)
│   │   ├── RepayPanel.tsx          # Repay 실행 패널
│   │   ├── WithdrawPanel.tsx       # Withdraw 실행 패널
│   │   ├── HealthFactorBar.tsx     # Health Factor 시각화
│   │   ├── UtilizationBar.tsx      # Utilization 게이지
│   │   ├── InterestRateCurve.tsx   # 금리 커브 차트
│   │   ├── LendStatCard.tsx        # 통계 카드
│   │   └── MarketTokenPair.tsx     # 토큰 쌍 아이콘 + 이름
│   └── ... (기존 컴포넌트)
│
├── hooks/
│   ├── lend/
│   │   ├── useLendMarkets.ts       # 마켓 데이터 조회
│   │   ├── useLendPosition.ts      # 단일 마켓 포지션
│   │   ├── useLendPositions.ts     # 전체 포지션
│   │   ├── useHealthFactor.ts      # Health Factor 계산
│   │   ├── useLendSupply.ts        # Supply TX
│   │   ├── useLendWithdraw.ts      # Withdraw TX
│   │   ├── useLendBorrow.ts        # Borrow TX
│   │   ├── useLendRepay.ts         # Repay TX
│   │   ├── useLendSupplyCollateral.ts
│   │   ├── useLendWithdrawCollateral.ts
│   │   └── useLendFaucet.ts        # MockUSDC faucet
│   └── ... (기존 hooks)
│
├── config/
│   ├── lendContracts.ts            # Lend 컨트랙트 주소 + 마켓 정의
│   └── ... (기존 config)
│
└── lib/
    ├── lendMath.ts                 # shares↔assets 변환, 금리 계산, healthFactor
    └── ... (기존 lib)
```

---

## 17. 개발 순서 권장

```
Phase 1 — 기반 (1~2일)
├── config/lendContracts.ts (주소, 마켓 정의)
├── lib/lendMath.ts (shares 변환, 금리 계산)
├── hooks/lend/useLendMarkets.ts
├── hooks/lend/useLendPosition.ts
└── 사이드바에 Lend 섹션 추가 + 라우트 등록

Phase 2 — Markets 페이지 (2~3일)
├── LendMarkets.tsx (마켓 리스트)
├── MarketCard.tsx
├── UtilizationBar.tsx
├── MarketTokenPair.tsx
└── LendDashboard.tsx (요약)

Phase 3 — Market Detail + 실행 (3~4일)
├── LendMarketDetail.tsx
├── SupplyPanel.tsx + useLendSupply
├── BorrowPanel.tsx + useLendBorrow + useLendSupplyCollateral
├── HealthFactorBar.tsx
├── InterestRateCurve.tsx
└── useHealthFactor.ts

Phase 4 — Positions + 관리 (2~3일)
├── LendPositions.tsx
├── PositionCard.tsx
├── WithdrawPanel.tsx + useLendWithdraw
├── RepayPanel.tsx + useLendRepay
├── useLendWithdrawCollateral
└── useLendPositions.ts

Phase 5 — 마무리 (1~2일)
├── 모바일 반응형 검수
├── 에러 핸들링 + 토스트
├── Faucet 버튼
└── E2E 테스트
```

**총 예상: 9~14일**

---

## 18. 참고 자료

- 기존 Snowball FE 코드: `/snowball/packages/frontend/`
- 배포된 주소: `/ctc-morpho/deployments/addresses.json`
- ABI 정의: `/ctc-morpho/packages/shared/src/abis/index.ts`
- 컨트랙트 소스: `/ctc-morpho/packages/contracts-morpho/src/SnowballLend.sol`
- Morpho Blue 원본 UI 참고: https://app.morpho.org
- 네트워크: Creditcoin Testnet (Chain ID: 102031, RPC: https://rpc.cc3-testnet.creditcoin.network)
