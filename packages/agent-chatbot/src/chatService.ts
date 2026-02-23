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
  "청산": {
    reply: "**청산(Liquidation)**이란 담보 비율이 최소 담보 비율 아래로 떨어졌을 때, " +
      "프로토콜이 자동으로 포지션을 닫는 것입니다.\n\n" +
      "- **wCTC 브랜치**: 최소 담보 비율 = 110%, 위기 담보 비율 = 150%\n" +
      "- **lstCTC 브랜치**: 최소 담보 비율 = 120%, 위기 담보 비율 = 160%\n\n" +
      "청산 시 담보는 Stability Pool 예치자들에게 분배됩니다. " +
      "청산을 피하려면 담보 비율을 최소 담보 비율보다 충분히 높게 유지하세요.",
    suggestedActions: ["내 포지션 확인", "담보 비율 조정하기"],
  },
  "이자율": {
    reply: "**이자율(Interest Rate)**은 sbUSD를 빌릴 때 연간 지불하는 비용입니다.\n\n" +
      "- 범위: 0.5% ~ 25% APR\n" +
      "- **낮은 이자율**: 저비용이지만 상환(redemption) 시 우선 타겟이 됩니다\n" +
      "- **높은 이자율**: 고비용이지만 상환 위험이 낮습니다\n\n" +
      "Trove 생성 시 7일치 선불 수수료(upfront fee)가 발생합니다.\n" +
      "공식: upfront fee = debt × annualRate × 7/365",
    suggestedActions: ["전략 추천 받기", "이자율 변경하기"],
  },
  "상환": {
    reply: "**상환(Redemption)**은 sbUSD 보유자가 sbUSD를 담보로 교환하는 것입니다.\n\n" +
      "이자율이 낮은 Trove부터 우선 상환 대상이 됩니다. " +
      "상환되면 Trove의 부채가 줄고 담보도 줄어듭니다.\n\n" +
      "상환을 피하려면 이자율을 다른 사용자보다 높게 설정하세요.",
    suggestedActions: ["이자율 조정", "포지션 요약"],
  },
  "담보비율": {
    reply: "**담보 비율(Collateral Ratio)**은 담보 가치 대비 부채의 비율입니다.\n\n" +
      "공식: 담보 비율 = (담보 × 가격) / 부채 × 100%\n\n" +
      "- 200% 이상: 안전 (Conservative)\n" +
      "- 150~200%: 보통 (Moderate)\n" +
      "- 150% 미만: 위험 — 청산 가능성\n\n" +
      "최소 담보 비율 이하로 떨어지면 즉시 청산됩니다.",
    suggestedActions: ["내 담보 비율 확인", "담보 추가"],
  },
  "sbUSD": {
    reply: "**sbUSD**는 Snowball 프로토콜의 스테이블코인입니다.\n\n" +
      "- CTC 담보를 예치하고 sbUSD를 빌릴 수 있습니다\n" +
      "- 1 sbUSD ≈ 1 USD 가치를 목표로 합니다\n" +
      "- Stability Pool에 예치하면 청산 보상(담보)을 얻을 수 있습니다\n" +
      "- 상환 메커니즘으로 가격 안정성을 유지합니다",
    suggestedActions: ["sbUSD 빌리기", "Stability Pool 예치"],
  },
  "stability pool": {
    reply: "**Stability Pool (SP)**은 프로토콜의 청산 방어 장치입니다.\n\n" +
      "**예치 방법:**\n" +
      "1. sbUSD를 획득합니다 (Trove에서 빌리기 등)\n" +
      "2. Stability Pool에 sbUSD를 예치합니다\n" +
      "3. 청산이 발생하면 자동으로 참여합니다\n\n" +
      "**이점:**\n" +
      "- 청산 시 담보를 할인된 가격에 획득 (보통 10~15% 이익)\n" +
      "- 프로토콜 안정성 기여에 대한 보상\n" +
      "- 패시브 인컴 가능\n\n" +
      "**주의:** 청산이 많이 발생하면 sbUSD 예치금이 줄고 담보로 전환됩니다.",
    suggestedActions: ["SP 예치하기", "SP 잔액 확인", "내 포지션 확인"],
  },
  "에이전트": {
    reply: "**AI 에이전트**는 Snowball의 자동화된 포지션 관리 도우미입니다.\n\n" +
      "**주요 기능:**\n" +
      "- 포지션 자동 모니터링 (30초 간격 CR 체크)\n" +
      "- 위험 감지 시 자동 리밸런싱 (담보 추가/부채 상환)\n" +
      "- 전략 기반 추천 (Conservative/Moderate/Aggressive)\n" +
      "- 청산 가격 알림\n\n" +
      "**왜 써야 하나요?**\n" +
      "- 24/7 모니터링으로 급격한 가격 변동에 빠르게 대응\n" +
      "- 감정적 결정을 배제하고 전략에 따라 행동\n" +
      "- 수동 관리에 비해 시간 절약",
    suggestedActions: ["에이전트 활성화", "전략 추천 받기", "에이전트 목록"],
  },
  "수수료": {
    reply: "**Snowball 수수료 안내:**\n\n" +
      "**1. Upfront Fee (선불 수수료)**\n" +
      "- Trove 생성 시 1회 부과\n" +
      "- 공식: `upfrontFee = debt × annualRate × 7/365`\n" +
      "- 예) 1000 sbUSD, 5% APR → 약 0.96 sbUSD\n\n" +
      "**2. 연간 이자 (Interest)**\n" +
      "- 범위: 0.5% ~ 25% APR\n" +
      "- 부채에 대해 연간 누적\n" +
      "- 이자율이 낮을수록 상환(redemption) 위험 높음\n\n" +
      "**3. 가스비 (Gas Fee)**\n" +
      "- Creditcoin 네트워크 트랜잭션 비용\n" +
      "- CTC로 지불 (보통 매우 저렴)",
    suggestedActions: ["포지션 열기", "이자율 조정", "전략 추천"],
  },
  "리스크": {
    reply: "**리스크 관리 가이드:**\n\n" +
      "**1. 청산 리스크**\n" +
      "- 담보 비율이 최소 담보 비율 이하로 떨어지면 포지션 청산\n" +
      "- 목표 담보 비율: Conservative >200%, Moderate >160%, Aggressive >130%\n\n" +
      "**2. 시나리오별 대응:**\n" +
      "- CTC 가격 -20%: 담보 비율 200% → 160% (Moderate 수준)\n" +
      "- CTC 가격 -40%: 담보 비율 200% → 120% (wCTC는 청산 위험!)\n" +
      "- CTC 가격 -50%: 담보 비율 200% → 100% (모든 브랜치 청산)\n\n" +
      "**3. 안전 수칙:**\n" +
      "- 항상 최소 담보 비율 + 50% 이상 여유를 유지하세요\n" +
      "- 가격 급락 시 즉시 담보 추가 또는 부채 상환\n" +
      "- AI 에이전트로 자동 모니터링 활성화 권장",
    suggestedActions: ["내 포지션 안전도 확인", "에이전트 활성화", "담보 추가"],
  },
  "시작": {
    reply: "**Snowball 시작 가이드:**\n\n" +
      "**Step 1: 지갑 연결**\n" +
      "- MetaMask 등의 지갑을 Creditcoin Testnet에 연결하세요\n" +
      "- 테스트넷 CTC를 받으세요 (Faucet)\n\n" +
      "**Step 2: 담보 준비**\n" +
      "- CTC를 wCTC로 래핑하거나 lstCTC를 획득하세요\n\n" +
      "**Step 3: Trove 열기**\n" +
      "- 담보 종류 선택 (wCTC 또는 lstCTC)\n" +
      "- 담보량과 빌릴 sbUSD 양을 결정\n" +
      "- 이자율 설정 (전략에 따라 0.5%~25%)\n\n" +
      "**Step 4: 포지션 관리**\n" +
      "- 담보 비율(CR) 모니터링\n" +
      "- AI 에이전트 활성화로 자동 관리\n\n" +
      "**Step 5 (선택): SP 예치**\n" +
      "- sbUSD를 Stability Pool에 예치하여 추가 수익",
    suggestedActions: ["전략 추천 받기", "포지션 열기", "에이전트 활성화"],
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

    const reply = completion.choices[0]?.message?.content || "죄송합니다. 응답을 생성할 수 없습니다.";

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

    // Check for position safety questions
    if (lowerMsg.includes("안전") || lowerMsg.includes("위험") || lowerMsg.includes("safe")) {
      return this.handleSafetyQuestion(userContext);
    }

    // Check for position summary
    if (lowerMsg.includes("포지션") || lowerMsg.includes("요약") || lowerMsg.includes("position")) {
      return this.handlePositionSummary(userContext);
    }

    // Check for strategy recommendation
    if (lowerMsg.includes("전략") || lowerMsg.includes("추천") || lowerMsg.includes("strategy")) {
      return {
        reply: "현재 시장 상황에서는 **Conservative 전략 (담보 비율 > 200%)**을 권장합니다.\n\n" +
          "- 청산 위험이 낮고 안정적입니다\n" +
          "- wCTC: 최소 담보 비율 110% 대비 약 90% 여유\n" +
          "- lstCTC: 최소 담보 비율 120% 대비 약 80% 여유\n\n" +
          "더 공격적인 전략을 원하시면 'aggressive 전략 알려줘'라고 말씀하세요.",
        suggestedActions: ["Conservative 전략 적용", "Moderate 전략 적용", "포지션 열기"],
      };
    }

    // Check knowledge base (exact keyword match for original KB entries)
    for (const [keyword, response] of Object.entries(DEFI_KB)) {
      if (keyword === "stability pool" || keyword === "에이전트" || keyword === "수수료" || keyword === "리스크" || keyword === "시작") continue;
      if (lowerMsg.includes(keyword)) {
        return response;
      }
    }

    // SP questions
    if (lowerMsg.includes("sp") || lowerMsg.includes("stability") || lowerMsg.includes("안정화") || lowerMsg.includes("예치")) {
      return DEFI_KB["stability pool"];
    }

    // Agent questions
    if (lowerMsg.includes("에이전트") || lowerMsg.includes("agent") || lowerMsg.includes("자동")) {
      return DEFI_KB["에이전트"];
    }

    // Fee questions
    if (lowerMsg.includes("수수료") || lowerMsg.includes("fee") || lowerMsg.includes("비용") || lowerMsg.includes("upfront")) {
      return DEFI_KB["수수료"];
    }

    // Risk questions
    if (lowerMsg.includes("리스크") || lowerMsg.includes("risk") || lowerMsg.includes("폭락") || lowerMsg.includes("하락")) {
      return DEFI_KB["리스크"];
    }

    // wCTC vs lstCTC comparison
    if ((lowerMsg.includes("wctc") || lowerMsg.includes("lstctc")) &&
        (lowerMsg.includes("어디") || lowerMsg.includes("비교") || lowerMsg.includes("나아"))) {
      return {
        reply: "**wCTC vs lstCTC 비교:**\n\n" +
          "| | wCTC | lstCTC |\n" +
          "|---|---|---|\n" +
          "| 최소 담보 비율 | 110% | 120% |\n" +
          "| 위기 담보 비율 | 150% | 160% |\n" +
          "| 스테이킹 보상 | ❌ | ✅ |\n" +
          "| 자본 효율성 | 더 높음 | 약간 낮음 |\n\n" +
          "**wCTC**: 최소 담보 비율이 낮아 더 많이 빌릴 수 있지만, 스테이킹 수익 없음\n" +
          "**lstCTC**: 스테이킹 보상으로 실질 비용 감소, 하지만 최소 담보 비율이 높음",
        suggestedActions: ["wCTC로 포지션 열기", "lstCTC로 포지션 열기"],
      };
    }

    // Beginner questions (catch-all, only if nothing else matched)
    if (lowerMsg.includes("시작") || lowerMsg.includes("처음") || lowerMsg.includes("초보") || lowerMsg.includes("어떻게")) {
      return DEFI_KB["시작"];
    }

    // Default response
    return {
      reply: "안녕하세요! Snowball 어시스턴트입니다. 다음과 같은 질문을 해보세요:\n\n" +
        "- 내 포지션 안전한가요?\n" +
        "- 청산이 뭐예요?\n" +
        "- Stability Pool이 뭐예요?\n" +
        "- 수수료가 얼마예요?\n" +
        "- AI 에이전트가 뭐예요?\n" +
        "- 리스크 관리 방법은?\n" +
        "- 처음 시작하려면 어떻게 해요?",
      suggestedActions: ["내 포지션 요약", "전략 추천", "SP가 뭐예요?", "처음 시작하기"],
    };
  }

  private handleSafetyQuestion(userContext: any): Omit<ChatResponse, "conversationId"> {
    const positions = userContext.positions || [];

    if (positions.length === 0) {
      return {
        reply: "현재 열린 포지션이 없습니다. 새로운 포지션을 열어보시겠어요?",
        suggestedActions: ["포지션 열기", "전략 추천"],
      };
    }

    let reply = "**포지션 안전도 분석:**\n\n";
    let overallStatus: "safe" | "warning" | "danger" = "safe";

    for (const pos of positions) {
      const cr = parseFloat(pos.cr);
      const mcr = pos.branch === 0 ? 110 : 120;
      let status: string;
      let emoji: string;

      if (cr >= STRATEGIES.conservative.minCR) {
        status = "안전";
        emoji = "🟢";
      } else if (cr >= STRATEGIES.moderate.minCR) {
        status = "주의";
        emoji = "🟡";
        if (overallStatus === "safe") overallStatus = "warning";
      } else {
        status = "위험";
        emoji = "🔴";
        overallStatus = "danger";
      }

      reply += `${emoji} **${pos.collateralSymbol} Trove #${pos.troveId}**\n`;
      reply += `  담보 비율: ${pos.cr}% (최소: ${mcr}%)\n`;
      reply += `  청산가: $${parseFloat(pos.liquidationPrice).toFixed(4)}\n`;
      reply += `  상태: ${status}\n\n`;
    }

    return {
      reply,
      suggestedActions: overallStatus === "danger"
        ? ["담보 추가", "부채 상환", "에이전트 활성화"]
        : ["포지션 상세", "전략 변경"],
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
      let reply = "현재 열린 포지션이 없습니다.";
      if (balance) {
        reply += `\n\n**잔액:**\n`;
        reply += `- wCTC: ${(Number(balance.wCTC) / 1e18).toFixed(2)}\n`;
        reply += `- lstCTC: ${(Number(balance.lstCTC) / 1e18).toFixed(2)}\n`;
        reply += `- sbUSD: ${(Number(balance.sbUSD) / 1e18).toFixed(2)}`;
      }
      return {
        reply,
        suggestedActions: ["포지션 열기", "전략 추천"],
      };
    }

    let reply = "**포지션 요약:**\n\n";
    for (const pos of positions) {
      reply += `**${pos.collateralSymbol} Trove #${pos.troveId}**\n`;
      reply += `- 담보: ${(Number(pos.collateral) / 1e18).toFixed(2)} ${pos.collateralSymbol} ($${pos.collateralUSD})\n`;
      reply += `- 부채: ${(Number(pos.debt) / 1e18).toFixed(2)} sbUSD\n`;
      reply += `- 담보 비율: ${pos.cr}%\n`;
      reply += `- 이자율: ${pos.interestRate}% APR\n`;
      reply += `- 청산가: $${parseFloat(pos.liquidationPrice).toFixed(4)}\n\n`;
    }

    return {
      reply,
      suggestedActions: ["포지션 조정", "담보 추가", "전략 변경"],
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
- wCTC branch: Minimum Collateral Ratio 110%, Critical Collateral Ratio 150%
- lstCTC branch: Minimum Collateral Ratio 120%, Critical Collateral Ratio 160%, includes staking yield
- Interest rates: 0.5% to 25% APR
- 7-day upfront fee on new positions: upfrontFee = debt × annualRate × 7/365
- Stability Pool provides liquidation protection — deposit sbUSD to earn liquidation gains (typically 10-15% profit)
- Lower interest rate = higher redemption risk
- Min debt: 200 sbUSD, gas compensation: 200 sbUSD

Stability Pool (SP):
- Users deposit sbUSD into the SP
- When liquidations occur, SP depositors receive the liquidated collateral at a discount
- SP depositors may also earn additional rewards
- Deposited sbUSD decreases as it absorbs liquidated debt, but the collateral received is worth more

AI Agent features:
- 30-second interval position monitoring
- Automatic CR checks with DANGER/WARNING/OK levels
- Strategy-based management (Conservative >200%, Moderate >160%, Aggressive >130%)
- Auto-rebalance capability when CR drops near danger zone

Fee structure:
- Upfront fee: debt × annualRate × 7/365 (one-time at Trove creation)
- Annual interest: 0.5% to 25% APR (accrues on debt)
- Gas fees: paid in CTC on Creditcoin network (very low)

Risk management:
- If CTC drops 20%: CR 200% → 160%
- If CTC drops 40%: CR 200% → 120% (wCTC liquidation risk!)
- If CTC drops 50%: CR 200% → 100% (all branches liquidated)
- Always maintain Minimum Collateral Ratio + 50% buffer recommended

User context:
${JSON.stringify(userContext, null, 2)}

Instructions:
- Answer in the same language as the user (Korean or English)
- Be concise but helpful
- If the user asks about their position, reference their actual data
- Always mention relevant risks
- Suggest specific actions when appropriate`;
  }

  private inferSuggestedActions(message: string, userContext: any): string[] {
    const positions = userContext.positions || [];
    if (positions.length === 0) {
      return ["포지션 열기", "전략 추천"];
    }
    return ["포지션 요약 보기", "CR 조정하기"];
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
