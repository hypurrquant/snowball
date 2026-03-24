"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import {
  TrendingUp,
  Shield,
  Search,
  Wallet,
  Send,
  Loader2,
  Terminal,
  Sparkles,
} from "lucide-react";
import { useChainAddresses } from "@/shared/hooks/useChainAddresses";
import { useUnifiedSupplyMarkets } from "@/domains/defi/unified/hooks/useUnifiedSupplyMarkets";
import type { UnifiedSupplyMarket } from "@/domains/defi/unified/types";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const QUICK_COMMANDS = [
  {
    label: "Yield Scan",
    icon: TrendingUp,
    command: "yield scan --asset USDC",
    description: "Best yields across all chains",
  },
  {
    label: "Exploit Scan",
    icon: Shield,
    command: "scan --all-chains --once",
    description: "Check exploits across chains",
  },
  {
    label: "My Positions",
    icon: Wallet,
    command: "positions --address {wallet}",
    description: "View all your DeFi positions",
  },
  {
    label: "Track Whales",
    icon: Search,
    command: "whales --chain ethereum --token WETH --top 5",
    description: "See what whales are doing",
  },
  {
    label: "AI Recommend",
    icon: Sparkles,
    command: "__recommend__",
    description: "Personalized strategy for your portfolio",
  },
];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: Array<{ label: string; href: string }>;
}

interface TokenBalance {
  symbol: string;
  amount: number;
  priceUsd: number;
  valueUsd: number;
}

function generateRecommendation(
  balances: TokenBalance[],
  markets: UnifiedSupplyMarket[]
): { text: string; actions: Array<{ label: string; href: string }> } {
  const nonZero = balances.filter((b) => b.amount > 0);

  // Portfolio summary
  const totalValueUsd = nonZero.reduce((sum, b) => sum + b.valueUsd, 0);

  const portfolioLines = nonZero.length > 0
    ? nonZero.map((b) => `  ${b.symbol}: ${b.amount.toFixed(2)} ($${b.valueUsd.toFixed(0)})`).join("\n")
    : "  (no token balances found — connect wallet or get testnet tokens)";

  // Find best APY per symbol from markets
  const bestApyBySymbol: Record<string, { apy: number; protocol: string }> = {};
  for (const m of markets) {
    const sym = m.assetSymbol;
    const existing = bestApyBySymbol[sym];
    if (!existing || m.supplyAPY > existing.apy) {
      bestApyBySymbol[sym] = { apy: m.supplyAPY, protocol: m.protocol };
    }
  }

  const actions: Array<{ label: string; href: string }> = [];
  const recommendLines: string[] = [];
  let step = 1;
  let estimatedYearlyUsd = 0;

  const wCTC = balances.find((b) => b.symbol === "wCTC");
  const sbUSD = balances.find((b) => b.symbol === "sbUSD");
  const lstCTC = balances.find((b) => b.symbol === "lstCTC");
  const usdc = balances.find((b) => b.symbol === "USDC");

  // Recommend supply wCTC to Morpho if they have it
  if (wCTC && wCTC.amount > 0) {
    const supplyAmt = wCTC.amount * 0.5;
    const bestMarket = bestApyBySymbol["sbUSD"] ?? bestApyBySymbol["wCTC"];
    const apy = bestMarket ? bestMarket.apy : 7.2;
    const yearlyUsd = supplyAmt * wCTC.priceUsd * (apy / 100);
    estimatedYearlyUsd += yearlyUsd;
    recommendLines.push(
      `${step}. Supply ${supplyAmt.toFixed(0)} wCTC to Morpho → ${apy.toFixed(1)}% APY ($${yearlyUsd.toFixed(0)}/yr)`
    );
    step++;
    actions.push({ label: "Supply to Morpho →", href: "/lend" });
  }

  // Recommend opening CDP if they have wCTC
  if (wCTC && wCTC.amount > 50) {
    const collAmt = wCTC.amount * 0.4;
    const mintable = collAmt * wCTC.priceUsd * 0.5;
    recommendLines.push(
      `${step}. Open CDP with ${collAmt.toFixed(0)} wCTC → mint ~${mintable.toFixed(0)} sbUSD`
    );
    step++;
    actions.push({ label: "Open CDP →", href: "/borrow" });
  }

  // Recommend LP sbUSD/USDC
  if ((sbUSD && sbUSD.amount > 0) || (usdc && usdc?.amount > 0)) {
    recommendLines.push(
      `${step}. LP sbUSD/USDC → emission rewards + swap fees`
    );
    step++;
    actions.push({ label: "Add Liquidity →", href: "/pool" });
  }

  // Recommend staking LP
  if (sbUSD && sbUSD.amount > 0) {
    const lpApy = 172;
    const lpValueUsd = (sbUSD.amount * sbUSD.priceUsd) * 0.5;
    const yearlyUsd = lpValueUsd * (lpApy / 100);
    estimatedYearlyUsd += yearlyUsd;
    recommendLines.push(
      `${step}. Stake LP → ${lpApy}% APY on sbUSD/USDC pool ($${yearlyUsd.toFixed(0)}/yr)`
    );
    step++;
    actions.push({ label: "Stake LP →", href: "/earn" });
  }

  // Recommend staking lstCTC for yield
  if (lstCTC && lstCTC.amount > 0) {
    const bestLst = bestApyBySymbol["lstCTC"];
    const apy = bestLst ? bestLst.apy : 5.5;
    const yearlyUsd = lstCTC.amount * lstCTC.priceUsd * (apy / 100);
    estimatedYearlyUsd += yearlyUsd;
    recommendLines.push(
      `${step}. Supply ${lstCTC.amount.toFixed(0)} lstCTC → ${apy.toFixed(1)}% APY ($${yearlyUsd.toFixed(0)}/yr)`
    );
    step++;
    actions.push({ label: "Supply lstCTC →", href: "/lend" });
  }

  if (recommendLines.length === 0) {
    recommendLines.push("1. Get testnet tokens to start earning yield");
    actions.push({ label: "Get Tokens →", href: "/swap" });
  }

  const yieldPct = totalValueUsd > 0
    ? ((estimatedYearlyUsd / totalValueUsd) * 100).toFixed(0)
    : "0";

  const text = [
    "📊 Your Portfolio Analysis:",
    portfolioLines,
    "",
    "💡 Recommended Actions:",
    ...recommendLines,
    "",
    `📈 Estimated Total Yield: ~$${estimatedYearlyUsd.toFixed(0)}/yr (${yieldPct}% on $${totalValueUsd.toFixed(0)})`,
  ].join("\n");

  return { text, actions };
}

