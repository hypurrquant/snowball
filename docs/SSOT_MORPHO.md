# SSOT — Snowball Lend (Morpho Blue Fork)

> Single Source of Truth. 모든 통합 작업은 이 문서를 기준으로 합니다.
> 최종 업데이트: 2025-02-25

---

## Network

| 항목 | 값 |
|------|-----|
| Chain | Creditcoin Testnet |
| Chain ID | `102031` |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Currency | tCTC (18 decimals) |

---

## Core Contracts

| 컨트랙트 | 주소 | 비고 |
|----------|------|------|
| **SnowballLend** | `0x7d604b31297b36aace73255931f65e891cf289d3` | 핵심 렌딩 프로토콜 |
| **AdaptiveCurveIRM** | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` | 금리 모델 |
| **SnowballVaultFactory** | `0x6e97df392462b8c2b8d13e2cd77a90168925edf6` | ERC-4626 Vault 팩토리 |
| **PublicAllocator** | `0x35b35a8c835eaf78b43137a51c4adccfc5d653b4` | 크로스마켓 재배분 |

---

## Tokens

| 토큰 | 주소 | Decimals | 출처 |
|------|------|----------|------|
| **wCTC** | `0x8f7f60a0f615d828eafcbbf6121f73efcfb56969` | 18 | Snowball Protocol 배포 |
| **lstCTC** | `0x72968ff9203dc5f352c5e42477b84d11c8c8f153` | 18 | Snowball Protocol 배포 |
| **sbUSD** | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` | 18 | Snowball Protocol 배포 |
| **USDC** (Mock) | `0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed` | **6** | ctc-morpho MockERC20 |

> USDC는 `decimals=6`. 다른 토큰은 모두 `decimals=18`.
> MockUSDC에는 `faucet()` 함수가 있음 (호출 시 1,000 USDC 민팅).

---

## Oracles

| 오라클 | 주소 | 초기 가격 | 스케일 |
|--------|------|----------|--------|
| **wCTC Oracle** | `0x42ca12a83c14e95f567afc940b0118166d8bd852` | 5e18 ($5) | 1e36 |
| **lstCTC Oracle** | `0x192f1feb36f319e79b3bba25a17359ee72266a14` | 5e18 ($5) | 1e36 |
| **sbUSD Oracle** | `0xc39f222e034f4bd4f3c858e6fde9ce4398400a26` | 1e18 ($1) | 1e36 |

**인터페이스**: `getPrice() → uint256` (ORACLE_PRICE_SCALE = 1e36)
**가격 변경**: `setPrice(uint256)` (owner only)

---

## Markets

### Market 1: wCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261` |
| Loan Token | sbUSD (`0x5772f9415b75ecca00e7667e0c7d730db3b29fbd`) |
| Collateral Token | wCTC (`0x8f7f60a0f615d828eafcbbf6121f73efcfb56969`) |
| Oracle | `0x42ca12a83c14e95f567afc940b0118166d8bd852` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 77% (`770000000000000000`) |

### Market 2: lstCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e` |
| Loan Token | sbUSD (`0x5772f9415b75ecca00e7667e0c7d730db3b29fbd`) |
| Collateral Token | lstCTC (`0x72968ff9203dc5f352c5e42477b84d11c8c8f153`) |
| Oracle | `0x192f1feb36f319e79b3bba25a17359ee72266a14` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 80% (`800000000000000000`) |

### Market 3: sbUSD / USDC

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681` |
| Loan Token | USDC (`0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed`) |
| Collateral Token | sbUSD (`0x5772f9415b75ecca00e7667e0c7d730db3b29fbd`) |
| Oracle | `0xc39f222e034f4bd4f3c858e6fde9ce4398400a26` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 86% (`860000000000000000`) |

---

## SnowballLend 핵심 함수

### 읽기 (View)

```
supplyShares(bytes32 id, address user) → uint256
borrowShares(bytes32 id, address user) → uint256
collateral(bytes32 id, address user)   → uint256
market(bytes32 id) → (totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee)
                      모두 uint128
