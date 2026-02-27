# Task: Yield Vault 프론트엔드 연동

> 담당: Frontend 개발자
> 우선순위: HIGH
> 예상 산출물: 신규 파일 6개, 수정 파일 3개
> 참조: `packages/yield/` (컨트랙트), `packages/frontend/src/app/(defi)/earn/page.tsx` (패턴 참고)

---

## 1. 배경

Yield Vault(Beefy V7 Fork)는 **컨트랙트 개발이 완료**되었으나 프론트엔드가 미연동된 상태입니다.
사용자가 토큰을 Vault에 예치하면, 연결된 Strategy가 자동으로 수익을 복리 운용(auto-compound)합니다.

### Vault 목록 (4개)

| Vault | 예치 토큰 | 전략 | 수익원 |
|-------|-----------|------|--------|
| mooSbUSD-SP | sbUSD | StrategySbUSDStabilityPool | Liquity Stability Pool 청산 수익 |
| mooSbUSD-Morpho | sbUSD | StrategySbUSDMorpho | SnowballLend sbUSD 공급 이자 |
| mooWCTC-Morpho | wCTC | StrategyWCTCMorpho | SnowballLend wCTC 공급 이자 |
| mooUSDC-Morpho | USDC | StrategyUSDCMorpho | SnowballLend USDC 공급 이자 |

### 핵심 개념

- 사용자가 `want` 토큰(sbUSD/wCTC/USDC)을 Vault에 **deposit**
- Vault는 `mooToken`(ERC-20 share)을 민팅하여 지급
- Strategy가 외부 프로토콜에 예치하여 이자/수익 발생
- 수익은 `harvest()` 호출 시 자동 복리 → `getPricePerFullShare()` 상승
- 사용자가 **withdraw** 시 share 소각 → 원금 + 수익 수령

---

## 2. 컨트랙트 API 요약

### 2.1 SnowballYieldVault (사용자 직접 호출)

```
읽기 (View):
  balance()                 → uint256    // Vault 전체 TVL (idle + strategy)
  totalSupply()             → uint256    // 발행된 share 총량
  balanceOf(address)        → uint256    // 사용자 share 잔고
  getPricePerFullShare()    → uint256    // 1 share의 want 가치 (1e18 기준)
  want()                    → address    // 예치 토큰 주소
  strategy()                → address    // 연결된 Strategy 주소
  available()               → uint256    // Vault에 idle 상태인 want
  name()                    → string     // Vault 이름 (예: "mooSbUSD-SP")
  symbol()                  → string     // Share 토큰 심볼
  decimals()                → uint8      // 18

쓰기 (Mutate):
  deposit(uint256 _amount)  → void       // want 예치 → share 수령
  depositAll()              → void       // 보유한 want 전량 예치
  withdraw(uint256 _shares) → void       // share 소각 → want 수령
  withdrawAll()             → void       // 보유한 share 전량 출금
```

**사용자 포지션 가치 계산:**
```
wantValue = balanceOf(user) * getPricePerFullShare() / 1e18
profit    = wantValue - (최초 예치한 want 수량)
```

### 2.2 SnowballStrategyBase (읽기 전용 참고)

```
읽기 (View):
  balanceOf()               → uint256    // 전략 총 잔고 (idle + pool - lockedProfit)
  balanceOfPool()           → uint256    // 외부 프로토콜에 예치된 잔고
  balanceOfWant()           → uint256    // 전략 내 idle want
  lockedProfit()            → uint256    // 아직 풀리지 않은 수익 (24h linear decay)
  lastHarvest()             → uint256    // 마지막 harvest 타임스탬프
  paused()                  → bool       // 일시정지 여부
  withdrawFee()             → uint256    // 출금 수수료 (기본 10 = 0.1%)
  rewardsAvailable()        → uint256    // 수확 가능한 보상량
```

### 2.3 수수료 구조

