# Snowball 통합 프론트엔드 설계

> 전 프로토콜을 하나의 UI에서 운영하는 통합 DeFi 프론트엔드
> Version: v0.2.0 | Status: Draft
> Last updated: 2026-02-25
> [INDEX](../INDEX.md)
> [v0.1.0 snapshot](../archive/v0.1.0/DESIGN_FRONTEND.md)

---

## 1. 설계 방향

### 현재 문제

```
현재 구조:
snowball-app (localhost:5173)  ← Liquity + Lend 별도 앱
snowball-dex (localhost:3000)  ← DEX 별도 앱

유저 경험:
- 2개 앱을 왔다갔다 해야 함
- 지갑 2번 연결
- 내 자산 현황을 한 눈에 볼 수 없음
- sSNOW 스테이킹 UI 없음
```

### 목표

```
통합 구조:
snowball-app (하나의 앱)
├── / (Dashboard)         ← 전체 포트폴리오 + sSNOW
├── /swap                 ← DEX 스왑
├── /pool                 ← LP 관리
├── /lend                 ← Lending
├── /vault                ← Yield Vault
├── /stake                ← sSNOW 스테이킹
└── /govern               ← 거버넌스

유저 경험:
- 하나의 앱, 하나의 지갑 연결
- 전체 자산 + 수익 한 눈에 확인
- 프로토콜 간 이동이 자연스러움
```

---

## 2. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Next.js 14** (App Router) | SSR, 라우팅, 성능 |
| 웹3 | wagmi 2 + viem 2 | 타입 안전, hooks 패턴 |
| 인증/지갑 | **Privy** (`@privy-io/react-auth`, `@privy-io/wagmi`) | 소셜 로그인 + 지갑 통합, 임베디드 월렛 |
| 상태 관리 | Zustand + React Query | 서버 상태 + 클라이언트 상태 분리 |
| UI | Tailwind CSS + Radix UI | 커스텀 디자인 시스템 |
| 차트 — Options | **Lightweight Charts** (TradingView) | BTC 실시간 캔들/라인 차트 |
| 차트 — 기타 | Recharts | 포트폴리오, Revenue 차트 |

> **v0.2.0 변경:**
> - ~~RainbowKit 2~~ → Privy (`@privy-io/react-auth`, `@privy-io/wagmi`)
> - 추가: `lightweight-charts` (Options BTC 차트)
> - 제거: `@rainbow-me/rainbowkit`

---

## 3. 정보 구조 (Information Architecture)

```
Snowball App
│
├── Dashboard (/)
│   ├── Portfolio Summary (총 자산, 수익, APY)
│   ├── sSNOW Status (보유량, 수익률, 가치)
│   ├── Protocol Revenue (실시간 수수료 현황)
│   └── Quick Actions (Stake, Swap, Supply)
│
├── Swap (/swap)
│   ├── Token Swap (Uniswap V3)
│   └── StableSwap (sbUSD ↔ USDC)
│
├── Pool (/pool)
│   ├── Pool List (/pool)
│   ├── Add Liquidity (/pool/add)
│   ├── Pool Detail (/pool/[id])
│   └── My Positions (/pool/positions)
│
├── Lend (/lend)
│   ├── Market Overview (/lend)
│   ├── Market Detail (/lend/[id])
│   │   ├── Supply Panel
│   │   └── Borrow Panel
│   └── My Positions (/lend/positions)
│
├── Earn (/earn) [기존 Liquity]
│   ├── Borrow (Trove)
│   └── Stability Pool
│
├── Vault (/vault)
│   ├── Vault List (/vault)
│   ├── Vault Detail (/vault/[id])
│   │   ├── Deposit / Withdraw
│   │   └── Strategy Info
│   └── My Vaults (/vault/positions)
│
├── Options (/options) ★NEW
│   ├── BTC 바이너리 옵션 트레이딩 (/options)
│   │   ├── BTC 실시간 차트 (Lightweight Charts)
│   │   ├── Trade Panel (Over/Under, EIP-712 서명)
│   │   ├── Round Info (현재 라운드)
│   │   └── Recent Trades
│   └── Options LP Vault (/options/vault) ★NEW
│       ├── LP 입금/출금
│       └── Vault 성과 (TVL, APY)
│
├── Stake (/stake)
│   ├── SNOW → sSNOW Staking
│   ├── Revenue Dashboard
│   ├── Cooldown Status
│   └── Claim History
│
└── Govern (/govern)
    ├── Proposal List (/govern)
    ├── Proposal Detail (/govern/[id])
    └── Create Proposal (/govern/new)
```