idToMarketParams(bytes32 id) → (loanToken, collateralToken, oracle, irm, lltv)
isAuthorized(address owner, address authorized) → bool
owner() → address
feeRecipient() → address
```

### 쓰기

```
supply(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes data) → (uint256, uint256)
withdraw(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) → (uint256, uint256)
borrow(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) → (uint256, uint256)
repay(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes data) → (uint256, uint256)
supplyCollateral(bytes32 id, uint256 assets, address onBehalf, bytes data)
withdrawCollateral(bytes32 id, uint256 assets, address onBehalf, address receiver)
liquidate(bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes data) → (uint256, uint256)
setAuthorization(address authorized, bool newIsAuthorized)
accrueInterest(bytes32 id)
```

> `assets`와 `shares` 중 **정확히 하나만 0이 아니어야** 합니다.
> `data`에 빈 값 전달: `"0x"`

### IRM 읽기

```
AdaptiveCurveIRM.borrowRateView(bytes32 id, uint256 totalSupply, uint256 totalBorrow) → uint256 (초당 이율, WAD)
```

---

## 수학 공식

### Shares ↔ Assets 변환

```
VIRTUAL_SHARES = 1e6
VIRTUAL_ASSETS = 1

toAssetsDown(shares, totalAssets, totalShares) = shares × (totalAssets + 1) / (totalShares + 1e6)
toSharesDown(assets, totalAssets, totalShares) = assets × (totalShares + 1e6) / (totalAssets + 1)
```

### 금리 변환

```
APR(%) = borrowRatePerSecond × 365 × 24 × 3600 / 1e18 × 100
Supply APY(%) = Borrow APR × utilization × (1 - fee)
Utilization = totalBorrowAssets / totalSupplyAssets
```

### Health Factor

```
healthFactor = (collateral × oraclePrice / 1e36 × lltv / 1e18) / borrowedAssets
```

- `>= 2.0` : Safe (초록)
- `>= 1.5` : Warning (노랑)
- `< 1.5` : Danger (빨강)
- `< 1.0` : Liquidatable

### Liquidation Price

```
liquidationPrice = borrowedAssets × 1e36 / (collateral × lltv / 1e18)
```

---

## ABI 임포트

```typescript
// from @snowball/shared (packages/shared/src/abis/index.ts)
import {
  SnowballLendABI,
  AdaptiveCurveIRMABI,
  MockOracleABI,
  MockERC20ABI,
  SnowballVaultFactoryABI,
  SnowballVaultABI,
  PublicAllocatorABI,
} from "@snowball/shared/abis";
```

---

## 빠른 복사용 (TypeScript)

```typescript
// ─── Addresses ───
const SNOWBALL_LEND    = "0x7d604b31297b36aace73255931f65e891cf289d3";
const ADAPTIVE_IRM     = "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe";
const VAULT_FACTORY    = "0x6e97df392462b8c2b8d13e2cd77a90168925edf6";
const PUBLIC_ALLOCATOR = "0x35b35a8c835eaf78b43137a51c4adccfc5d653b4";

// ─── Tokens ───
const WCTC     = "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969";
const LSTCTC   = "0x72968ff9203dc5f352c5e42477b84d11c8c8f153";
const SBUSD    = "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd";
const USDC     = "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed";

// ─── Oracles ───
const WCTC_ORACLE   = "0x42ca12a83c14e95f567afc940b0118166d8bd852";
const LSTCTC_ORACLE = "0x192f1feb36f319e79b3bba25a17359ee72266a14";
const SBUSD_ORACLE  = "0xc39f222e034f4bd4f3c858e6fde9ce4398400a26";

// ─── Market IDs ───
const MARKET_WCTC_SBUSD   = "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261";
const MARKET_LSTCTC_SBUSD = "0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e";
const MARKET_SBUSD_USDC   = "0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681";
```

---

## Snowball Protocol (Liquity 포크) 참조 주소

기존 Snowball Protocol과 통합 시 필요한 주소:

```
collateralRegistry: 0xb18f7a1944e905739e18f96d6e60427aab93c23d
hintHelpers:        0x7e8fa8852b0c1d697905fd7594d30afe693c76bb
multiTroveGetter:   0x8376dfa413a536075e23c706affbd6370ec7d380
agentVault:         0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40
```

소스: `/snowball/deployments/addresses.json`

---

## Deployer

```
Address: 0xf00F6cB5D43f9A38B10FA0B8e1B26cDB34D20d9d
Role: owner (SnowballLend, MockOracles, MockUSDC)
```