export default function ChatPage() {
  const { address } = useAccount();
  const chainConfig = useChainAddresses();
  const { markets, isLoading: marketsLoading } = useUnifiedSupplyMarkets();

  const tokenAddresses = chainConfig.tokens;

  const { data: balanceData } = useReadContracts({
    contracts: address
      ? [
          { address: tokenAddresses.wCTC as Address, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: tokenAddresses.lstCTC as Address, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: tokenAddresses.sbUSD as Address, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: tokenAddresses.USDC as Address, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
        ]
      : [],
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      content: "DeFi CLI integrated. Choose a command or type your own.",
      timestamp: new Date(),
    },
  ]);
  const [customCommand, setCustomCommand] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getTokenBalances = (): TokenBalance[] => {
    const tokenList = [
      { symbol: "wCTC", priceUsd: 5.0, decimals: 18 },
      { symbol: "lstCTC", priceUsd: 5.2, decimals: 18 },
      { symbol: "sbUSD", priceUsd: 1.0, decimals: 18 },
      { symbol: "USDC", priceUsd: 1.0, decimals: 18 },
    ];

    return tokenList.map((token, i) => {
      const raw = balanceData?.[i]?.result as bigint | undefined;
      const amount = raw ? parseFloat(formatUnits(raw, token.decimals)) : 0;
      return {
        symbol: token.symbol,
        amount,
        priceUsd: token.priceUsd,
        valueUsd: amount * token.priceUsd,
      };
    });
  };

  const runRecommendation = () => {
    if (marketsLoading) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "$ defi recommend --personalized", timestamp: new Date() },
        {
          role: "assistant",
          content: "Loading market data, please try again in a moment...",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const balances = getTokenBalances();
    const { text, actions } = generateRecommendation(balances, markets);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "$ defi recommend --personalized", timestamp: new Date() },
      {
        role: "assistant",
        content: text,
        timestamp: new Date(),
        actions,
      },
    ]);
  };

  const executeCommand = async (command: string) => {
    if (command === "__recommend__") {
      runRecommendation();
      return;
    }

    const resolved = command.replace("{wallet}", address ?? "0x...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `$ defi ${resolved}`, timestamp: new Date() },
      {
        role: "assistant",
        content: "Executing...",
        timestamp: new Date(),
        isLoading: true,
      },
    ]);
    setIsExecuting(true);

    try {
      const res = await fetch("/api/defi-cli/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: resolved }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: data.output || data.error || "No output",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Error: Could not reach server",
          timestamp: new Date(),
        },
      ]);
    }

    setIsExecuting(false);
  };

  const handleSend = () => {
    const trimmed = customCommand.trim();
    if (!trimmed || isExecuting) return;
    executeCommand(trimmed);
    setCustomCommand("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Terminal className="w-6 h-6 text-ice-400" />
        <h1 className="text-2xl font-bold">DeFi Terminal</h1>
        <span className="text-xs text-text-tertiary">
          powered by defi-cli · 40 chains · 344 protocols
        </span>
      </div>

      {/* Quick Commands */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 shrink-0">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => executeCommand(cmd.command)}
            disabled={isExecuting}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-bg-card/60 border border-border hover:border-ice-400/30 transition-all text-center disabled:opacity-50"
          >
            <cmd.icon className="w-5 h-5 text-ice-400" />
            <span className="text-xs font-medium text-white">{cmd.label}</span>
            <span className="text-[10px] text-text-tertiary">
              {cmd.description}
            </span>
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 rounded-xl bg-bg-card/30 border border-border/40 p-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "system" ? (
              <div className="text-center text-xs text-text-tertiary py-1">
                {msg.content}
              </div>
            ) : msg.role === "user" ? (
              <div className="font-mono text-sm text-ice-400">{msg.content}</div>
            ) : msg.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-ice-400" />
                Executing...
              </div>
            ) : (
              <div>
                <pre className="font-mono text-xs whitespace-pre-wrap overflow-x-auto text-text-secondary">
                  {msg.content}
                </pre>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.actions.map((action, j) => (
                      <a
                        key={j}
                        href={action.href}
                        className="px-3 py-1.5 rounded-lg bg-ice-400/10 border border-ice-400/30 text-ice-400 text-xs font-medium hover:bg-ice-400/20 transition-colors"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Custom Command Input */}
      <div className="flex gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card/60 border border-border focus-within:border-ice-400/40 transition-colors">
          <span className="text-text-tertiary text-sm font-mono">$</span>
          <span className="text-ice-400 text-sm font-mono">defi</span>
          <input
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="yield scan --asset USDC"
            className="flex-1 bg-transparent text-sm font-mono text-white placeholder:text-text-tertiary outline-none"
            disabled={isExecuting}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isExecuting || !customCommand.trim()}
          className="px-4 py-2 rounded-xl bg-ice-400 text-white font-medium text-sm hover:bg-ice-500 disabled:opacity-50 transition-colors flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
