<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/snowball-logo.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/pitch/snowball.png" />
    <img src="docs/pitch/snowball.png" alt="Snowball Protocol" width="120" />
  </picture>
</p>

<h1 align="center">Snowball Protocol</h1>

<p align="center">
  <strong>A Full-Stack DeFi Suite for Creditcoin — Unlocking $80M+ in Idle Liquidity</strong>
</p>

<p align="center">
  <a href="#key-features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#demo-scenario">Demo</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

Creditcoin holds **over $80M in on-chain assets**, yet there is no native DeFi infrastructure to put them to work. Users have no way to swap, borrow, lend, or earn yield — their capital sits idle with zero utility.

## Our Solution

**Snowball** brings a complete, production-grade DeFi stack to Creditcoin — from a DEX to lending markets to cross-chain yield — all managed by AI agents that make DeFi accessible to everyone.

<table>
<tr>
<td width="25%" align="center"><strong>🔄 DEX</strong><br/><sub>Uniswap V3</sub></td>
<td width="25%" align="center"><strong>🏦 Borrow & Lend</strong><br/><sub>Liquity V2 + Morpho Blue</sub></td>
<td width="25%" align="center"><strong>🌐 Cross-Chain Yield</strong><br/><sub>USC Bridge Infrastructure</sub></td>
<td width="25%" align="center"><strong>🤖 AI Agent</strong><br/><sub>ERC-8004 Protocol</sub></td>
</tr>
<tr>
<td>Concentrated liquidity AMM for efficient on-chain trading</td>
<td>Mint sbUSD stablecoin against CTC collateral, then lend across isolated markets</td>
<td>Import yield sources from other chains (e.g. Hyperliquid DN) via USC</td>
<td>Autonomous on-chain agents that manage DeFi positions on behalf of users</td>
</tr>
</table>

---

## Key Features

### 1. DEX — Uniswap V3 on Creditcoin

Full Uniswap V3 deployment with concentrated liquidity. Users can swap tokens and provide liquidity with custom price ranges for maximum capital efficiency.

### 2. Borrow — Liquity V2 CDP

Users deposit **wCTC** as collateral to mint **sbUSD**, a dollar-pegged stablecoin native to Creditcoin. Interest rates are user-selected, with a redemption mechanism that incentivizes market-rate pricing.

### 3. Lend — Morpho Blue Markets

Isolated lending markets powered by Morpho Blue. Users can supply assets (wCTC, lstCTC, sbUSD) and borrow against them with oracle-priced collateral. Supports multiple market configurations with adaptive interest rate curves.

### 4. Cross-Chain Yield via USC

**The key infrastructure innovation.** USC (Universal Stablecoin) bridges enable importing external yield sources into Creditcoin. In our demo, users deposit sbUSD into a **Delta-Neutral Vault** backed by Hyperliquid yield — bringing real, sustainable returns to Creditcoin users without leaving the ecosystem.

### 5. AI Agent — ERC-8004 Autonomous DeFi Management

For users unfamiliar with DeFi, our **ERC-8004 AI Agent** autonomously manages positions:

- **Observer** — Monitors on-chain state (user rates, average rates, redemption risk)
- **Planner** — LLM-powered decision engine (via OpenAI Codex) analyzes risk and generates action plans
- **Executor** — Executes on-chain transactions through `AgentVault` with delegated permissions

> **Demo scenario:** When a market maker raises rates, the average rate increases and positions with below-average rates face redemption risk. The AI Agent detects this, evaluates the situation, and autonomously adjusts the interest rate — protecting the user's collateral without any manual intervention.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│   DEX  ·  Borrow  ·  Lend  ·  Yield  ·  Agent Delegation UI   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Server   │  │ Agent Server │  │  USC Worker   │
   │  (NestJS)  │  │   (NestJS)   │  │  (Bridge)     │
   │ Volume/TVL │  │  Cron + API  │  │ Sepolia→CTC   │
   └────────────┘  └──────┬───────┘  └──────────────┘
                          │
                   ┌──────┴───────┐
                   │ Claude Proxy │──→ LLM Decision Engine
                   └──────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     AgentVault (ERC-8004)    Creditcoin Testnet
     Permission-gated          Chain ID: 102031
     On-chain Execution