| 수수료 | 값 | 시점 |
|--------|-----|------|
| Harvest Fee | 4.5% (profits에서 차감) | harvest() 호출 시 |
| Withdrawal Fee | 0.1% (기본, 최대 0.5%) | withdraw 시 |
| Deposit Fee | 0% | — |

### 2.4 Deposit 플로우

```
사용자                         프론트엔드                    온체인
 │                               │                           │
 │  1. Vault 선택 (4개 중)       │                           │
 │──────────────────────────────▶│                           │
 │                               │  getPricePerFullShare()   │
 │                               │  balance() (TVL)          │
 │                               │  balanceOf(user) (shares) │
 │  2. Vault 현황 확인           │──────────────────────────▶│
 │◀──────────────────────────────│◀──────────────────────────│
 │                               │                           │
 │  3. 금액 입력                 │                           │
 │──────────────────────────────▶│                           │
 │                               │                           │
 │  4. [Approve] 클릭            │  want.approve(vault, amt) │
 │──────────────────────────────▶│──────────────────────────▶│
 │  (지갑 서명)                  │◀──────────────────────────│
 │                               │                           │
 │  5. [Deposit] 클릭            │  vault.deposit(amount)    │
 │──────────────────────────────▶│──────────────────────────▶│
 │  (지갑 서명)                  │◀──────────────────────────│
 │                               │                           │
 │  6. share 토큰 수령 확인       │                           │
 │◀──────────────────────────────│                           │
```

### 2.5 Withdraw 플로우

```
사용자                         프론트엔드                    온체인
 │                               │                           │
 │  1. 출금할 share 수량 입력     │                           │
 │     (또는 "Max" → 전량)       │                           │
 │──────────────────────────────▶│                           │
 │                               │  예상 수령량 계산:          │
 │                               │  shares * ppfs / 1e18     │
 │  2. 예상 수령량 확인           │                           │
 │◀──────────────────────────────│                           │
 │                               │                           │
 │  3. [Withdraw] 클릭           │  vault.withdraw(shares)   │
 │──────────────────────────────▶│──────────────────────────▶│
 │  (지갑 서명)                  │◀──────────────────────────│
 │                               │                           │
 │  4. want 토큰 수령 확인        │                           │
 │◀──────────────────────────────│                           │
```

---

## 3. 배포 주소 (placeholder)

> ⚠️ Vault 컨트랙트는 **아직 미배포**입니다.
> 배포 후 `deployments/creditcoin-testnet/yield.json`에 주소가 기록되며,
> 아래 config에 채워넣으면 됩니다. 일단 구조만 먼저 구현하세요.

```typescript
// addresses.ts에 추가할 구조
export const YIELD = {
  vaults: [
    {
      address: "0x..." as Address,           // SnowballYieldVault 주소
      strategy: "0x..." as Address,          // Strategy 주소
      want: TOKENS.sbUSD,                    // 예치 토큰
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: "0x..." as Address,
      strategy: "0x..." as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: "0x..." as Address,
      strategy: "0x..." as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: "0x..." as Address,
      strategy: "0x..." as Address,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC 공급 이자",
    },
  ],
} as const;
```

---

## 4. 구현 상세

### 4.1 신규 파일 목록

| # | 파일 | 설명 |
|---|------|------|
| 1 | `src/abis/yield.ts` | Vault + Strategy ABI 정의 |
| 2 | `src/app/(defi)/yield/page.tsx` | Yield Vault 메인 페이지 |
| 3 | `src/app/(defi)/yield/layout.tsx` | 레이아웃 (메타데이터) |
| 4 | `src/hooks/defi/useYieldVaults.ts` | Vault 데이터 조회 훅 |
| 5 | `src/components/yield/VaultCard.tsx` | 개별 Vault 카드 컴포넌트 |
| 6 | `src/components/yield/VaultActionDialog.tsx` | Deposit/Withdraw 다이얼로그 |