---

## 4. 페이지별 설계

### 4-1. Dashboard (/)

통합 대시보드. 유저의 전체 Snowball 생태계 현황을 한 눈에.

```
┌─────────────────────────────────────────────────────────────────┐
│  Navbar: [Logo] [Dashboard] [Swap] [Pool] [Lend] [Vault]       │
│          [Stake] [Govern]                         [Connect Wallet]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── Portfolio Summary ────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Total Value          Daily Earnings       Total APY     │   │
│  │  $12,450.32           +$4.23               12.4%         │   │
│  │  ▲ +2.3% (24h)        Revenue: Real Yield               │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── sSNOW Card ───────────────┐  ┌─── Revenue Live ───────┐  │
│  │                               │  │                        │  │
│  │  sSNOW Balance               │  │  Protocol Revenue      │  │
│  │  1,250.00 sSNOW              │  │  (24h)                 │  │
│  │  = 1,412.50 SNOW             │  │                        │  │
│  │  ($2,825.00)                 │  │  DEX      $124.50      │  │
│  │                               │  │  Lending   $89.20     │  │
│  │  Price/Share: 1.13 SNOW      │  │  Vault     $12.30     │  │
│  │  Your APY: 14.2%             │  │  Stable     $8.40     │  │
│  │                               │  │  ─────────────────    │  │
│  │  [Stake More]  [Unstake]     │  │  Total    $234.40     │  │
│  │                               │  │  Your Share  $1.82   │  │
│  └───────────────────────────────┘  └────────────────────────┘  │
│                                                                 │
│  ┌─── My Positions ────────────────────────────────────────┐    │
│  │                                                          │   │
│  │  Protocol     Position              Value     APY       │    │
│  │  ─────────────────────────────────────────────────       │    │
│  │  DEX LP       wCTC/sbUSD #1234      $3,200    18.5%     │    │
│  │  Lending      sbUSD Supply          $5,000    6.2%      │    │
│  │  Lending      wCTC Borrow           -$2,100   -4.8%     │    │
│  │  Vault        mooSbUSD-SP           $1,500    22.1%     │    │
│  │  Stake        sSNOW                 $2,825    14.2%     │    │
│  │  Earn (SP)    StabilityPool         $2,025    8.4%      │    │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Revenue Chart ───────────────────────────────────────┐    │
│  │  [7D] [30D] [90D] [ALL]                                 │    │
│  │                                                          │   │
│  │  ████                                                    │    │
│  │  ████ ███                                                │    │
│  │  ████ ███ ████                                           │    │
│  │  ████ ████████ ████                                      │    │
│  │  ──────────────────────                                  │    │
│  │  Daily Protocol Revenue (Stacked Bar)                    │    │
│  │  ■ DEX  ■ Lending  ■ Vault  ■ StableSwap               │    │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 데이터 소스

| 섹션 | 데이터 | 훅 |
|------|--------|-----|
| Portfolio Summary | 전 프로토콜 포지션 합산 | `usePortfolio()` |
| sSNOW Card | sSNOW 잔고, pricePerShare, APY | `useSSNOW()` |
| Revenue Live | RevenueDistributor 이벤트 | `useRevenue()` |
| My Positions | 전 프로토콜 포지션 | `useAllPositions()` |
| Revenue Chart | 히스토리 데이터 (indexed events) | `useRevenueHistory()` |

---

### 4-2. Stake (/stake)

sSNOW 스테이킹 전용 페이지.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─── Stake Overview ──────────────────────────────────────┐    │
│  │                                                          │   │
│  │  Total SNOW Staked        sSNOW Price       Protocol APY │    │
│  │  42,500,000 SNOW          1.13 SNOW         14.2%        │    │
│  │  (42.5% staked)           ($2.26)            Real Yield  │    │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Stake / Unstake ───────┐  ┌─── Revenue Breakdown ────┐   │
│  │                            │  │                           │  │
│  │  [Stake]  [Unstake]       │  │  Revenue Source    Share   │  │
│  │                            │  │  ──────────────────────   │  │
│  │  Amount                   │  │  DEX Swap Fee      42%    │  │
│  │  ┌────────────────────┐   │  │  ████████████████████      │  │
│  │  │ 1000          MAX  │   │  │                           │  │
│  │  └────────────────────┘   │  │  Lending Spread    31%    │  │
│  │                            │  │  ██████████████           │  │
│  │  You will receive:        │  │                           │  │
│  │  884.96 sSNOW             │  │  Vault Fee         15%    │  │
│  │  (at 1.13 SNOW/sSNOW)    │  │  ███████                  │  │
│  │                            │  │                           │  │
│  │  [Stake SNOW]             │  │  StableSwap         7%    │  │
│  │                            │  │  ████                     │  │
│  │  Wallet: 5,230.00 SNOW   │  │                           │  │
│  │                            │  │  Liquidation        5%    │  │
│  └────────────────────────────┘  │  ███                      │  │
│                                  └───────────────────────────┘  │
│                                                                 │
│  ┌─── Cooldown Status ─────────────────────────────────────┐    │
│  │                                                          │   │
│  │  ⏳ Active Cooldown                                      │   │
│  │  500 sSNOW (= 565 SNOW)                                 │    │
│  │  Unlocks: 2026-03-04 14:30 (3d 12h remaining)           │    │
│  │                                                          │   │
│  │  [Complete Withdraw]  [Cancel]  [Early Exit (-2%)]      │    │
│  │                                                          │   │
│  │  No cooldown? sSNOW is earning 14.2% APY right now.     │    │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Price Per Share History ─────────────────────────────┐    │
│  │  [30D] [90D] [1Y] [ALL]                                 │    │
│  │                                                          │   │
│  │  1.15 ─                                          ╱       │    │
│  │  1.10 ─                              ╱──────────╱        │    │
│  │  1.05 ─                    ╱─────────╱                   │    │
│  │  1.00 ─ ──────────────────╱                              │    │
│  │       ───────────────────────────────────────            │    │
│  │       Jan        Feb        Mar        Apr               │    │
│  │                                                          │   │
│  │  sSNOW price = 1 SNOW + accumulated revenue             │    │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Your Earnings History ───────────────────────────────┐    │
│  │                                                          │   │
│  │  Date           Event              Amount                │    │
│  │  ────────────────────────────────────────────            │    │
│  │  2026-02-25     Revenue Compound    +2.34 SNOW          │    │
│  │  2026-02-24     Revenue Compound    +2.18 SNOW          │    │
│  │  2026-02-23     Revenue Compound    +2.45 SNOW          │    │
│  │  2026-02-20     Staked              1,000.00 SNOW       │    │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4-3. Vault (/vault)

Yield Vault 목록 및 예치.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─── Vault Stats ────────────────────────────────────────┐     │
│  │  Total TVL          Vaults Active     Avg APY          │     │
│  │  $8,200,000         4                 16.8%            │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌─── Vault List ─────────────────────────────────────────┐     │
│  │                                                         │    │
│  │  [All] [Stablecoin] [Blue-chip] [My Vaults]            │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🏔️ mooSbUSD-SP                                  │   │    │
│  │  │ sbUSD → Liquity Stability Pool                   │   │    │
│  │  │                                                   │   │    │
│  │  │ APY: 22.1%    TVL: $2.1M    Daily: $1,267        │   │    │
│  │  │ Strategy: StrategySbUSDStabilityPool              │   │    │
│  │  │                                                   │   │    │
│  │  │ Your Deposit: 1,500 sbUSD ($1,500)               │   │    │
│  │  │                        [Deposit]  [Withdraw]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🏔️ mooSbUSD-Morpho                              │   │    │
│  │  │ sbUSD → Morpho Lending Supply                    │   │    │
│  │  │                                                   │   │    │
│  │  │ APY: 8.4%     TVL: $3.5M    Daily: $805          │   │    │
│  │  │ Strategy: StrategySbUSDMorpho                     │   │    │
│  │  │                        [Deposit]  [Withdraw]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🏔️ mooWCTC-Morpho                               │   │    │
│  │  │ wCTC → Morpho Lending Supply                     │   │    │
│  │  │                                                   │   │    │
│  │  │ APY: 12.6%    TVL: $1.8M    Daily: $621          │   │    │
│  │  │ Strategy: StrategyWCTCMorpho                      │   │    │
│  │  │                        [Deposit]  [Withdraw]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ 🏔️ mooUSDC-Morpho                               │   │    │
│  │  │ USDC → Morpho Lending Supply                     │   │    │
│  │  │                                                   │   │    │
│  │  │ APY: 6.2%     TVL: $800K    Daily: $136          │   │    │
│  │  │ Strategy: StrategyUSDCMorpho                      │   │    │
│  │  │                        [Deposit]  [Withdraw]      │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4-4. Swap (/swap)

기존 DEX 스왑 UI를 통합 앱에 포함.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─── Swap ────────────────────────────┐                        │
│  │                                      │                       │
│  │  [Swap]  [StableSwap]               │                       │
│  │                                      │                       │
│  │  From                               │                       │
│  │  ┌──────────────────────────────┐   │                       │
│  │  │  [wCTC ▼]     1,000.00  MAX │   │                       │
│  │  └──────────────────────────────┘   │                       │
│  │                                      │                       │
│  │              ↕ (reverse)             │                       │
│  │                                      │                       │
│  │  To                                 │                       │
│  │  ┌──────────────────────────────┐   │                       │
│  │  │  [sbUSD ▼]    198.50        │   │                       │
│  │  └──────────────────────────────┘   │                       │
│  │                                      │                       │
│  │  Rate: 1 wCTC = 0.1985 sbUSD       │                       │
│  │  Fee: 0.30% ($0.60)                │                       │
│  │  Price Impact: < 0.01%             │                       │
│  │  Slippage: 0.5%              [⚙]   │                       │
│  │                                      │                       │
│  │  [Swap]                             │                       │
│  │                                      │                       │
│  │  → Fee의 92%가 sSNOW 홀더에게 돌아갑니다                     │
│  │                                      │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

StableSwap 탭 전환 시:

```
│  [Swap]  [StableSwap]                   │
│                                          │
│  sbUSD ↔ USDC                           │
│  Low slippage optimized for stablecoins │
│                                          │
│  ┌──────────────────────────────┐       │
│  │  [sbUSD ▼]    10,000   MAX  │       │
│  │  → USDC       9,996.00      │       │
│  └──────────────────────────────┘       │
│                                          │
│  Fee: 0.04% ($4.00)                    │
│  Rate: 1 sbUSD = 0.9996 USDC          │
```

---

## 5. 네비게이션 설계

### 5-1. 글로벌 네비게이션

```
┌──────────────────────────────────────────────────────────────────┐
│  [❄ Snowball]  Dashboard  Swap  Pool  Lend  Vault  Options      │
│                                                                  │
│                        Stake  Govern                             │
│                                        [Login / Connect] (Privy)│
│                                                                  │
│  sSNOW: 1,250 ($2,825)  │  SNOW: $2.00  │  Revenue 24h: $234   │
│  BTC: $97,312 (WS live) │                                       │
└──────────────────────────────────────────────────────────────────┘
```

하단 status bar에 항상 표시:
- 내 sSNOW 잔고 및 달러 가치
- SNOW 토큰 현재 가격
- 24시간 프로토콜 수익

### 5-2. 모바일 네비게이션

```
Bottom Tab Bar:
┌───────────────────────────────────────────────┐
│  [Home]  [Swap]  [Options]  [Earn]  [Stake] [≡]│
└───────────────────────────────────────────────┘

