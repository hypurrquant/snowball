# ForwardX - On-Chain Forward Exchange

**ForwardX** is a fully-collateralized, on-chain Non-Deliverable Forward (NDF) exchange for FX and RWA trading, powered by **Chainlink CRE** (Runtime Environment) for automated settlement.

> Built for the [Chainlink Convergence Hackathon](https://chain.link/hackathon) - DeFi & Tokenization Track

**Live Demo**: [ForwardX Demo](https://ervin-accessorial-kandis.ngrok-free.dev/) (Base Sepolia & HyperEVM Testnet)

---

## The Problem

USD/KRW and USD/JPY are among the most traded FX pairs globally — the KRW NDF market alone exceeds **$300B+ monthly notional**. Yet **no Chainlink Data Feed exists for these exotic pairs on-chain**. This makes decentralized FX derivatives impossible with traditional oracle approaches.

Beyond exotic FX, DeFi users holding stablecoins remain fully exposed to FX risk with no on-chain hedging instruments. Meanwhile, tokenized equities face regulatory roadblocks across jurisdictions — direct on-chain stock token issuance remains impractical. These constraints keep DeFi confined to crypto-native assets, stalling its connection to the real economy.

## Our Solution

ForwardX bypasses these barriers by offering **price derivatives (NDFs)** instead of direct asset tokenization — providing on-chain FX and equity exposure without regulatory risk. The protocol uses **Chainlink CRE** to create a **custom data pipeline**: the CRE workflow fetches real-time FX/equity prices from external APIs, aggregates them via DON consensus (median), and automatically settles matured positions on-chain.

### Supported Markets

| Pair | Type | Description |
|------|------|-------------|
| USD/KRW | FX | US Dollar / Korean Won |
| USD/JPY | FX | US Dollar / Japanese Yen |
| EUR/USD | FX | Euro / US Dollar |
| SAMSUNG/USD | RWA (Equity) | Samsung Electronics |
| GOOGLE/USD | RWA (Equity) | Alphabet Inc. |

---

## Architecture

ForwardX consists of two interconnected trading systems, both powered by Chainlink CRE auto-settlement:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ForwardX Protocol (Base Sepolia + HyperEVM Testnet)            │
│                                                                             │
│  ┌──────────────────────┐           ┌──────────────────────────┐           │
│  │   P2P OTC Forward    │           │   Tokenized Forward AMM  │           │
│  │   (ERC-721 NFTs)     │           │   (Yield Space Curve)    │           │
│  │                      │           │                          │           │
│  │  Forward.sol         │           │  FXPool.sol              │           │
│  │  Vault.sol           │           │  MaturityToken.sol       │           │
│  │  Marketplace.sol     │           │  Router.sol              │           │
│  │  RiskManager.sol     │           │  EscrowVault.sol         │           │
│  └──────────┬───────────┘           └────────────┬─────────────┘           │
│             │                                    │                         │
│  ┌──────────┴────────────────────────────────────┴───────────────┐        │
│  │               Chainlink CRE Auto-Settlement (DON)              │        │
│  │                                                                │        │
│  │  ForwardSettlementConsumer    TokenizedSettlementConsumer       │        │
│  │  (P2P OTC settlement)        (AMM series settlement)          │        │
│  └────────────────────────────────────────────────────────────────┘        │
│             │                                                              │
│  ┌──────────┴─────────────────────────────────────────────────────┐       │
│  │                    Oracle Layer                                  │       │
│  │  CREOracleAdapter  │  OracleGuard  │  StubOracleAdapter         │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. P2P OTC Forward

Peer-to-peer FX forward contracts with ERC-721 position NFTs and secondary marketplace.

### Lifecycle

1. **Deposit** - Users deposit USDC collateral into the Vault
2. **Create Offer** - Maker sets forward rate, direction (Long/Short), notional, and maturity
3. **Accept Offer** - Taker accepts, both collaterals are locked, paired ERC-721 NFTs minted
4. **Trade** (Optional) - List position NFTs on Marketplace for secondary trading
5. **Auto-Settle** - At maturity, CRE workflow fetches FX rate via DON consensus, settles automatically
6. **Withdraw** - Winner withdraws USDC profit

### NDF Settlement Formula

```
PnL(Long)  = N × (S_T − F₀) / F₀
PnL(Short) = −PnL(Long)
```

- `N` = Notional (USDC, 6 decimals), `F₀` = Agreed forward rate, `S_T` = Settlement rate (CRE DON consensus)
- **Linear payoff**: % rate change = % return. Zero gamma, zero convexity.
- Full collateral: both sides deposit 100% notional (no leverage)
- Paired NFTs: Even=Long, Odd=Short (IDs start at 2)

---

## 2. Tokenized Forward AMM

Yield Space AMM for tokenized FX forwards. Users mint fToken (Long) / sfToken (Short) pairs and trade them in a constant-function AMM pool.

### Token Settlement Formula

```
fToken redemption  = S_T / F₀          (USDC per token)
sfToken redemption = 2 − S_T / F₀      (USDC per token)
Always: fToken + sfToken = 2 USDC       (zero-sum guarantee)
Clamp: max(0, min(2, ...))             (bounded loss)
```

- **Linear payoff**: If rate moves +10% → fToken = 1.10 USDC, sfToken = 0.90 USDC
- Extreme moves (>100%) are clamped — max loss is 1 USDC per token
- fToken = Long exposure, sfToken = Short exposure as standard ERC-20 tokens

### Yield Space AMM (FXPool)

AMM for fToken ↔ sfToken trading with time-decaying curve:

```
Invariant:     x^(1−t) + y^(1−t) = k
Swap formula:  Δy = y − (k − (x + Δx)^(1−t))^(1/(1−t))
Time param:    t = t_min + (t_max − t_min) × √(T_remaining / T_total)
```

- `x`, `y` = fToken, sfToken reserves
- `t` = time-decay curvature (√ decay → curve converges to linear `x + y = k` at maturity)
- `k` is recomputed at current `t` before every swap (not cached — `t` changes over time)
- At maturity: `t → t_min ≈ 0` → tokens trade at theoretical settlement price

**Dynamic Fee Model**:

```
Base fee:     baseFee = feeMax × √(T_remaining / T_total)
Pool skew:    skew = |x − y| / (x + y)
Drain trade:  fee = baseFee × (1 + 4 × skew²)     ← penalty
Rebalance:    fee = baseFee × max(0.5, 1 − skew)   ← discount
```

### Flow

1. **Mint** - Deposit USDC → receive fToken + sfToken pair
2. **Swap** - Trade fToken ↔ sfToken in FXPool (Yield Space pricing with dynamic fees)
3. **Add Liquidity** - Provide tokens to the pool, receive LP tokens
4. **CRE Settlement** - At maturity, CRE workflow settles the series with live FX rate
5. **Redeem** - Burn settled tokens → receive USDC based on redemption rate

### Additional Features

- **Router**: Combined operations (mintAndSwap, mintAndAddLiquidity, removeLiquidityAndRedeem, redeemAndRoll)
- **Alt collateral**: Support for aUSDC via CollateralSwap

---

## Chainlink CRE Integration

### Why CRE?

Traditional oracle price feeds don't cover exotic FX pairs like USD/KRW on-chain. CRE solves this by:

1. **Custom Data Feeds** - Fetches FX rates from Frankfurter API (ECB data) with DON consensus
2. **Automated Settlement** - Cron-triggered workflow scans and settles matured positions every 5 minutes
3. **Trust-Minimized** - Settlement reports are DON-signed (threshold ECDSA) and verified on-chain via KeystoneForwarder

### CRE Workflows

| Workflow | Target | Report Format |
|----------|--------|---------------|
| `fx-settlement` | P2P OTC Forward | `(positionId, settlementRate, pnl, winner, loser)` |
| `tokenized-settlement` | Tokenized AMM | `(seriesId, settlementRate)` |

Both workflows run on a 5-minute cron, fetch rates via DON consensus (median aggregation), and deliver signed reports through KeystoneForwarder.

---

## Multi-Chain Deployment

Deployed on **two testnets**:

| Chain | Chain ID | Explorer |
|-------|----------|----------|
| Base Sepolia | 84532 | [basescan](https://sepolia.basescan.org) |
| HyperEVM Testnet | 998 | [purrsec](https://testnet.purrsec.com) |

### Deployed Contracts — Base Sepolia

**P2P OTC System**

| Contract | Address |
|----------|---------|
| Vault | [`0x9493E2374F4b071F5beF15D1c08fF05932f22FAe`](https://sepolia.basescan.org/address/0x9493E2374F4b071F5beF15D1c08fF05932f22FAe) |
| Forward | [`0xbc0c07203Fcc8FD141f19CD9f0c9862B19fb0763`](https://sepolia.basescan.org/address/0xbc0c07203Fcc8FD141f19CD9f0c9862B19fb0763) |
| RiskManager | [`0xDcf65D00A4baac1EcF07200146bBBE8755Ab4a1a`](https://sepolia.basescan.org/address/0xDcf65D00A4baac1EcF07200146bBBE8755Ab4a1a) |
| SettlementEngine | [`0xe1a15ef1857f84A3F177e3bcf8C4873c710CD130`](https://sepolia.basescan.org/address/0xe1a15ef1857f84A3F177e3bcf8C4873c710CD130) |
| ForwardSettlementConsumer | [`0xa379B60A33c7985Feb958Cf9d51ff055FE71DEF1`](https://sepolia.basescan.org/address/0xa379B60A33c7985Feb958Cf9d51ff055FE71DEF1) |
| Marketplace | [`0x17C81E00bf5ceAD788C5d805231A3EC9Db8cb7d9`](https://sepolia.basescan.org/address/0x17C81E00bf5ceAD788C5d805231A3EC9Db8cb7d9) |

**Tokenized AMM System**

| Contract | Address |
|----------|---------|
| EscrowVault | [`0x0742E48a1A6b7938CD88ae15C611d80451CcEFf0`](https://sepolia.basescan.org/address/0x0742E48a1A6b7938CD88ae15C611d80451CcEFf0) |
| MaturityTokenFactory | [`0x68E9e7F096Ee8c0E631Ff77C11e584CA8319D974`](https://sepolia.basescan.org/address/0x68E9e7F096Ee8c0E631Ff77C11e584CA8319D974) |
| FXPool (KRW) | [`0xe1A519137818678339e309D51131Df53b356a2dc`](https://sepolia.basescan.org/address/0xe1A519137818678339e309D51131Df53b356a2dc) |
| FXPool (EUR) | [`0x139C767A96a1E3D7A6f336ADd8C099c4Cb6A0373`](https://sepolia.basescan.org/address/0x139C767A96a1E3D7A6f336ADd8C099c4Cb6A0373) |
| Router | [`0xFAE459913f7DdDfa3FCf6987676062cbf1f907f5`](https://sepolia.basescan.org/address/0xFAE459913f7DdDfa3FCf6987676062cbf1f907f5) |
| TokenizedSettlementConsumer | [`0xE911Af007567F376c30A71a77C3b1a68A15EfD8B`](https://sepolia.basescan.org/address/0xE911Af007567F376c30A71a77C3b1a68A15EfD8B) |

**Shared**

| Contract | Address |
|----------|---------|
| MockUSDC | [`0xeb42C8a72016092d95c092ab594a31a57b24d688`](https://sepolia.basescan.org/address/0xeb42C8a72016092d95c092ab594a31a57b24d688) |
| OracleGuard | [`0xD5b944474e45DB26e53E416aC0627c3Dbd5D7728`](https://sepolia.basescan.org/address/0xD5b944474e45DB26e53E416aC0627c3Dbd5D7728) |

### Deployed Contracts — HyperEVM Testnet

**P2P OTC System**

| Contract | Address |
|----------|---------|
| Vault | [`0x5302Ca309208A737fBb56BCB4103A6ce99b24ecd`](https://testnet.purrsec.com/address/0x5302Ca309208A737fBb56BCB4103A6ce99b24ecd) |
| Forward | [`0xb151d6a2Aab387b9EC44771b3c5ec675f0Ac15Cb`](https://testnet.purrsec.com/address/0xb151d6a2Aab387b9EC44771b3c5ec675f0Ac15Cb) |
| RiskManager | [`0x6A270B8A25fC4dFF26A38dAB614d8a76210BfC2D`](https://testnet.purrsec.com/address/0x6A270B8A25fC4dFF26A38dAB614d8a76210BfC2D) |
| SettlementEngine | [`0x51D2CA487558835e491CeB2097DC600F0aA88d86`](https://testnet.purrsec.com/address/0x51D2CA487558835e491CeB2097DC600F0aA88d86) |
| ForwardSettlementConsumer | [`0xFD72A4fA82CA0e2f011286fCe473B3DAa5B0D6Bf`](https://testnet.purrsec.com/address/0xFD72A4fA82CA0e2f011286fCe473B3DAa5B0D6Bf) |
| Marketplace | [`0x704c6e7ec4Bf58AcD576316500213C88C0aA2B82`](https://testnet.purrsec.com/address/0x704c6e7ec4Bf58AcD576316500213C88C0aA2B82) |

**Tokenized AMM System**

| Contract | Address |
|----------|---------|
| EscrowVault | [`0x275f8b39e5c85AF9Fe3Fd562AB7Ac5297E4C4a82`](https://testnet.purrsec.com/address/0x275f8b39e5c85AF9Fe3Fd562AB7Ac5297E4C4a82) |
| MaturityTokenFactory | [`0xD7966b295a130C33377dE1e8a9D33487098847eD`](https://testnet.purrsec.com/address/0xD7966b295a130C33377dE1e8a9D33487098847eD) |
| FXPool (KRW) | [`0x4C34357e14cBBDBDE3Ebf5dE7C6AB2D258C2D881`](https://testnet.purrsec.com/address/0x4C34357e14cBBDBDE3Ebf5dE7C6AB2D258C2D881) |
| FXPool (EUR) | [`0xF832af6c4A8F81A65AA5f61E77104F260e741d2F`](https://testnet.purrsec.com/address/0xF832af6c4A8F81A65AA5f61E77104F260e741d2F) |
| Router | [`0x3e6e6ae95E14e3A95B03DbD79B2540Bef9d221d4`](https://testnet.purrsec.com/address/0x3e6e6ae95E14e3A95B03DbD79B2540Bef9d221d4) |
| TokenizedSettlementConsumer | [`0xd214359a5B680FAaf43161340cD6FE3872f5C042`](https://testnet.purrsec.com/address/0xd214359a5B680FAaf43161340cD6FE3872f5C042) |

**Shared**

| Contract | Address |
|----------|---------|
| MockUSDC | [`0x665Cc50dDd2a62A12C84D348086D8fa2E2A5F4a3`](https://testnet.purrsec.com/address/0x665Cc50dDd2a62A12C84D348086D8fa2E2A5F4a3) |
| OracleGuard | [`0xE59269c6C665358253bDfAe5a702Ae13B3962204`](https://testnet.purrsec.com/address/0xE59269c6C665358253bDfAe5a702Ae13B3962204) |

---

## Project Structure

```
src/
├── primitives/forward/Forward.sol      # ERC-721 position manager
├── infrastructure/
│   ├── Vault.sol                       # USDC collateral custody
│   ├── RiskManager.sol                 # OI limits, market config
│   ├── SettlementEngine.sol            # Manual NDF settlement
│   └── Marketplace.sol                 # Secondary NFT trading
├── oracle/
│   ├── CREOracleAdapter.sol            # Chainlink CRE oracle adapter
│   ├── StubOracleAdapter.sol           # Stub for testing
│   └── OracleGuard.sol                 # Circuit breaker + fallback
├── cre/
│   ├── ForwardSettlementConsumer.sol   # P2P CRE auto-settlement
│   ├── TokenizedSettlementConsumer.sol # AMM CRE auto-settlement
│   └── ForwardViewHelper.sol           # On-chain matured position query
├── tokenized/
│   ├── MaturityToken.sol               # fToken / sfToken (ERC-20)
│   ├── MaturityTokenFactory.sol        # Series creation & settlement
│   ├── EscrowVault.sol                 # Per-series USDC escrow
│   ├── FXPool.sol                      # Yield Space AMM
│   ├── Router.sol                      # Combined operations
│   ├── CollateralSwap.sol              # aUSDC ↔ USDC swap
│   └── math/YieldSpaceMath.sol         # PRBMath UD60x18
└── interfaces/                         # All contract interfaces

cre-workflow/
├── fx-settlement/                      # P2P OTC auto-settlement workflow
└── tokenized-settlement/               # Tokenized AMM auto-settlement workflow

frontend/                               # Next.js + wagmi + Tailwind CSS
test/                                   # Unit, integration, invariant tests
script/                                 # Foundry deploy scripts
```

---

## Frontend

Next.js frontend with multi-chain support and Base Smart Wallet integration.

### Features

- **Multi-Chain** - Base Sepolia + HyperEVM Testnet with chain switcher
- **Base Smart Wallet** - Passkey sign-in, no browser extension needed
- **P2P Trading** - Create/accept FX forward offers with PnL simulator
- **Tokenized AMM** - Mint, swap, add/remove liquidity, and redeem fToken/sfToken
- **Marketplace** - Secondary trading of position NFTs
- **Yield Dashboard** - Portfolio yield, forward curves, carry trade products
- **Real-time FX Rates** - Live rates from Frankfurter API
- **Position Management** - Track active/pending/settled positions

### Tech Stack

- Next.js 16, React 19, TypeScript
- wagmi v3, viem, TanStack Query
- Coinbase Wallet SDK (Smart Wallet), WalletConnect
- Tailwind CSS 4

---

## Getting Started

### Prerequisites

- [Foundry](https://getfoundry.sh/) (forge, cast)
- [Bun](https://bun.sh/) >= 1.2.21 (for CRE CLI)
- [Node.js](https://nodejs.org/) >= 18 + pnpm (for frontend)

### Build & Test Smart Contracts

```bash
# Install dependencies
forge install

# Build
forge build

# Run all tests (227 tests)
forge test

# Verbose output
forge test -vvvv
```

### Run Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### Deploy

```bash
cp .env.sample .env
# Edit .env with your keys

# Deploy full protocol (Base Sepolia)
forge script script/DeployAllWithMock.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast

# Deploy to HyperEVM Testnet
forge script script/DeployMockUSDC.s.sol --rpc-url hyperevm_testnet --broadcast
MOCK_USDC=<address> forge script script/DeployAllWithMock.s.sol \
  --rpc-url hyperevm_testnet --broadcast
```

---

## Testing

**227 tests passing** across unit, integration, fuzz, and invariant suites:

| Suite | Tests | Description |
|-------|-------|-------------|
| VaultTest | 12 | Deposit, withdraw, lock, settle, edge cases |
| OracleGuardTest | 9 | Staleness, confidence, deviation, fallback |
| RiskManagerTest | 11 | Market config, OI limits, concentration |
| ForwardTest | 19 | Create, accept, cancel, settle, transfer |
| SettlementTest | 7 | NDF PnL calculation, settlement flow |
| ForwardSettlementConsumerTest | 11 | CRE report processing, access control |
| MarketplaceTest | 10 | List, buy, cancel, stale listing protection |
| YieldSpaceMathTest | 23 | Invariant, pow, sqrt, swap calculations |
| MaturityTokenTest | 13 | Mint, settle, redeem, redemption rates |
| FXPoolTest | 18 | Swap, liquidity, dynamic fees, time decay |
| FXPoolUSDCTest | 10 | USDC-paired pool operations |
| EscrowVaultTest | 6 | Per-series deposit/release |
| TokenizedSettlementConsumerTest | 10 | CRE report, access control |
| ForwardLifecycleTest | 8 | Full P2P E2E scenarios |
| MarketplaceLifecycleTest | 5 | List → buy → settle E2E |
| TokenizedLifecycleTest | 7 | Mint → swap → settle → redeem → rollover E2E |
| ForwardInvariantTest | 2 | Vault solvency, balance consistency |

## Chainlink CRE — File Index

All files that use Chainlink CRE (Runtime Environment) in this project:

### CRE Workflows (TypeScript — runs on the Chainlink DON)

| File | Description |
|------|-------------|
| [`cre-workflow/fx-settlement/main.ts`](cre-workflow/fx-settlement/main.ts) | P2P OTC auto-settlement workflow — cron trigger, FX/equity price fetch, DON consensus (median), PnL computation, signed report delivery |
| [`cre-workflow/fx-settlement/abi.ts`](cre-workflow/fx-settlement/abi.ts) | ABI definitions for on-chain contract calls (ForwardViewHelper, Consumer) |
| [`cre-workflow/fx-settlement/config.staging.json`](cre-workflow/fx-settlement/config.staging.json) | Staging config — contract addresses, chain selectors, cron schedule |
| [`cre-workflow/tokenized-settlement/main.ts`](cre-workflow/tokenized-settlement/main.ts) | Tokenized AMM auto-settlement workflow — settles matured series via DON-signed reports |
| [`cre-workflow/tokenized-settlement/abi.ts`](cre-workflow/tokenized-settlement/abi.ts) | ABI definitions for MaturityTokenFactory and Consumer |
| [`cre-workflow/tokenized-settlement/config.staging.json`](cre-workflow/tokenized-settlement/config.staging.json) | Staging config for tokenized settlement |
| [`cre-workflow/project.yaml`](cre-workflow/project.yaml) | CRE project manifest |

### On-Chain Consumer Contracts (Solidity — receives DON-signed reports)

| File | Description |
|------|-------------|
| [`src/cre/ForwardSettlementConsumer.sol`](src/cre/ForwardSettlementConsumer.sol) | P2P OTC consumer — receives DON reports via KeystoneForwarder, validates metadata (workflowId, author, name), settles positions. UUPS upgradeable, pausable. |
| [`src/cre/TokenizedSettlementConsumer.sol`](src/cre/TokenizedSettlementConsumer.sol) | Tokenized AMM consumer — receives DON reports, settles series on MaturityTokenFactory. IReceiver + ERC-165 + metadata validation. |
| [`src/cre/IReceiver.sol`](src/cre/IReceiver.sol) | Standard CRE receiver interface (`onReport(bytes metadata, bytes report)`) |
| [`src/cre/ForwardViewHelper.sol`](src/cre/ForwardViewHelper.sol) | Batch view helper — returns all matured positions in one `staticcall`, reducing DON chain reads from O(N) to O(1) |

### Oracle Adapters (Solidity — CRE oracle integration)

| File | Description |
|------|-------------|
| [`src/oracle/CREOracleAdapter.sol`](src/oracle/CREOracleAdapter.sol) | Oracle adapter that stores CRE-delivered settlement prices |
| [`src/oracle/OracleGuard.sol`](src/oracle/OracleGuard.sol) | Circuit breaker with staleness checks, deviation bounds, and fallback oracle |

### Tests

| File | Description |
|------|-------------|
| [`test/unit/ForwardSettlementConsumer.t.sol`](test/unit/ForwardSettlementConsumer.t.sol) | Unit tests — report processing, access control, metadata validation, ERC-165, pausability |
| [`test/unit/TokenizedSettlementConsumer.t.sol`](test/unit/TokenizedSettlementConsumer.t.sol) | Unit tests — series settlement, IReceiver interface, forwarder updates |

### Deploy Scripts

| File | Description |
|------|-------------|
| [`script/DeployTokenizedConsumer.s.sol`](script/DeployTokenizedConsumer.s.sol) | Deploys TokenizedSettlementConsumer with KeystoneForwarder config |

---

## Security

- **CEI Pattern** (Checks-Effects-Interactions) throughout
- **ReentrancyGuard** on all state-changing functions
- **SafeERC20** for all token transfers
- **AccessControl** with role-based permissions (OPERATOR_ROLE, CRE_CONSUMER_ROLE, MARKETPLACE_ROLE)
- **UUPS Proxy** pattern for upgradeability
- **Pausable** for emergency stops
- **OracleGuard** with staleness checks, deviation bounds, and fallback oracle
- **RiskManager** with per-market OI limits and concentration caps
- **Transaction deadlines** on all Router operations
- **Pull payment** model (users withdraw, no push)
- Locked pragma (`solidity 0.8.24`)

## License

MIT