### 4.2 수정 파일 목록

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/config/addresses.ts` | `YIELD` 섹션 추가 |
| 2 | `src/abis/index.ts` | `export * from "./yield"` 추가 |
| 3 | `src/components/layout/Sidebar.tsx` | DeFi 그룹에 "Yield" 메뉴 추가 |

---

### 4.3 파일별 상세 구현

#### 파일 1: `src/abis/yield.ts`

```typescript
// Yield Vault + Strategy ABIs

export const SnowballYieldVaultABI = [
  // View
  { type: "function", name: "want", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "balance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "available", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPricePerFullShare", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "strategy", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  // Approve (ERC20 — want 토큰용이 아니라 vault share 전송용이지만, 보통 불필요)
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // Mutate
  { type: "function", name: "deposit", inputs: [{ name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "depositAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "_shares", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
  // Events
  { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
] as const;

export const SnowballStrategyABI = [
  { type: "function", name: "balanceOf", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOfPool", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOfWant", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lockedProfit", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lastHarvest", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "withdrawFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rewardsAvailable", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // harvest는 keeper/bot이 호출하지만, UI에서 보여줄 수 있음
  { type: "function", name: "harvest", inputs: [], outputs: [], stateMutability: "nonpayable" },
] as const;

// ERC-20 approve (want 토큰에 대해 vault를 spender로 approve)
export const ERC20ApproveABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
```

---

#### 파일 2: `src/hooks/defi/useYieldVaults.ts`

역할: 모든 Vault의 TVL, PricePerShare, 사용자 share 잔고를 일괄 조회

```typescript
import { useReadContracts, useConnection } from "wagmi";
import { YIELD } from "@/config/addresses";
import { SnowballYieldVaultABI, SnowballStrategyABI } from "@/abis";

export interface VaultData {
  address: `0x${string}`;
  strategy: `0x${string}`;
  want: `0x${string}`;
  wantSymbol: string;
  name: string;
  description: string;
  // 온체인 데이터
  tvl: bigint | undefined;             // vault.balance()
  totalSupply: bigint | undefined;     // vault.totalSupply()
  pricePerShare: bigint | undefined;   // vault.getPricePerFullShare()
  userShares: bigint | undefined;      // vault.balanceOf(user)
  lastHarvest: bigint | undefined;     // strategy.lastHarvest()
  paused: boolean | undefined;         // strategy.paused()
  withdrawFee: bigint | undefined;     // strategy.withdrawFee()
}

export function useYieldVaults() {
  const { address } = useConnection();

  // 각 Vault마다 조회할 calls 생성
  const contracts = YIELD.vaults.flatMap((v) => [
    { address: v.address, abi: SnowballYieldVaultABI, functionName: "balance" },
    { address: v.address, abi: SnowballYieldVaultABI, functionName: "totalSupply" },
    { address: v.address, abi: SnowballYieldVaultABI, functionName: "getPricePerFullShare" },
    // user shares (address 있을 때만 의미 있지만, 일단 호출은 해도 됨)
    ...(address
      ? [{ address: v.address, abi: SnowballYieldVaultABI, functionName: "balanceOf" as const, args: [address] }]
      : []),
    { address: v.strategy, abi: SnowballStrategyABI, functionName: "lastHarvest" },
    { address: v.strategy, abi: SnowballStrategyABI, functionName: "paused" },
    { address: v.strategy, abi: SnowballStrategyABI, functionName: "withdrawFee" },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { refetchInterval: 15_000 }, // 15초마다 갱신
  });

  // data를 VaultData[]로 매핑
  // 각 vault의 call 수 = address 있으면 7, 없으면 6
  const callsPerVault = address ? 7 : 6;
  const vaults: VaultData[] = YIELD.vaults.map((v, i) => {
    const offset = i * callsPerVault;
    return {
      ...v,
      tvl: data?.[offset]?.result as bigint | undefined,
      totalSupply: data?.[offset + 1]?.result as bigint | undefined,
      pricePerShare: data?.[offset + 2]?.result as bigint | undefined,
      userShares: address
        ? (data?.[offset + 3]?.result as bigint | undefined)
        : undefined,
      lastHarvest: data?.[offset + (address ? 4 : 3)]?.result as bigint | undefined,
      paused: data?.[offset + (address ? 5 : 4)]?.result as boolean | undefined,
      withdrawFee: data?.[offset + (address ? 6 : 5)]?.result as bigint | undefined,
    };
  });

  return { vaults, isLoading, refetch };
}
```

---

#### 파일 3: `src/components/yield/VaultCard.tsx`

각 Vault를 카드 형태로 표시. 클릭하면 Deposit/Withdraw 다이얼로그 오픈.

**UI 레이아웃:**

```
┌──────────────────────────────────────────────┐
│  [sbUSD icon]  Stability Pool                │
│               Liquity 청산 수익 자동 복리       │
│                                              │
│  TVL              Price/Share    Your Deposit │
│  12,345.00 sbUSD  1.0342         520.00 sbUSD│
│                                              │
│  Last Harvest: 2h ago   Fee: 0.1%            │
│                                              │
│  [ Deposit ]  [ Withdraw ]                   │
└──────────────────────────────────────────────┘
```

**구현 요점:**
- `VaultData` props를 받아 렌더링
- `userValue = userShares * pricePerShare / 1e18` 로 사용자의 want 기준 잔고 계산
- `pricePerShare`가 `1e18`보다 크면 수익 발생 중 (1.0342 = +3.42%)
- `lastHarvest`로부터 경과 시간 계산하여 "2h ago" 형태로 표시
- `paused === true`면 Badge로 "Paused" 표시, Deposit 버튼 비활성화
- Deposit / Withdraw 버튼 클릭 시 `VaultActionDialog` 오픈

**사용할 컴포넌트:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (Shadcn)
- `Button` (variant: default, secondary)
- `Badge` (paused 상태)
- lucide-react 아이콘: `Vault`, `TrendingUp`, `Clock`

---

#### 파일 4: `src/components/yield/VaultActionDialog.tsx`

Deposit/Withdraw 통합 다이얼로그.

**UI 레이아웃:**

```
┌──────────────────────────────────────────────┐
│  Stability Pool — sbUSD                   [X]│
│                                              │
│  [Deposit]  [Withdraw]     ← Tabs            │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ Amount                    Max: 1,000 │    │
│  │ [___________________________0.0____] │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  You will receive: ~967.00 mooSbUSD-SP       │  ← deposit 시
│  (또는) You will receive: ~103.42 sbUSD       │  ← withdraw 시
│                                              │
│  Withdrawal Fee: 0.1%                        │  ← withdraw 탭만
│                                              │
│  [ Approve sbUSD ]  or  [ Deposit ]          │
└──────────────────────────────────────────────┘
```

**구현 요점:**

1. **Deposit 탭:**
   - `useTokenBalance({ address, token: vault.want })` 로 잔고 조회
   - `useReadContract` 로 `allowance(user, vaultAddress)` 조회
   - allowance < 입력금액이면 **Approve 버튼** 먼저 표시
     - `want.approve(vaultAddress, MaxUint256)` 호출
   - Approve 완료 후 **Deposit 버튼** 활성화
     - `vault.deposit(parseEther(amount))` 호출
   - 예상 수령 share 계산: `amount * 1e18 / pricePerShare`

2. **Withdraw 탭:**
   - 사용자의 share 잔고 (`vault.balanceOf(user)`) 표시
   - share 수량 입력 (Max 버튼 = 전체 share)
   - 예상 수령 want 계산: `shares * pricePerShare / 1e18`
   - Withdrawal Fee 표시 (0.1%)
   - `vault.withdraw(parseEther(shares))` 호출

**Approve 패턴 (중요):**
```typescript
// 기존 프로젝트의 Swap 페이지 패턴을 따름
const { data: allowance } = useReadContract({
  address: vault.want,
  abi: ERC20ApproveABI,
  functionName: "allowance",
  args: [address!, vault.address],
  query: { enabled: !!address },
});

const needsApproval = allowance !== undefined && allowance < parsedAmount;
```

**사용할 컴포넌트:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (Shadcn)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Input` (amount 입력)
- `Button` (Approve / Deposit / Withdraw)
- `Loader2` 아이콘 (pending 상태)

---

#### 파일 5: `src/app/(defi)/yield/page.tsx`

메인 페이지. 모든 Vault를 카드 그리드로 표시.

**UI 레이아웃:**

```
┌──────────────────────────────────────────────────────────┐
│  Yield Vaults                                            │
│  Auto-compound your DeFi yields                          │
│                                                          │
│  ┌─ Stats ─────────────────────────────────────────────┐ │
│  │ Total TVL    │ Active Vaults │ Avg Price/Share       │ │
│  │ $48,230      │ 4             │ 1.0245                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ VaultCard ──────────┐  ┌─ VaultCard ──────────┐     │
│  │ Stability Pool       │  │ Morpho sbUSD          │     │
│  │ sbUSD                │  │ sbUSD                  │     │
│  └──────────────────────┘  └──────────────────────┘     │
│  ┌─ VaultCard ──────────┐  ┌─ VaultCard ──────────┐     │
│  │ Morpho wCTC          │  │ Morpho USDC           │     │
│  │ wCTC                 │  │ USDC                   │     │
│  └──────────────────────┘  └──────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

**구현 요점:**
- `useYieldVaults()` 훅으로 전체 데이터 조회
- 상단에 StatCard 3개 (Total TVL, Active Vaults, Avg Price/Share)
- `VaultCard` 그리드 (2열 lg, 1열 sm)
- 각 `VaultCard`에서 Deposit/Withdraw 버튼 클릭 시 `VaultActionDialog` 오픈
- `useState`로 선택된 vault + 열린 dialog 관리

**패턴 참고:** `/src/app/(defi)/earn/page.tsx` 의 레이아웃/스타일 참조

---

#### 파일 6: `src/app/(defi)/yield/layout.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yield Vaults | Snowball",
  description: "Auto-compound your DeFi yields with Snowball Vaults",
};

export default function YieldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

---

### 4.4 수정사항 상세

#### 수정 1: `src/config/addresses.ts`

파일 하단, `OPTIONS` 블록 아래에 `YIELD` 섹션 추가:

```typescript
// ─── Yield Vaults (Beefy V7 Fork) ───
export const YIELD = {
  vaults: [
    {
      address: "0x0000000000000000000000000000000000000001" as Address, // TODO: 배포 후 교체
      strategy: "0x0000000000000000000000000000000000000001" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: "0x0000000000000000000000000000000000000002" as Address,
      strategy: "0x0000000000000000000000000000000000000002" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: "0x0000000000000000000000000000000000000003" as Address,
      strategy: "0x0000000000000000000000000000000000000003" as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: "0x0000000000000000000000000000000000000004" as Address,
      strategy: "0x0000000000000000000000000000000000000004" as Address,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC 공급 이자",
    },
  ],
} as const;
```

#### 수정 2: `src/abis/index.ts`

```typescript
export * from "./dex";
export * from "./options";
export * from "./lend";
export * from "./liquity";
export * from "./yield";    // ← 추가
```

#### 수정 3: `src/components/layout/Sidebar.tsx`

DeFi 그룹에 Yield 항목 추가:

```typescript
// import 추가
import { Vault } from "lucide-react";  // 또는 PiggyBank, Layers 등

// NAV_GROUPS의 DeFi 섹션에 추가
{
  title: "DeFi",
  items: [
    { href: "/lend", label: "Lend", icon: <Landmark className="w-4 h-4" /> },
    { href: "/borrow", label: "Borrow", icon: <HandCoins className="w-4 h-4" /> },
    { href: "/earn", label: "Earn", icon: <Percent className="w-4 h-4" /> },
    { href: "/yield", label: "Yield", icon: <Vault className="w-4 h-4" /> },  // ← 추가
  ],
},
```

> lucide-react에 `Vault` 아이콘이 없으면 `PiggyBank`, `Layers`, `TrendingUp` 중 택 1

---

## 5. 스타일 가이드

기존 프로젝트 패턴을 반드시 따를 것:

| 항목 | 규칙 |
|------|------|
| 카드 배경 | `bg-bg-card` + `border border-border-hover/40` + `rounded-2xl` |
| 입력 필드 배경 | `rounded-xl bg-bg-input p-3` |
| 입력 텍스트 | `border-0 bg-transparent text-lg font-mono p-0 h-auto` |
| 금액 표시 | `formatTokenAmount(bigint, 18, displayDecimals)` 사용 |
| 로딩 | `Loader2` 아이콘 `animate-spin` |
| Max 버튼 | `text-xs text-text-secondary hover:text-ice-400` |
| 페이지 래퍼 | `max-w-4xl mx-auto px-4 py-8 space-y-6` |
| 카드 그리드 | `grid grid-cols-1 lg:grid-cols-2 gap-4` |
| StatCard 그리드 | `grid grid-cols-2 lg:grid-cols-3 gap-4` |

---

## 6. 주의사항

### Approve → Deposit 2단계 필수
- Vault의 `deposit()`은 내부에서 `want.transferFrom(user, vault, amount)`을 호출
- 따라서 사용자가 **먼저 want 토큰을 vault 주소에 approve**해야 함
- `/earn` 페이지의 StabilityPool은 approve 없이 작동하지만 (Liquity 내부 구조), **Vault는 ERC-20 approve가 필수**
- Swap 페이지(`useSwap.ts`)의 approve 패턴 참고

### Share ≠ Want
- Vault에 100 sbUSD를 넣으면 100 share가 아님
- share 수량 = `depositAmount * 1e18 / getPricePerFullShare()`
- pricePerShare가 1.05e18이면 → 100 sbUSD 예치 시 ~95.24 share
- 출금 시에도 share 기준으로 입력받아야 함

### Withdraw 시 share 입력
- 사용자에게는 "want 기준 가치"를 보여주되, 실제 컨트랙트 호출은 **share 수량**으로
- UI에서 want ↔ share 변환 계산을 양방향으로 제공하면 UX가 좋음

### 미배포 상태 대응
- 주소가 placeholder(0x0000...)인 경우 → 컨트랙트 호출 실패
- `useReadContracts`에서 에러가 나도 크래시하지 않도록 방어 코딩
- Vault 카드에 "Coming Soon" 배지 표시하는 것도 고려

---

## 7. 체크리스트

- [ ] `src/abis/yield.ts` — ABI 정의
- [ ] `src/abis/index.ts` — export 추가
- [ ] `src/config/addresses.ts` — YIELD 섹션 추가
- [ ] `src/hooks/defi/useYieldVaults.ts` — 데이터 조회 훅
- [ ] `src/components/yield/VaultCard.tsx` — Vault 카드
- [ ] `src/components/yield/VaultActionDialog.tsx` — Deposit/Withdraw 다이얼로그
- [ ] `src/app/(defi)/yield/layout.tsx` — 메타데이터
- [ ] `src/app/(defi)/yield/page.tsx` — 메인 페이지
- [ ] `src/components/layout/Sidebar.tsx` — 네비게이션 추가
- [ ] Approve → Deposit 2단계 플로우 구현
- [ ] Share ↔ Want 변환 계산 정확성 확인
- [ ] 지갑 미연결 시 Deposit/Withdraw 버튼 비활성화
- [ ] Paused 상태 Vault 처리 (Deposit 비활성, Withdraw만 가능)
- [ ] 반응형 레이아웃 (모바일 1열 / 데스크탑 2열)