Earn = Pool + Lend + Vault 통합
≡ = Govern, Settings, More
```

---

## 6. 핵심 컴포넌트

### 6-1. 공통 컴포넌트

| 컴포넌트 | 설명 | 사용처 |
|----------|------|--------|
| `TokenInput` | 토큰 선택 + 수량 입력 + MAX 버튼 | Swap, Pool, Lend, Vault, Stake |
| `TokenPair` | 토큰 쌍 아이콘 표시 | Pool, Lend, Vault |
| `TxButton` | approve → execute 2단계 버튼 | 모든 트랜잭션 |
| `TxToast` | 트랜잭션 상태 알림 (pending/confirmed/failed) | 전역 |
| `PortfolioCard` | 자산 카드 (값, APY, 변화율) | Dashboard |
| `StatCard` | 통계 카드 (TVL, Volume 등) | 모든 페이지 상단 |
| `RevenueChart` | 수익 히스토리 차트 | Dashboard, Stake |
| `HealthFactor` | 건강 계수 표시 (색상 코드) | Lend |
| `APYBadge` | APY 뱃지 (Real Yield 표시) | Vault, Lend, Stake |

### 6-2. 레이아웃 컴포넌트

```
src/components/layout/
├── AppShell.tsx         ← 전체 레이아웃 (navbar + sidebar + content)
├── Navbar.tsx           ← 상단 네비게이션 + 지갑 연결
├── StatusBar.tsx        ← 하단 sSNOW/SNOW/Revenue 상태 바
├── MobileNav.tsx        ← 모바일 하단 탭 바
└── PageHeader.tsx       ← 페이지 제목 + breadcrumb
```

---

## 7. Hooks 아키텍처

### 7-1. 통합 훅

| 훅 | 설명 | 의존성 |
|-----|------|--------|
| `usePortfolio()` | 전 프로토콜 포지션 합산 | 아래 모든 훅 |
| `useAllPositions()` | 모든 프로토콜 포지션 일괄 조회 | multicall |

### 7-2. sSNOW 훅

| 훅 | 설명 |
|-----|------|
| `useSSNOW()` | sSNOW 잔고, pricePerShare, APY, totalStaked |
| `useSSNOWStake()` | SNOW → sSNOW 스테이킹 트랜잭션 |
| `useSSNOWUnstake()` | unstake 요청 (쿨다운 시작) |
| `useSSNOWCooldown()` | 쿨다운 상태 조회, 완료 출금, 취소, 조기 해제 |

### 7-3. Revenue 훅

| 훅 | 설명 |
|-----|------|
| `useRevenue()` | 24h/7d/30d 프로토콜 수익 |
| `useRevenueBreakdown()` | 프로토콜별 수익 비중 |
| `useRevenueHistory()` | 일별 수익 히스토리 (차트용) |
| `useBuybackHistory()` | SNOW buyback 히스토리 |

### 7-4. DEX 훅 (기존 snowball-dex에서 마이그레이션)

| 훅 | 설명 |
|-----|------|
| `useSwap()` | 견적 + 스왑 실행 |
| `useStableSwap()` | 스테이블 스왑 (sbUSD ↔ USDC) |
| `usePool()` | 풀 데이터 조회 |
| `useAddLiquidity()` | LP 포지션 생성 |
| `useRemoveLiquidity()` | LP 포지션 제거 |
| `usePositions()` | 내 LP NFT 목록 |

### 7-5. Lending 훅 (기존 snowball-app에서 유지)

| 훅 | 설명 |
|-----|------|
| `useLendMarkets()` | 마켓 목록 |
| `useLendPosition()` | 내 포지션 |
| `useLendSupply()` | Supply 트랜잭션 |
| `useLendBorrow()` | Borrow 트랜잭션 |
| `useLendRepay()` | Repay 트랜잭션 |
| `useLendWithdraw()` | Withdraw 트랜잭션 |

### 7-6. Vault 훅 (신규)

| 훅 | 설명 |
|-----|------|
| `useVaults()` | Vault 목록 (TVL, APY, strategy) |
| `useVaultDetail(address)` | Vault 상세 (pricePerShare, balance) |
| `useVaultDeposit()` | Vault deposit 트랜잭션 |
| `useVaultWithdraw()` | Vault withdraw 트랜잭션 |
| `useVaultPositions()` | 내 Vault 포지션 |

### 7-7. Governance 훅 (신규)

| 훅 | 설명 |
|-----|------|
| `useProposals()` | 제안 목록 |
| `useProposalDetail(id)` | 제안 상세 (투표 현황) |
| `useVote()` | 투표 트랜잭션 |
| `useCreateProposal()` | 제안 생성 |

### 7-8. Options 훅 (v0.2.0 신규)

| 훅 | 설명 |
|-----|------|
| `useSignOrder()` | EIP-712 서명 생성 + 백엔드 제출 |
| `useSubmitOrder()` | POST /api/options/order 호출 |
| `useOrderHistory()` | 유저 거래 내역 조회 |
| `useRounds()` | 현재/과거 라운드 데이터 |
| `useOptionsBalance()` | ClearingHouse 잔고 (available + escrow) |
| `useOptionsVault()` | LP 볼트 상태 (TVL, APY, share price) |
| `useOptionsVaultDeposit()` | LP 입금 트랜잭션 |
| `useOptionsVaultWithdraw()` | LP 출금 (24h 딜레이) 트랜잭션 |

### 7-9. Price 훅 (v0.2.0 신규)

| 훅 | 설명 |
|-----|------|
| `useBTCPrice()` | WebSocket `/ws/price` 실시간 BTC 가격 스트리밍 |
| `usePriceHistory()` | GET /api/price/btc/history — 히스토리 |
| `useOHLCV()` | GET /api/price/btc/ohlcv — OHLCV 차트 데이터 (Lightweight Charts용) |

---

## 8. 디렉토리 구조

```
snowball-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 루트 레이아웃 (AppShell)
│   │   ├── page.tsx                  # Dashboard (/)
│   │   ├── swap/
│   │   │   └── page.tsx              # Swap (/swap)
│   │   ├── pool/
│   │   │   ├── page.tsx              # Pool List (/pool)
│   │   │   ├── add/page.tsx          # Add Liquidity
│   │   │   ├── positions/page.tsx    # My LP Positions
│   │   │   └── [id]/page.tsx         # Pool Detail
│   │   ├── lend/
│   │   │   ├── page.tsx              # Market Overview (/lend)
│   │   │   ├── positions/page.tsx    # My Positions
│   │   │   └── [id]/page.tsx         # Market Detail
│   │   ├── vault/
│   │   │   ├── page.tsx              # Vault List (/vault)
│   │   │   ├── positions/page.tsx    # My Vaults
│   │   │   └── [id]/page.tsx         # Vault Detail
│   │   ├── stake/
│   │   │   └── page.tsx              # sSNOW Staking (/stake)
│   │   ├── options/                   # ★NEW (v0.2.0)
│   │   │   ├── page.tsx              # Options Trading (/options)
│   │   │   └── vault/page.tsx        # Options LP Vault (/options/vault)
│   │   ├── govern/
│   │   │   ├── page.tsx              # Proposal List
│   │   │   ├── new/page.tsx          # Create Proposal
│   │   │   └── [id]/page.tsx         # Proposal Detail
│   │   └── earn/
│   │       ├── borrow/page.tsx       # Liquity Trove (기존)
│   │       └── stability/page.tsx    # Stability Pool (기존)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── common/
│   │   │   ├── TokenInput.tsx
│   │   │   ├── TokenPair.tsx
│   │   │   ├── TxButton.tsx
│   │   │   ├── TxToast.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── APYBadge.tsx
│   │   │   └── HealthFactor.tsx
│   │   ├── dashboard/
│   │   │   ├── PortfolioSummary.tsx
│   │   │   ├── SSNOWCard.tsx
│   │   │   ├── RevenueLive.tsx
│   │   │   ├── PositionList.tsx
│   │   │   └── RevenueChart.tsx
│   │   ├── swap/
│   │   │   ├── SwapInterface.tsx
│   │   │   └── StableSwapInterface.tsx
│   │   ├── pool/
│   │   │   ├── PoolList.tsx
│   │   │   ├── AddLiquidityForm.tsx
│   │   │   └── PositionCard.tsx
│   │   ├── lend/
│   │   │   ├── MarketList.tsx
│   │   │   ├── MarketDetail.tsx
│   │   │   ├── SupplyPanel.tsx
│   │   │   └── BorrowPanel.tsx
│   │   ├── vault/
│   │   │   ├── VaultList.tsx
│   │   │   ├── VaultCard.tsx
│   │   │   └── VaultDetail.tsx
│   │   ├── stake/
│   │   │   ├── StakeForm.tsx
│   │   │   ├── CooldownStatus.tsx
│   │   │   ├── RevenueBreakdown.tsx
│   │   │   ├── PricePerShareChart.tsx
│   │   │   └── EarningsHistory.tsx
│   │   ├── options/                    # ★NEW (v0.2.0)
│   │   │   ├── BTCChart.tsx           # Lightweight Charts 실시간 BTC
│   │   │   ├── TradePanel.tsx         # Over/Under 주문 패널
│   │   │   ├── RoundInfo.tsx          # 현재 라운드 정보
│   │   │   ├── RecentTrades.tsx       # 최근 거래 목록
│   │   │   ├── OptionsVaultPanel.tsx  # LP Vault 입출금
│   │   │   └── OrderHistory.tsx       # 거래 이력 + PnL
│   │   └── govern/
│   │       ├── ProposalList.tsx
│   │       ├── ProposalDetail.tsx
│   │       ├── VotePanel.tsx
│   │       └── CreateProposalForm.tsx
│   │
│   ├── hooks/
│   │   ├── portfolio/
│   │   │   ├── usePortfolio.ts
│   │   │   └── useAllPositions.ts
│   │   ├── ssnow/
│   │   │   ├── useSSNOW.ts
│   │   │   ├── useSSNOWStake.ts
│   │   │   ├── useSSNOWUnstake.ts
│   │   │   └── useSSNOWCooldown.ts
│   │   ├── revenue/
│   │   │   ├── useRevenue.ts
│   │   │   ├── useRevenueBreakdown.ts
│   │   │   ├── useRevenueHistory.ts
│   │   │   └── useBuybackHistory.ts
│   │   ├── swap/
│   │   │   ├── useSwap.ts
│   │   │   └── useStableSwap.ts
│   │   ├── pool/
│   │   │   ├── usePool.ts
│   │   │   ├── useAddLiquidity.ts
│   │   │   ├── useRemoveLiquidity.ts
│   │   │   └── usePositions.ts
│   │   ├── lend/
│   │   │   ├── useLendMarkets.ts
│   │   │   ├── useLendPosition.ts
│   │   │   ├── useLendSupply.ts
│   │   │   ├── useLendBorrow.ts
│   │   │   ├── useLendRepay.ts
│   │   │   └── useLendWithdraw.ts
│   │   ├── vault/
│   │   │   ├── useVaults.ts
│   │   │   ├── useVaultDetail.ts
│   │   │   ├── useVaultDeposit.ts
│   │   │   ├── useVaultWithdraw.ts
│   │   │   └── useVaultPositions.ts
│   │   ├── options/                    # ★NEW (v0.2.0)
│   │   │   ├── useSignOrder.ts
│   │   │   ├── useSubmitOrder.ts
│   │   │   ├── useOrderHistory.ts
│   │   │   ├── useRounds.ts
│   │   │   ├── useOptionsBalance.ts
│   │   │   ├── useOptionsVault.ts
│   │   │   ├── useOptionsVaultDeposit.ts
│   │   │   └── useOptionsVaultWithdraw.ts
│   │   ├── price/                      # ★NEW (v0.2.0)
│   │   │   ├── useBTCPrice.ts
│   │   │   ├── usePriceHistory.ts
│   │   │   └── useOHLCV.ts
│   │   └── govern/
│   │       ├── useProposals.ts
│   │       ├── useProposalDetail.ts
│   │       ├── useVote.ts
│   │       └── useCreateProposal.ts
│   │
│   ├── config/
│   │   ├── chain.ts                   # Creditcoin Testnet 정의
│   │   ├── wagmi.ts                   # Wagmi config (Privy adapter)
│   │   ├── contracts.ts               # 전체 컨트랙트 주소 통합
│   │   ├── tokens.ts                  # 토큰 목록 + 메타데이터
│   │   └── abis/
│   │       ├── snow.ts
│   │       ├── ssnow.ts
│   │       ├── revenueDistributor.ts
│   │       ├── buybackEngine.ts
│   │       ├── uniswapV3Pool.ts
│   │       ├── uniswapV3Router.ts
│   │       ├── snowballLend.ts
│   │       ├── snowballVault.ts
│   │       ├── governor.ts
│   │       ├── snowballOptions.ts      # ★NEW (v0.2.0)
│   │       ├── optionsClearingHouse.ts  # ★NEW (v0.2.0)
│   │       ├── optionsVault.ts         # ★NEW (v0.2.0)
│   │       ├── btcMockOracle.ts        # ★NEW (v0.2.0)
│   │       └── erc20.ts
│   │
│   ├── lib/
│   │   ├── math.ts                    # 수학 유틸리티 통합
│   │   ├── format.ts                  # 숫자/주소 포맷팅
│   │   ├── tokens.ts                  # 토큰 정렬/검색
│   │   └── constants.ts              # 상수
│   │
│   └── styles/
│       └── globals.css                # Tailwind + 커스텀 테마
│
├── public/
│   └── tokens/                        # 토큰 아이콘
│       ├── snow.svg
│       ├── ssnow.svg
│       ├── wctc.svg
│       ├── sbusd.svg
│       ├── usdc.svg
│       └── lstctc.svg
│
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 9. 디자인 시스템

