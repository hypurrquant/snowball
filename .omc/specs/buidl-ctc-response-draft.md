# BUIDL CTC Hackathon — Response

---

## 1. What mechanism maintains the sbUSD peg and prevents bank-run style liquidation cascades?

sbUSD is a CDP-based stablecoin backed by over-collateralized positions (wCTC, lstCTC). The peg is maintained through a combination of **protocol-level mechanisms** and **operational incentive design**.

### Protocol-Level Peg Defense

**Redemption Arbitrage:** Any user can redeem 1 sbUSD for $1 worth of collateral at any time. When sbUSD trades below $1 on the market, arbitrageurs buy discounted sbUSD and redeem for full-value collateral — pushing the price back to peg. This creates a hard floor.

**Multi-Threshold Liquidation Gates:** Rather than a single liquidation trigger that can cascade, we employ three sequential safety thresholds:
- **MCR (110-120%)**: Individual trove liquidation. Stability Pool absorbs the debt by burning it, removing bad debt from the system entirely.
- **CCR (150-160%)**: System-wide borrowing restrictions activate — no new debt can be created, but existing positions remain safe.
- **SCR (~125%)**: Shutdown mode — all new operations frozen, only redemptions and closures allowed.

This layered approach ensures that a price shock does not trigger a simultaneous mass liquidation.

### Operational Incentive Design (Our Key Differentiator)

The fundamental insight is: **DeFi users are highly sensitive to yield.** The real defense against a bank-run is not just liquidation mechanics — it's making sbUSD *too attractive to sell*.

**Emission-Based Stability:**
We operate DEX staking pools for key pairs — **sbUSD/USDT** and **sbUSD/dnUSDT** — and allocate protocol emission rewards to these pools. When CDP interest rates rise (signaling increased borrowing demand or market stress), we dynamically increase emissions to these pairs. This creates a counter-cyclical incentive:

- Market stress → CDP rates rise → Higher emissions to sbUSD liquidity pools → More users buy and hold sbUSD for yield → Selling pressure absorbed

**The sbUSD Peg Is Ultimately a Liquidity Problem:**
A stablecoin de-pegs when there are more sellers than buyers. Our strategy focuses on creating persistent reasons to *buy sbUSD on the open market* or *provide sbUSD liquidity*:

1. **sbUSD/USDT pool emissions** — direct yield for holding sbUSD in LP
2. **sbUSD/dnUSDT pool emissions** — delta-neutral yield opportunity
3. **Morpho lending markets** — supply sbUSD for lending yield
4. **Stability Pool** — earn liquidation gains in sbUSD

By distributing protocol revenue (swap fees, lending interest, CDP fees) as emission across these venues, we ensure there is always a yield incentive to hold sbUSD rather than sell it. This operational layer sits on top of the protocol-level redemption mechanism, creating a robust dual defense.

---

## 2. What exactly does the "AI agent" do that cannot be done with normal automation scripts or keeper bots?

**The core difference is reasoning vs. rules.**

A keeper bot or automation script executes pre-coded logic: `if utilization > 80% then rebalance`. It cannot adapt to novel conditions, weigh competing strategies, or discover new opportunities. It does exactly what it was programmed to do — nothing more.

**Our AI Agent uses actual CLI tools to explore, analyze, and act.**

We are developing dedicated agent tooling — **defi-cli** and **perp-cli** — purpose-built command-line interfaces that allow AI agents to:
- **Explore** every DeFi protocol on Creditcoin Network (pool states, rates, positions, liquidity depth)
- **Analyze** real-time on-chain data and compare opportunities across protocols
- **Execute** transactions through a permissioned vault system (ERC-8004) with granular function-level whitelisting and token spending caps

This is fundamentally different from a keeper bot. The agent doesn't follow a decision tree — it receives comprehensive market data through CLI tools, reasons about the best course of action, and executes accordingly. It can discover strategies that were never explicitly programmed.

**Why This Matters: DeFi Is Hard.**

The uncomfortable truth is that simple lending or supply-side deposits rarely produce satisfying returns on their own. Real yield in DeFi comes from multi-step strategies: borrow here, supply there, LP with the proceeds, compound at the right time. Most users cannot or will not execute these strategies manually.

Our AI Agent solves this. Instead of requiring users to understand Morpho utilization curves, Liquity interest rate dynamics, and DEX LP impermanent loss — the agent handles it. Users delegate with granular permissions (which contracts, which functions, how much capital), and the agent optimizes across the entire Snowball protocol stack.

**Revenue Model:**
We plan to monetize this agent infrastructure as a service. As the agent tooling matures and covers more of the Creditcoin DeFi landscape, it becomes a revenue-generating product layer — users pay for intelligent portfolio management that outperforms manual strategies or static bots.

