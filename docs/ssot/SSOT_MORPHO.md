# SSOT — Snowball Lend (Morpho Blue Fork)

> Single Source of Truth. 모든 통합 작업은 이 문서를 기준으로 합니다.
> Version: v2.0.0 | Status: Active
> Last updated: 2026-03-07
> [INDEX](../INDEX.md)

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
| **wCTC** | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` | 18 | Snowball Protocol 배포 |
| **lstCTC** | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` | 18 | Snowball Protocol 배포 |
| **sbUSD** | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` | 18 | Snowball Protocol 배포 |
| **USDC** (Mock) | `0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9` | **18** | ctc-morpho MockERC20 |

> 모든 토큰은 `decimals=18` (USDC 포함).
> MockUSDC에는 `faucet()` 함수가 있음 (호출 시 1,000 USDC 민팅).

---

## Oracles

| 오라클 | 주소 | 초기 가격 | 스케일 |
|--------|------|----------|--------|
| **wCTC Oracle** | `0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2` | 5e18 ($5) | 1e18 |
| **lstCTC Oracle** | `0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a` | 5.2e18 ($5.20) | 1e18 |
| **sbUSD Oracle** | `0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a` | 1e18 ($1) | 1e18 |

**인터페이스**: `price() → uint256` (ORACLE_PRICE_SCALE = 1e18)
**가격 변경**: `setPrice(uint256)` (owner only)

---

## Markets

### Market 1: wCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x8dce00fbd59450e4d2f46e9aa637690fc21c058c4c8abf4dea75e9ab2ce38364` |
| Loan Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Collateral Token | wCTC (`0xca69344e2917f026ef4a5ace5d7b122343fc8528`) |
| Oracle | `0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 77% (`770000000000000000`) |

### Market 2: lstCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x93c1cf16ce13082a758d11757a899388741c39c4ed01364116137074fc9671ae` |
| Loan Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Collateral Token | lstCTC (`0xa768d376272f9216c8c4aa3063391bdafbcad4c2`) |
| Oracle | `0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 77% (`770000000000000000`) |

### Market 3: sbUSD / USDC

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x6708534b3aa0dc0b77dd4e534187d801f664958238b45b0563e63dbfe914fddd` |
| Loan Token | USDC (`0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9`) |
| Collateral Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Oracle | `0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a` |
| IRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| LLTV | 90% (`900000000000000000`) |

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
healthFactor = (collateral × oraclePrice / 1e18 × lltv / 1e18) / borrowedAssets
```

- `>= 2.0` : Safe (초록)
- `>= 1.5` : Warning (노랑)
- `< 1.5` : Danger (빨강)
- `< 1.0` : Liquidatable

### Liquidation Price

```
liquidationPrice = borrowedAssets × 1e18 / (collateral × lltv / 1e18)
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
const WCTC     = "0xca69344e2917f026ef4a5ace5d7b122343fc8528";
const LSTCTC   = "0xa768d376272f9216c8c4aa3063391bdafbcad4c2";
const SBUSD    = "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5";
const USDC     = "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9"; // 18 decimals

// ─── Oracles (1e18 scale) ───
const WCTC_ORACLE   = "0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2";
const LSTCTC_ORACLE = "0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a";
const SBUSD_ORACLE  = "0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a";

// ─── Market IDs ───
const MARKET_WCTC_SBUSD   = "0x8dce00fbd59450e4d2f46e9aa637690fc21c058c4c8abf4dea75e9ab2ce38364";
const MARKET_LSTCTC_SBUSD = "0x93c1cf16ce13082a758d11757a899388741c39c4ed01364116137074fc9671ae";
const MARKET_SBUSD_USDC   = "0x6708534b3aa0dc0b77dd4e534187d801f664958238b45b0563e63dbfe914fddd";
```

---

## Snowball Protocol (Liquity 포크) 참조 주소

기존 Snowball Protocol과 통합 시 필요한 주소:

```
collateralRegistry: 0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59
hintHelpers:        0x6ee9850b0915763bdc0c7edca8b66189449a447f
multiTroveGetter:   0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6
agentVault:         0xf8e322c36485fa4c3971f75819c5de5a9be2b870
```

소스: `/snowball/deployments/addresses.json`

---

## Deployer

```
Address: 0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6
Role: owner (SnowballLend, MockOracles, MockUSDC)
```