### 9-1. 색상 팔레트

| 용도 | 색상 | Hex | 사용처 |
|------|------|-----|--------|
| Background | Dark Navy | `#0A0B14` | 메인 배경 |
| Card | Dark Blue | `#141525` | 카드, 패널 |
| Input | Deep Blue | `#1C1D30` | 입력 필드 |
| Accent (Primary) | Ice Blue | `#60A5FA` | 버튼, 링크, sSNOW |
| Accent (Secondary) | Snow White | `#F0F9FF` | 강조 텍스트 |
| Positive | Green | `#34D399` | 수익, 상승 |
| Negative | Red | `#F87171` | 손실, 하락, 위험 |
| Warning | Amber | `#FBBF24` | 주의, 쿨다운 |
| Text Primary | White | `#F5F5F7` | 주 텍스트 |
| Text Secondary | Gray | `#8B8D97` | 보조 텍스트 |
| Revenue DEX | Blue | `#3B82F6` | 차트 — DEX 수익 |
| Revenue Lend | Purple | `#8B5CF6` | 차트 — Lending 수익 |
| Revenue Vault | Emerald | `#10B981` | 차트 — Vault 수익 |
| Revenue Stable | Cyan | `#06B6D4` | 차트 — StableSwap 수익 |

### 9-2. 타이포그래피