**On-Chain Trust Layer (ERC-8004):**
Every agent has an on-chain identity (ERC-721), reputation score (user reviews + success rates tracked on-chain), and third-party validation. Users don't trust a black-box bot — they choose agents based on verifiable performance history. Permissions can be revoked instantly, and every execution is atomic with automatic approval cleanup.

---

## 3. How will you bootstrap liquidity for the DEX and lending markets on Creditcoin?

Liquidity bootstrapping on a new chain requires solving two problems: **initial depth** and **sustained incentives**. We address both.

### Protocol-Owned Initial Liquidity
Our team directly provides LP from the protocol treasury to critical pairs (sbUSD/USDC, wCTC/USDC, lstCTC/wCTC). This ensures usable liquidity from day one.

### Revenue-Funded Emission (ve(3,3) Model)
We allocate protocol revenue — from swap fees, lending interest, and CDP fees — as emission rewards to strategic LP pools. Specifically:

- **sbUSD/USDT** and **sbUSD/dnUSDT** receive prioritized emissions to activate sbUSD circulation
- **70% of protocol revenue goes to LPs**, 30% to protocol operations
- Minimum operating costs are retained; the rest is recycled into DEX, Lending, and emission incentives

This is not inflationary token printing. The emissions are funded by real protocol revenue, making them sustainable.

### Real Yield Generation: Delta-Neutral Vaults
We are developing **Delta-Neutral Vault** strategies that generate real yield independent of token price movements. This provides a compelling reason for capital to enter the Creditcoin ecosystem — not just speculative farming, but structured yield.

### Cross-Chain Competitiveness
In DeFi, the two things that drive capital migration between chains are: **(1) bridge connectivity** and **(2) competitive rates**.

We are building **AI Agent CLI tools that integrate on-chain data across multiple networks**. This allows us to monitor yield rates on competing chains in real-time and adjust our emission rates to remain competitive. If Ethereum lending yields 3% and our Morpho market yields 5% plus emission, capital has a clear reason to bridge over.

Our bridge infrastructure (DN Crosschain v2) already supports CC <> Sepolia <> USC corridors, and we integrate multiple protocols that a bridged user can immediately interact with — not just a single DEX or lending market.

### Organic Growth: DeFi Competition
We're launching a testnet-based DeFi Yield Competition — users receive tokens via faucet and compete to maximize portfolio value across all protocols (Swap, Lend, Borrow, CDP, LP, Vault). Top performers earn OG status. This drives organic liquidity as participants naturally provide LP, supply lending markets, and open CDPs.

---

## 4. What makes your product defensible if other teams deploy similar DeFi primitives on Creditcoin later?

### Organic Protocol Integration (Hard to Replicate)
Since our hackathon submission, we have continued shipping. We've added **ForwardX** (forward contract trading for cross-currency hedging) and are developing **Price Market Options**. Each new protocol is immediately integrated with sbUSD and our lending infrastructure.

The key: **we operate every protocol ourselves.** This means revenue flows between protocols are unified, cross-protocol strategies are seamless, and we can make integration decisions instantly. A competitor deploying "just a DEX" or "just a lending market" cannot replicate this organic connectivity.

**Concrete example:** After a user opens a CDP and mints sbUSD, our UI immediately presents contextual CTAs — "Supply to Morpho for 5% APY", "LP in sbUSD/USDT for emission rewards", "Deposit to Stability Pool for liquidation gains." This guides users through the flywheel naturally. Every transaction completion suggests the next productive action across our protocol suite.

A separate team deploying a competing DEX cannot offer "after you swap, go open a CDP on our lending platform" — because they don't own the lending platform.

### Minimal Operating Cost Through AI-Native Development
We use AI-native development and operations methodology. Beyond standard tooling, we develop **helper contracts** specifically designed to reduce protocol management overhead — batch operations, automated parameter adjustments, and monitoring infrastructure.

This means our operating cost per TVL is significantly lower than traditional teams. When protocol revenue is primarily returned to users (70% to LPs), having minimal overhead is a structural advantage that compounds over time.

### Transparent Revenue Sharing (Trust Moat)
We plan to **publicly disclose all protocol revenue and its distribution.** Users can verify that 70% goes to LP incentives, see exactly how emissions are allocated, and track protocol treasury usage.

This builds a trust moat that is difficult to replicate with marketing alone. DeFi users have been burned by opaque protocols. **When users see that the protocol they contribute to does not abandon them — that their participation directly funds their own rewards — they stay.** This is ultimately the strongest form of defensibility: earned trust through transparent operation.

### First-Mover Compound Effect
Liquidity depth compounds. Community relationships compound. Protocol integrations compound. Being first with a complete, integrated DeFi stack on Creditcoin means later entrants face cold-start problems across every dimension simultaneously — not just liquidity, but brand trust, integration depth, and user habits.

---

*Snowball Team*
