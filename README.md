# Snowball Protocol

**Liquity V2 fork on Creditcoin Testnet with AI agent automation**

Snowball is a decentralized lending protocol that lets users deposit CTC as collateral (wCTC or lstCTC) to borrow sbUSD, a USD-pegged stablecoin. It extends the Liquity V2 architecture with an AI agent layer that monitors positions, prevents liquidations, and optimizes interest rates automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)  :5173               │
│  Landing · Dashboard · Borrow · Earn · Stats · Agent · Chat │
└────────────────────┬────────────────────────────────────┘
                     │ REST / SSE
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌─────────────────┐
│ agent-consumer│        │  agent-chatbot  │
│   (API :3000) │        │    (AI :3002)   │
│  monitor loop │        │ OpenAI fallback │
└───────┬───────┘        └─────────────────┘
        │ A2A JSON-RPC
        ▼
┌───────────────────┐
│ agent-cdp-provider│
│     (A2A :3001)   │
│  builds unsigned  │
│     tx calldata   │
└───────────────────┘
        │ viem
        ▼
┌───────────────────────────────────────┐
│     Creditcoin Testnet (Chain 102031) │
│  BorrowerOperations · TroveManager   │
│  StabilityPool · CollateralRegistry  │
└───────────────────────────────────────┘
```

---

## Packages

| Package | Description | Port |
|---------|-------------|------|
| `contracts-liquity` | Solidity CDP protocol (Liquity V2 fork) | — |
| `contracts-8004` | ERC-8004 agent identity & reputation registry | — |
| `shared` | Shared ABIs, types, constants | — |
| `frontend` | React/Vite web UI | 5173 |
| `agent-consumer` | Core REST API + position monitor | 3000 |
| `agent-cdp-provider` | A2A JSON-RPC transaction builder | 3001 |
| `agent-chatbot` | Natural language DeFi assistant | 3002 |

---

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 9+
- Creditcoin Testnet wallet with tCTC
- `.env` file (see `.env.example`)

### Install

```bash
pnpm install
pnpm --filter @snowball/shared build
```

### Run (4 terminals)

```bash
# Terminal 1 — CDP Provider
pnpm dev:provider

# Terminal 2 — Consumer API + Monitor
pnpm dev:consumer

# Terminal 3 — Chatbot
pnpm dev:chatbot

# Terminal 4 — Frontend
pnpm --filter @snowball/frontend dev
```

Open `http://localhost:5173`

---

## Protocol Overview

### Key Concepts

| Term | Description |
|------|-------------|
| **Trove** | Individual borrowing position (one per collateral type per user) |
| **sbUSD** | Protocol stablecoin, 1:1 USD peg maintained via redemptions |
| **Health Factor** | `Collateral Value / Debt` — must stay above minimum |
| **Stability Pool** | Absorbs liquidations; depositors earn collateral rewards + interest yield |
| **Redemption** | sbUSD holders exchange sbUSD for collateral at face value (targets lowest-rate Troves) |

### Parameters

| Parameter | wCTC Branch | lstCTC Branch |
|-----------|-------------|---------------|
| Min Health Factor | 1.10 | 1.20 |
| System HF (CCR) | 1.50 | 1.60 |
| Interest Rate | 0.5% – 25% APR | 0.5% – 25% APR |
| Min Debt | 200 sbUSD | 200 sbUSD |
| Upfront Fee | `debt × rate × 7/365` | same |

### Reward Flow

1. Every Trove operation accrues interest since `lastDebtUpdateTime`
2. Accrued interest is distributed to Stability Pool depositors via `triggerBoldRewards`
3. SP depositors earn **collateral gains** (from liquidations) + **sbUSD gains** (from interest)
4. Both are claimable via `claimReward()` or auto-claimed on `withdrawFromSP()`

---

## Smart Contracts

Deployed on **Creditcoin Testnet** (Chain ID: 102031).
All addresses: [`deployments/addresses.json`](./deployments/addresses.json) and [`/SSOT.md`](../SSOT.md)

### Key Functions

**BorrowerOperations**
```
openTrove(owner, index, coll, debt, upperHint, lowerHint, rate, maxFee) → troveId
closeTrove(troveId)
adjustTrove(troveId, collChange, isCollInc, debtChange, isDebtInc, ...)
adjustTroveInterestRate(troveId, newRate, ...)
addColl(troveId, amount) / withdrawColl(troveId, amount)
repayBold(troveId, amount) / withdrawBold(troveId, amount, maxFee)
claimCollateral()
```

**StabilityPool**
```
provideToSP(amount)
withdrawFromSP(amount)      ← also auto-claims all rewards
claimReward()               ← claims collGain (collateral) + boldGain (sbUSD)
```

**TroveManager**
```
liquidate(troveId)
batchLiquidateTroves(troveIds[])
redeemCollateral(redeemer, boldAmount, price, maxIterations)
```

---

## AI Agent

The AI Agent monitors positions every 30 seconds and can:

- Detect **DANGER** (HF < minHF × 1.1) → auto-rebalance by adding collateral
- Detect **WARNING** (HF < minHF × 1.2) → suggest actions
- Detect **redemption risk** (rate below market avg) → auto-adjust interest rate

**Strategies**

| Strategy | Min HF Target |
|----------|--------------|
| Conservative | > 2.00 |
| Moderate | > 1.60 |
| Aggressive | > 1.30 |

**Agent API (port 3000)**

```
POST /api/agent/server-wallet        Register agent for user
GET  /api/agent/server-wallet        Get agent status
DELETE /api/agent/server-wallet      Deactivate agent
POST /api/agent/execute              Execute CDP action
GET  /api/events                     SSE stream (real-time updates)
```

---

## Contract Deployment

```bash
cd packages/contracts-liquity
npx hardhat compile
npx tsx scripts/deploy-viem.ts
```

Addresses are auto-saved to:
- `deployments/addresses.json` (used by all backends)
- `packages/frontend/src/config/addresses.json` (update manually or copy)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin 5 |
| Frontend | React 18, Vite, TailwindCSS, wagmi v2, viem, Privy, TanStack Query |
| Backend | Node.js, Express, TypeScript, tsx, viem, Pino |
| Auth | Privy (Web3 login + server wallet) |
| Real-time | Server-Sent Events (SSE) |
| Blockchain | Creditcoin Testnet, Chain ID 102031 |
| Package Manager | pnpm workspaces |

---

## Documentation

| File | Description |
|------|-------------|
| [`/SSOT.md`](../SSOT.md) | All deployed contract addresses & agent architecture |
| [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) | Detailed protocol design |
| [`DEMO_SCENARIO.md`](./DEMO_SCENARIO.md) | 5-7 min demo walkthrough |
| [`OP.md`](./OP.md) | Operations & maintenance guide |
| [`audit_report_v2.md`](./audit_report_v2.md) | Security audit |