| 용도 | 크기 | 굵기 |
|------|------|------|
| Page Title | 24px | Bold |
| Section Title | 18px | Semibold |
| Card Title | 14px | Semibold |
| Body | 14px | Normal |
| Label | 12px | Medium |
| Badge | 11px | Semibold |
| Mono (numbers) | 14px | Mono, Semibold |

### 9-3. 반응형 breakpoints

| 이름 | 너비 | 레이아웃 |
|------|------|----------|
| Mobile | < 640px | 1 column, bottom tab |
| Tablet | 640 ~ 1024px | 2 column |
| Desktop | > 1024px | 3 column, side nav |

---

## 10. 마이그레이션 계획

### 현재 → 통합 앱 전환

```
Phase 1: 기반 구축 (Week 1-2)
├── Next.js 14 프로젝트 생성
├── 디자인 시스템 (Tailwind + 공통 컴포넌트)
├── Privy + wagmi 설정 (@privy-io/react-auth, @privy-io/wagmi)
└── AppShell + Navbar + StatusBar

Phase 2: 기존 기능 마이그레이션 (Week 3-4)
├── snowball-dex → /swap, /pool 마이그레이션
├── snowball-app Lend → /lend 마이그레이션
├── snowball-app Earn → /earn 마이그레이션
└── 훅 통합 + config 통합

Phase 3: 신규 기능 (Week 5-6)
├── /vault 페이지 구현
├── /stake (sSNOW) 페이지 구현
├── /options 트레이딩 UI (Lightweight Charts + EIP-712 서명) ★NEW
├── /options/vault LP UI ★NEW
├── useBTCPrice() WebSocket 훅 ★NEW
├── Dashboard (/) 구현
└── Portfolio + Revenue 훅

Phase 4: 거버넌스 + 최적화 (Week 7-8)
├── /govern 페이지 구현
├── 모바일 최적화
├── 성능 최적화 (lazy loading, code splitting)
└── E2E 테스트
```

