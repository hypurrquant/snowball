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
| **SnowballLend** | `0x190a733eda9ba7d2b52d56764c5921d5cd4752ca` | 핵심 렌딩 프로토콜 |
| **AdaptiveCurveIRM** | `0xc4c694089af9bab4c6151663ae8424523fce32a8` | 금리 모델 |

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
| **wCTC Oracle** | `0xbd2c8afda5fa753669c5dd03885a45a3612171af` | 5e36 ($5) | 1e36 |
| **lstCTC Oracle** | `0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31` | 5.2e36 ($5.20) | 1e36 |
| **sbUSD Oracle** | `0xf82396f39e93d77802bfecc33344faafc4df50f2` | 1e36 ($1) | 1e36 |

**인터페이스**: `price() → uint256` (ORACLE_PRICE_SCALE = 1e36, Morpho Blue 표준)
**가격 변경**: `setPrice(uint256)` (owner only)

---

## Markets

### Market 1: wCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752` |
| Loan Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Collateral Token | wCTC (`0xca69344e2917f026ef4a5ace5d7b122343fc8528`) |
| Oracle | `0xbd2c8afda5fa753669c5dd03885a45a3612171af` |
| IRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |
| LLTV | 77% (`770000000000000000`) |

### Market 2: lstCTC / sbUSD

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e` |
| Loan Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Collateral Token | lstCTC (`0xa768d376272f9216c8c4aa3063391bdafbcad4c2`) |
| Oracle | `0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31` |
| IRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |
| LLTV | 77% (`770000000000000000`) |

### Market 3: sbUSD / USDC

| 항목 | 값 |
|------|-----|
| **Market ID** | `0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c` |
| Loan Token | USDC (`0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9`) |
| Collateral Token | sbUSD (`0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5`) |
| Oracle | `0xf82396f39e93d77802bfecc33344faafc4df50f2` |
| IRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |
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
const SNOWBALL_LEND    = "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca";
const ADAPTIVE_IRM     = "0xc4c694089af9bab4c6151663ae8424523fce32a8";
const VAULT_FACTORY    = "0x6e97df392462b8c2b8d13e2cd77a90168925edf6";
const PUBLIC_ALLOCATOR = "0x35b35a8c835eaf78b43137a51c4adccfc5d653b4";

// ─── Tokens ───
const WCTC     = "0xca69344e2917f026ef4a5ace5d7b122343fc8528";
const LSTCTC   = "0xa768d376272f9216c8c4aa3063391bdafbcad4c2";
const SBUSD    = "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5";
const USDC     = "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9"; // 18 decimals

// ─── Oracles (1e18 scale) ───
const WCTC_ORACLE   = "0xbd2c8afda5fa753669c5dd03885a45a3612171af";
const LSTCTC_ORACLE = "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31";
const SBUSD_ORACLE  = "0xf82396f39e93d77802bfecc33344faafc4df50f2";

// ─── Market IDs ───
const MARKET_WCTC_SBUSD   = "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752";
const MARKET_LSTCTC_SBUSD = "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e";
const MARKET_SBUSD_USDC   = "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c";
```

---

## Snowball Protocol (Liquity 포크) 참조 주소

기존 Snowball Protocol과 통합 시 필요한 주소:

```
collateralRegistry: 0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59
hintHelpers:        0x6ee9850b0915763bdc0c7edca8b66189449a447f
multiTroveGetter:   0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6
agentVault:         0x7bca6fb903cc564d92ed5384512976c94f2730d7
```

소스: `/snowball/deployments/addresses.json`

---

## Deployer

```
Address: 0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6
Role: owner (SnowballLend, MockOracles, MockUSDC)
```