```

### Monorepo Structure

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js frontend — DeFi dashboard with all protocol UIs |
| `apps/server` | NestJS API — Volume/TVL data collection |
| `apps/agent-server` | NestJS Agent — Observer → Planner → Executor pipeline |
| `apps/claude-proxy` | LLM proxy — Routes decisions through Codex CLI |
| `apps/usc-worker` | Bridge worker — Sepolia BridgeBurn → USC auto-mint |
| `packages/core` | Shared addresses, ABIs, and configurations |
| `packages/agent-runtime` | Agent runtime — Capability Registry, Snapshots, Planner |
| `packages/liquity` | Liquity V2 Solidity contracts (Foundry) |

---

## Demo Scenario

**"AI Agent Protects Your Position from Redemption"**

```
Step 1  │  User opens a Trove (CDP) with 4.5% interest rate
        │  and delegates it to the AI Agent
        │
Step 2  │  A market maker raises their rate to 20%
        │  → Average rate increases across the protocol
        │
Step 3  │  Agent's Observer detects: user rate < avg rate
        │  → Position is now at redemption risk
        │
Step 4  │  Agent's Planner (LLM) analyzes the situation
        │  and decides to raise the interest rate
        │
Step 5  │  Agent's Executor calls adjustTroveInterestRate()
        │  via AgentVault.executeOnBehalf()
        │  → Position is safe from redemption ✓
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.24, Foundry, Liquity V2, Morpho Blue, Uniswap V3 |
| **Frontend** | Next.js 15, React 19, TailwindCSS, wagmi v2, viem |
| **Backend** | NestJS, TypeScript, SQLite |
| **AI Agent** | ERC-8004, Observer→Planner→Executor, OpenAI Codex CLI |
| **Bridge** | USC (Universal Stablecoin), Sepolia ↔ Creditcoin |
| **Infrastructure** | Docker Compose, nginx, pnpm monorepo |
| **Blockchain** | Creditcoin Testnet (Chain ID: 102031) |

---

## Getting Started

### Prerequisites

- Node.js 20+, pnpm 9+
- Docker & Docker Compose
- [Codex CLI](https://github.com/openai/codex) for AI Agent

### Quick Start

```bash
# 1. Clone & install
git clone https://github.com/hypurrquant/snowball.git
cd snowball
pnpm install

# 2. Environment setup
cp .env.example .env
# Set AGENT_PRIVATE_KEY, DEPLOYER_PRIVATE_KEY

# 3. Start all services (local)
just up                          # backend services
pnpm --filter @snowball/web dev  # frontend (http://localhost:3000)
cd apps/claude-proxy && make up  # LLM proxy for AI Agent

# Production
docker compose up -d             # nginx + server + agent-server + usc-worker
```

> **Note:** Our AI Agent does **not** call LLM APIs directly. Instead, we run [Codex CLI](https://github.com/openai/codex) locally and route agent decisions through an HTTP proxy (`apps/claude-proxy`). This means:
> - No API keys are stored in the project `.env`
> - Codex CLI must be installed on the host machine running the proxy
> - During demo, the agent's reasoning process is fully visible in the terminal — you can watch the LLM think and decide in real time

---

## Team

**Hypurrquant** — DeFi-native builders since 2024

| | Name | Role | Background |
|---|------|------|-----------|
| | **Kim HuiSang (HIK)** | Co-Founder / CEO | Financial Mathematics · DeFi strategist |
| | **Noh Yuseong (NOYU)** | Co-Founder / CTO | Software Engineering · Infrastructure at scale |

**Track Record:**

```
2024 Q1  Team Formed — AI research lab → on-chain
    ↓
2024 Q3  HypurrQuant — DEX LP management + trading bots
    ↓
2025 Q1  HypurrQuant V2 — Multi-chain, non-custodial
    ↓
2025 Q4  ForwardX — Cross-currency DeFi operations
    ↓
2026 Q1  Snowball — Full-stack DeFi for Creditcoin
```

---

<p align="center">
  <sub>Built with Liquity V2 · Morpho Blue · Uniswap V3 · ERC-8004 · USC</sub>
</p>
