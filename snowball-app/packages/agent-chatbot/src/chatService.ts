import type { ChatResponse } from "@snowball/shared";
import { STRATEGIES } from "@snowball/shared";

const CONSUMER_API_URL = process.env.CONSUMER_API_URL || "http://localhost:3000";

interface ConversationMessage {
  role: string;
  content: string;
  timestamp: number;
}

// DeFi knowledge base for fallback (no LLM)
const DEFI_KB: Record<string, { reply: string; suggestedActions: string[] }> = {
  "liquidation": {
    reply: "**Liquidation** occurs when your collateral ratio falls below the Minimum Collateral Ratio (MCR), " +
      "and the protocol automatically closes your position.\n\n" +
      "- **wCTC branch**: Min Health Factor = 1.10, System HF = 1.50\n" +
      "- **lstCTC branch**: Min Health Factor = 1.20, System HF = 1.60\n\n" +
      "When liquidated, your collateral is distributed to Stability Pool depositors. " +
      "To avoid liquidation, always keep your Health Factor well above the minimum.",
    suggestedActions: ["Check My Position", "담보 추가"],
  },
  "interest rate": {
    reply: "**Interest Rate** is the annual cost you pay to borrow sbUSD.\n\n" +
      "- Range: 0.5% – 25% APR\n" +
      "- **Lower rate**: Cheaper, but you are a priority target for redemptions\n" +
      "- **Higher rate**: More expensive, but lower redemption risk\n\n" +
      "A 7-day upfront fee is charged when opening a Trove:\n" +
      "`upfront fee = debt × annualRate × 7/365`",
    suggestedActions: ["Strategy Recommendations", "이자율 조정"],
  },
  "redemption": {
    reply: "**Redemption** is when sbUSD holders exchange sbUSD for collateral at face value.\n\n" +
      "Troves with the lowest interest rates are targeted first. " +
      "When redeemed, your Trove's debt decreases but so does your collateral.\n\n" +
      "To avoid redemptions, set your interest rate higher than other users.",
    suggestedActions: ["이자율 조정", "Position Summary"],
  },
  "health factor": {
    reply: "**Health Factor (HF)** is the ratio of your collateral value to your debt.\n\n" +
      "Formula: `HF = (Collateral × Price) / Debt`\n\n" +
      "- HF ≥ 2.00: Safe (Healthy)\n" +
      "- 1.50 – 2.00: At Risk\n" +
      "- HF < 1.50: Danger — liquidation risk\n\n" +
      "If HF drops below the minimum, your position is instantly liquidated.",
    suggestedActions: ["Check My Position", "담보 추가"],
  },
  "sbUSD": {
    reply: "**sbUSD** is the stablecoin of the Snowball Protocol.\n\n" +
      "- Deposit CTC collateral to borrow sbUSD\n" +
      "- 1 sbUSD ≈ 1 USD target peg\n" +
      "- Deposit sbUSD into the Stability Pool to earn liquidation rewards (collateral)\n" +
      "- Price stability is maintained via the redemption mechanism",
    suggestedActions: ["포지션 열기", "SP 예치하기"],
  },
  "stability pool": {
    reply: "**Stability Pool (SP)** is the protocol's liquidation buffer.\n\n" +
      "**How to deposit:**\n" +
      "1. Obtain sbUSD (borrow from a Trove, etc.)\n" +
      "2. Deposit sbUSD into the Stability Pool\n" +
      "3. Automatically participate in liquidations\n\n" +
      "**Benefits:**\n" +
      "- Acquire collateral at a discount during liquidations (typically 10–15% profit)\n" +
      "- Earn rewards for contributing to protocol stability\n" +
      "- Generate passive income\n\n" +
      "**Note:** Frequent liquidations convert your sbUSD deposit into collateral.",
    suggestedActions: ["SP 예치하기", "Check My Position"],
  },
  "agent": {
    reply: "**AI Agent** is Snowball's automated position management assistant.\n\n" +
      "**Key features:**\n" +
      "- Position monitoring every 30 seconds (Health Factor checks)\n" +
      "- Auto-rebalancing when risk is detected (add collateral / repay debt)\n" +
      "- Strategy-based management (Conservative / Moderate / Aggressive)\n" +
      "- Liquidation price alerts\n\n" +
      "**Why use it?**\n" +
      "- 24/7 monitoring for rapid response to price drops\n" +
      "- Removes emotional decision-making\n" +
      "- Saves time compared to manual management",
    suggestedActions: ["에이전트 활성화", "Strategy Recommendations"],
  },
  "fee": {
    reply: "**Snowball Fee Guide:**\n\n" +
      "**1. Upfront Fee** (one-time at Trove creation)\n" +
      "`upfrontFee = debt × annualRate × 7/365`\n" +
      "e.g. 1,000 sbUSD at 5% APR → ~0.96 sbUSD\n\n" +
      "**2. Annual Interest**\n" +
      "- Range: 0.5% – 25% APR\n" +
      "- Accrues on your debt balance\n" +
      "- Lower rate = higher redemption risk\n\n" +
      "**3. Gas Fee**\n" +
      "- Paid in CTC on the Creditcoin network\n" +
      "- Generally very low",
    suggestedActions: ["포지션 열기", "이자율 조정", "Strategy Recommendations"],
  },
  "risk": {
    reply: "**Risk Management Guide:**\n\n" +
      "**1. Liquidation Risk**\n" +
      "- Position is liquidated if HF drops below the minimum\n" +
      "- Target HF: Conservative >2.00, Moderate >1.60, Aggressive >1.30\n\n" +
      "**2. Scenario Analysis:**\n" +
      "- CTC price -20%: HF 2.00 → 1.60 (Moderate level)\n" +
      "- CTC price -40%: HF 2.00 → 1.20 (wCTC liquidation risk!)\n" +
      "- CTC price -50%: HF 2.00 → 1.00 (all branches liquidated)\n\n" +
      "**3. Safety Rules:**\n" +
      "- Always maintain HF at least 50% above the minimum\n" +
      "- Add collateral or repay debt immediately during sharp price drops\n" +
      "- Activate the AI Agent for automated monitoring",
    suggestedActions: ["Check My Position", "에이전트 활성화", "담보 추가"],
  },
  "start": {
    reply: "**Snowball Getting Started Guide:**\n\n" +
      "**Step 1: Connect Wallet**\n" +
      "- Connect your wallet (e.g. Rabby) to Creditcoin Testnet\n" +
      "- Get testnet CTC from the faucet\n\n" +
      "**Step 2: Prepare Collateral**\n" +
      "- Wrap CTC into wCTC, or acquire lstCTC\n\n" +
      "**Step 3: Open a Trove**\n" +
      "- Choose collateral type (wCTC or lstCTC)\n" +
      "- Set collateral amount and sbUSD borrow amount (min 200 sbUSD)\n" +
      "- Set your interest rate (based on your strategy)\n\n" +
      "**Step 4: Manage Position**\n" +
      "- Monitor your Health Factor\n" +
      "- Activate the AI Agent for automated management\n\n" +
      "**Step 5 (Optional): Deposit to SP**\n" +
      "- Deposit sbUSD into the Stability Pool for additional yield",
    suggestedActions: ["Strategy Recommendations", "포지션 열기", "에이전트 활성화"],
  },
  "trove": {
    reply: "**What is a Trove?**\n\n" +
      "A Trove is your individual borrowing position in Snowball.\n\n" +
      "**How it works:**\n" +
      "1. Deposit collateral (wCTC or lstCTC) into your Trove\n" +
      "2. Borrow sbUSD against that collateral\n" +
      "3. The protocol mints sbUSD directly to your wallet\n\n" +
      "**Key parameters:**\n" +
      "- **Collateral**: wCTC or lstCTC\n" +
      "- **Debt**: Amount of sbUSD borrowed (min 200 sbUSD)\n" +
      "- **Health Factor**: Collateral value ÷ Debt — must stay above minimum\n" +
      "- **Interest Rate**: Your annual borrowing cost (0.5%–25%)\n\n" +
      "Each wallet can open one Trove per collateral branch. " +
      "You can adjust collateral, debt, and interest rate at any time.",
    suggestedActions: ["포지션 열기", "What is Liquidation?", "Strategy Recommendations"],
  },
  "recovery mode": {
    reply: "**Recovery Mode** is a system-wide safety mechanism.\n\n" +
      "It activates when the **System Health Factor** (total collateral / total debt) drops below:\n" +
      "- wCTC branch: System HF < 1.50\n" +
      "- lstCTC branch: System HF < 1.60\n\n" +
      "**During Recovery Mode:**\n" +
      "- Liquidations can occur at a lower HF threshold than normal\n" +
      "- Opening new Troves that reduce system HF is restricted\n" +
      "- Users are strongly encouraged to add collateral or repay debt\n\n" +
      "**How to protect yourself:**\n" +
      "- Keep your personal HF well above the minimum (target ≥ 2.00)\n" +
      "- Avoid borrowing at high utilization during volatile markets\n" +
      "- The AI Agent will alert you when system risk is elevated",
    suggestedActions: ["Check My Position", "담보 추가", "에이전트 활성화"],
  },
  "wrap": {
    reply: "**How to Get wCTC (Wrapped CTC):**\n\n" +
      "**Step 1: Get Testnet CTC**\n" +
      "- Visit the Creditcoin testnet faucet\n" +
      "- Request testnet CTC to your wallet\n\n" +
      "**Step 2: Wrap CTC → wCTC**\n" +
      "- Go to the Borrow page in Snowball\n" +
      "- Click 'wCTC로 포지션 열기' (Open with wCTC)\n" +
      "- The UI handles wrapping automatically when you open a Trove\n\n" +
      "**Alternatively:**\n" +
      "- Use the WCTC contract's `deposit()` function directly\n" +
      "- Send CTC to the wCTC contract to receive 1:1 wCTC\n\n" +
      "**Note:** lstCTC represents staked CTC and earns staking rewards automatically.",
    suggestedActions: ["wCTC로 포지션 열기", "lstCTC로 포지션 열기", "What is Liquidation?"],
  },
  "lstctc": {
    reply: "**lstCTC — Liquid Staked CTC:**\n\n" +
      "lstCTC is a liquid staking token that represents staked CTC on the Creditcoin network.\n\n" +
      "**Benefits vs wCTC:**\n" +
      "- Earns **staking rewards** automatically (yield accrues in token value)\n" +
      "- The staking yield offsets your sbUSD borrowing cost\n" +
      "- Effectively lowers your net borrowing rate\n\n" +
      "**Trade-off:**\n" +
      "- Higher minimum Health Factor: **1.20** (vs 1.10 for wCTC)\n" +
      "- Slightly lower capital efficiency\n\n" +
      "**Example:** If lstCTC staking yield is 8% APR and your interest rate is 5% APR, " +
      "your effective borrowing cost is **negative** (you earn net 3%).",
    suggestedActions: ["lstCTC로 포지션 열기", "wCTC로 포지션 열기", "Strategy Recommendations"],
  },
};