### 기존 앱 처리

| 앱 | 전환 후 |
|-----|---------|
| `snowball-dex` | 아카이브 (통합 앱의 /swap, /pool로 대체) |
| `snowball-app` | 아카이브 (통합 앱으로 전체 대체) |
| `apps/web` | 유지 (Liquity 에이전트 전용, 별도 운영) |

---

## 11. 핵심 UX 원칙

1. **"sSNOW 어디서나"** — 모든 페이지에서 sSNOW 잔고와 수익을 볼 수 있음. 매 수수료 발생 시 "이 수수료의 92%가 sSNOW 홀더에게 돌아갑니다" 메시지 표시.

2. **"1클릭 진입"** — Swap, Supply, Deposit 모든 액션이 approve → execute 자동 2단계. 유저는 버튼 한 번.

3. **"Real Yield 강조"** — APY 표시 시 항상 "Real Yield" 뱃지 표시. 인플레이션 없는 실질 수익임을 강조.

4. **"통합 포트폴리오"** — Dashboard에서 전 프로토콜 자산을 한 눈에. 개별 프로토콜 페이지에 갈 필요 없이 현황 파악.

5. **"프로토콜 시너지 시각화"** — Flywheel 다이어그램으로 프로토콜 간 수익이 어떻게 연결되는지 시각적으로 표현.