export class ChatService {
  private openaiApiKey: string | undefined;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  async processMessage(
    userAddress: string,
    message: string,
    history: ConversationMessage[]
  ): Promise<Omit<ChatResponse, "conversationId">> {
    // Fetch user context
    const userContext = await this.fetchUserContext(userAddress);

    // Check if LLM is available
    if (this.openaiApiKey) {
      return this.processWithLLM(userAddress, message, history, userContext);
    }

    // Fallback: rule-based responses
    return this.processRuleBased(message, userContext);
  }

  private async fetchUserContext(userAddress: string): Promise<any> {
    try {
      const [positionsRes, balanceRes] = await Promise.all([
        fetch(`${CONSUMER_API_URL}/api/user/${userAddress}/positions`),
        fetch(`${CONSUMER_API_URL}/api/user/${userAddress}/balance`),
      ]);

      return {
        positions: positionsRes.ok ? await positionsRes.json() : [],
        balance: balanceRes.ok ? await balanceRes.json() : null,
      };
    } catch {
      return { positions: [], balance: null };
    }
  }

  private async processWithLLM(
    userAddress: string,
    message: string,
    history: ConversationMessage[],
    userContext: any
  ): Promise<Omit<ChatResponse, "conversationId">> {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: this.openaiApiKey });

    const systemPrompt = this.buildSystemPrompt(userContext);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "Sorry, I could not generate a response.";

    return {
      reply,
      suggestedActions: this.inferSuggestedActions(message, userContext),
      relatedData: this.buildRelatedData(userContext),
    };
  }

  private processRuleBased(
    message: string,
    userContext: any
  ): Omit<ChatResponse, "conversationId"> {
    const lowerMsg = message.toLowerCase();

    // Position safety questions
    if (lowerMsg.includes("safe") || lowerMsg.includes("danger") || lowerMsg.includes("risk") ||
        lowerMsg.includes("안전") || lowerMsg.includes("위험")) {
      return this.handleSafetyQuestion(userContext);
    }

    // Position summary
    if (lowerMsg.includes("position") || lowerMsg.includes("summary") || lowerMsg.includes("포지션") || lowerMsg.includes("요약")) {
      return this.handlePositionSummary(userContext);
    }

    // Strategy recommendation
    if (lowerMsg.includes("strategy") || lowerMsg.includes("recommend") || lowerMsg.includes("전략") || lowerMsg.includes("추천")) {
      return {
        reply: "In the current market conditions, we recommend a **Conservative strategy (Health Factor > 2.00)**.\n\n" +
          "- Low liquidation risk with a comfortable safety buffer\n" +
          "- wCTC: ~90% buffer above the min HF of 1.10\n" +
          "- lstCTC: ~80% buffer above the min HF of 1.20\n\n" +
          "For a more aggressive approach, try asking about the 'Aggressive strategy'.",
        suggestedActions: ["Conservative 전략 적용", "Moderate 전략 적용", "포지션 열기"],
      };
    }

    // Recovery mode questions
    if (lowerMsg.includes("recovery") || lowerMsg.includes("system hf") || lowerMsg.includes("recovery mode")) {
      return DEFI_KB["recovery mode"];
    }

    // Trove questions
    if (lowerMsg.includes("trove") || lowerMsg.includes("what is a trove") || lowerMsg.includes("트로브")) {
      return DEFI_KB["trove"];
    }

    // wCTC wrapping / faucet
    if (lowerMsg.includes("wrap") || lowerMsg.includes("faucet") || lowerMsg.includes("get wctc") || lowerMsg.includes("랩")) {
      return DEFI_KB["wrap"];
    }

    // Knowledge base lookup
    for (const [keyword, response] of Object.entries(DEFI_KB)) {
      if (["stability pool", "agent", "fee", "risk", "start", "trove", "recovery mode", "wrap"].includes(keyword)) continue;
      if (lowerMsg.includes(keyword)) {
        return response;
      }
    }

    // SP questions
    if (lowerMsg.includes("sp") || lowerMsg.includes("stability") || lowerMsg.includes("deposit") || lowerMsg.includes("예치")) {
      return DEFI_KB["stability pool"];
    }

    // Agent questions
    if (lowerMsg.includes("agent") || lowerMsg.includes("auto") || lowerMsg.includes("에이전트") || lowerMsg.includes("자동")) {
      return DEFI_KB["agent"];
    }

    // Fee questions
    if (lowerMsg.includes("fee") || lowerMsg.includes("cost") || lowerMsg.includes("수수료") || lowerMsg.includes("upfront")) {
      return DEFI_KB["fee"];
    }

    // Risk questions
    if (lowerMsg.includes("risk") || lowerMsg.includes("crash") || lowerMsg.includes("drop") || lowerMsg.includes("리스크") || lowerMsg.includes("폭락")) {
      return DEFI_KB["risk"];
    }

    // wCTC vs lstCTC comparison
    if ((lowerMsg.includes("wctc") || lowerMsg.includes("lstctc")) &&
        (lowerMsg.includes("which") || lowerMsg.includes("compare") || lowerMsg.includes("better") || lowerMsg.includes("vs") || lowerMsg.includes("비교"))) {
      return {
        reply: "**wCTC vs lstCTC Comparison:**\n\n" +
          "| | wCTC | lstCTC |\n" +
          "|---|---|---|\n" +
          "| Min Health Factor | 1.10 | 1.20 |\n" +
          "| System Health Factor | 1.50 | 1.60 |\n" +
          "| Staking Rewards | ❌ | ✅ |\n" +
          "| Capital Efficiency | Higher | Slightly lower |\n\n" +
          "**wCTC**: Lower min HF means you can borrow more, but no staking yield\n" +
          "**lstCTC**: Staking rewards reduce your effective cost, but requires higher HF",
        suggestedActions: ["wCTC로 포지션 열기", "lstCTC로 포지션 열기"],
      };
    }

    // lstCTC standalone
    if (lowerMsg.includes("lstctc") || lowerMsg.includes("staking") || lowerMsg.includes("liquid staked")) {
      return DEFI_KB["lstctc"];
    }

    // Minimum debt
    if (lowerMsg.includes("minimum") || lowerMsg.includes("min debt") || lowerMsg.includes("200") || lowerMsg.includes("최소")) {
      return {
        reply: "**Minimum Requirements for Opening a Trove:**\n\n" +
          "- **Minimum debt**: 200 sbUSD\n" +
          "- **Minimum Health Factor**: 1.10 (wCTC) or 1.20 (lstCTC)\n" +
          "- A small gas fee in CTC is required for each transaction\n\n" +
          "The 200 sbUSD minimum exists to ensure positions are economically viable " +
          "and to prevent spam attacks on the protocol.",
        suggestedActions: ["포지션 열기", "Strategy Recommendations"],
      };
    }

    // Beginner questions
    if (lowerMsg.includes("start") || lowerMsg.includes("how") || lowerMsg.includes("begin") || lowerMsg.includes("시작") || lowerMsg.includes("처음")) {
      return DEFI_KB["start"];
    }

    // Default
    return {
      reply: "Hi! I'm the Snowball Assistant. Here are some things you can ask me:\n\n" +
        "- Is my position safe?\n" +
        "- What is liquidation?\n" +
        "- What is the Stability Pool?\n" +
        "- How much are the fees?\n" +
        "- What does the AI Agent do?\n" +
        "- How do I manage risk?\n" +
        "- How do I get started?",
      suggestedActions: ["Position Summary", "Strategy Recommendations", "SP 예치하기", "포지션 열기"],
    };
  }

  private handleSafetyQuestion(userContext: any): Omit<ChatResponse, "conversationId"> {
    const positions = userContext.positions || [];

    if (positions.length === 0) {
      return {
        reply: "You have no open positions. Would you like to open one?",
        suggestedActions: ["포지션 열기", "Strategy Recommendations"],
      };
    }

    let reply = "**Position Safety Analysis:**\n\n";
    let overallStatus: "safe" | "warning" | "danger" = "safe";

    for (const pos of positions) {
      const cr = parseFloat(pos.cr);
      const hf = (cr / 100).toFixed(2);
      let status: string;
      let emoji: string;

      if (cr >= STRATEGIES.conservative.minCR) {
        status = "Healthy";
        emoji = "🟢";
      } else if (cr >= STRATEGIES.moderate.minCR) {
        status = "At Risk";
        emoji = "🟡";
        if (overallStatus === "safe") overallStatus = "warning";
      } else {
        status = "Danger";
        emoji = "🔴";
        overallStatus = "danger";
      }

      const mcr = pos.branch === 0 ? 1.10 : 1.20;
      reply += `${emoji} **${pos.collateralSymbol} Trove #${pos.troveId}**\n`;
      reply += `  Health Factor: ${hf} (Min: ${mcr.toFixed(2)})\n`;
      reply += `  Liquidation Price: $${parseFloat(pos.liquidationPrice).toFixed(4)}\n`;
      reply += `  Status: ${status}\n\n`;
    }

    return {
      reply,
      suggestedActions: overallStatus === "danger"
        ? ["담보 추가", "부채 상환", "에이전트 활성화"]
        : ["포지션 상세", "Strategy Recommendations"],
      relatedData: {
        healthStatus: overallStatus,
        currentCR: positions[0]?.cr,
        liquidationPrice: positions[0]?.liquidationPrice,
      },
    };
  }

  private handlePositionSummary(userContext: any): Omit<ChatResponse, "conversationId"> {
    const positions = userContext.positions || [];
    const balance = userContext.balance;

    if (positions.length === 0) {
      let reply = "You have no open positions.";
      if (balance) {
        reply += `\n\n**Wallet Balance:**\n`;
        reply += `- wCTC: ${(Number(balance.wCTC) / 1e18).toFixed(2)}\n`;
        reply += `- lstCTC: ${(Number(balance.lstCTC) / 1e18).toFixed(2)}\n`;
        reply += `- sbUSD: ${(Number(balance.sbUSD) / 1e18).toFixed(2)}`;
      }
      return {
        reply,
        suggestedActions: ["포지션 열기", "Strategy Recommendations"],
      };
    }

    let reply = "**Position Summary:**\n\n";
    for (const pos of positions) {
      const hf = (parseFloat(pos.cr) / 100).toFixed(2);
      reply += `**${pos.collateralSymbol} Trove #${pos.troveId}**\n`;
      reply += `- Collateral: ${(Number(pos.collateral) / 1e18).toFixed(2)} ${pos.collateralSymbol} ($${pos.collateralUSD})\n`;
      reply += `- Debt: ${(Number(pos.debt) / 1e18).toFixed(2)} sbUSD\n`;
      reply += `- Health Factor: ${hf}\n`;
      reply += `- Interest Rate: ${pos.interestRate}% APR\n`;
      reply += `- Liquidation Price: $${parseFloat(pos.liquidationPrice).toFixed(4)}\n\n`;
    }

    return {
      reply,
      suggestedActions: ["포지션 조정", "담보 추가", "Strategy Recommendations"],
      relatedData: {
        currentCR: positions[0]?.cr,
        liquidationPrice: positions[0]?.liquidationPrice,
        healthStatus: parseFloat(positions[0]?.cr) >= STRATEGIES.conservative.minCR ? "safe" :
          parseFloat(positions[0]?.cr) >= STRATEGIES.moderate.minCR ? "warning" : "danger",
      },
    };
  }

  private buildSystemPrompt(userContext: any): string {
    return `You are Snowball Assistant, a DeFi advisor for the Snowball protocol on Creditcoin Network.

Snowball is a Liquity V2 fork that lets users deposit CTC (wrapped as wCTC or lstCTC) as collateral to borrow sbUSD stablecoin.

Key facts:
- wCTC branch: Min Health Factor 1.10, System HF 1.50 (triggers Recovery Mode)
- lstCTC branch: Min Health Factor 1.20, System HF 1.60, includes staking yield
- Health Factor = Collateral Value / Debt (HF < min = liquidated)
- Interest rates: 0.5% to 25% APR
- 7-day upfront fee on new positions: upfrontFee = debt × annualRate × 7/365
- Stability Pool: deposit sbUSD to earn liquidation gains (typically 10-15% profit)
- Lower interest rate = higher redemption risk
- Min debt: 200 sbUSD

SP APY = avgInterestRate × totalBorrow / spDeposits

AI Agent features:
- 30-second interval position monitoring
- Automatic HF checks with DANGER/WARNING/OK levels
- Strategy-based management (Conservative HF>2.00, Moderate HF>1.60, Aggressive HF>1.30)
- Auto-rebalance capability when HF drops near danger zone

Risk scenarios:
- CTC price -20%: HF 2.00 → 1.60
- CTC price -40%: HF 2.00 → 1.20 (wCTC liquidation risk!)
- CTC price -50%: HF 2.00 → 1.00 (all branches liquidated)

User context:
${JSON.stringify(userContext, null, 2)}

Instructions:
- Always respond in English
- Be concise but helpful
- Use Health Factor (not CR%) in explanations
- If the user asks about their position, reference their actual data
- Always mention relevant risks
- Suggest specific actions when appropriate`;
  }

  private inferSuggestedActions(message: string, userContext: any): string[] {
    const positions = userContext.positions || [];
    if (positions.length === 0) {
      return ["포지션 열기", "Strategy Recommendations"];
    }
    return ["Position Summary", "포지션 조정"];
  }

  private buildRelatedData(userContext: any): ChatResponse["relatedData"] | undefined {
    const positions = userContext.positions || [];
    if (positions.length === 0) return undefined;

    const cr = parseFloat(positions[0].cr);
    return {
      currentCR: positions[0].cr,
      liquidationPrice: positions[0].liquidationPrice,
      healthStatus: cr >= STRATEGIES.conservative.minCR ? "safe" : cr >= STRATEGIES.moderate.minCR ? "warning" : "danger",
    };
  }
}
