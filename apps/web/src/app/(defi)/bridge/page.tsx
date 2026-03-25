"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, parseEther, parseUnits, formatEther, type Address } from "viem";
import { toast } from "sonner";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { TOKENS, TOKEN_INFO } from "@/core/config/addresses";
import { CCTP_CHAINS, getCCTPChain } from "@/core/config/cctp";
import { useCCTPBridge } from "@/shared/hooks/useCCTPBridge";
import { formatTokenAmount } from "@/shared/lib/utils";

// ─── Chain / Token Definitions ───────────────────────────────────────────────

const BRIDGE_CHAINS = [
  { id: 102031, name: "CC Testnet",    symbol: "CTC"  },
  { id: 91342,  name: "GIWA Sepolia",  symbol: "ETH"  },
  { id: 999,    name: "HyperEVM",      symbol: "HYPE" },
  { id: 10143,  name: "Monad Testnet", symbol: "MON"  },
] as const;

type BridgeChainId = (typeof BRIDGE_CHAINS)[number]["id"];

const TOKEN_SYMBOLS = ["wCTC", "lstCTC", "sbUSD", "USDC"] as const;
type TokenSymbol = (typeof TOKEN_SYMBOLS)[number];

// Token addresses per chain — CC Testnet uses deployed addresses; others use same for bridge UI (mock)
const CHAIN_TOKEN_ADDRESSES: Record<BridgeChainId, Record<TokenSymbol, Address>> = {
  102031: {
    wCTC:   TOKENS.wCTC,
    lstCTC: TOKENS.lstCTC,
    sbUSD:  TOKENS.sbUSD,
    USDC:   TOKENS.USDC,
  },
  91342: {
    wCTC:   TOKENS.wCTC,
    lstCTC: TOKENS.lstCTC,
    sbUSD:  TOKENS.sbUSD,
    USDC:   TOKENS.USDC,
  },
  999: {
    wCTC:   TOKENS.wCTC,
    lstCTC: TOKENS.lstCTC,
    sbUSD:  TOKENS.sbUSD,
    USDC:   TOKENS.USDC,
  },
  10143: {
    wCTC:   TOKENS.wCTC,
    lstCTC: TOKENS.lstCTC,
    sbUSD:  TOKENS.sbUSD,
    USDC:   TOKENS.USDC,
  },
};

function getTokenAddress(chainId: BridgeChainId, symbol: TokenSymbol): Address {
  return CHAIN_TOKEN_ADDRESSES[chainId][symbol];
}

// ─── Internal Bridge Tab ───────────────────────────────────────────────────

function InternalBridgeTab() {
  const { address, isConnected } = useAccount();

  const [fromChainId, setFromChainId] = useState<BridgeChainId>(102031);
  const [toChainId, setToChainId] = useState<BridgeChainId>(91342);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("wCTC");
  const [amountStr, setAmountStr] = useState("");
  const [isBridging, setIsBridging] = useState(false);

  const fromChainName = BRIDGE_CHAINS.find((c) => c.id === fromChainId)!.name;
  const toChainName   = BRIDGE_CHAINS.find((c) => c.id === toChainId)!.name;

  const tokenAddress = getTokenAddress(fromChainId, selectedToken);

  const { data: balanceRaw, isLoading: isBalanceLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const balance = typeof balanceRaw === "bigint" ? balanceRaw : 0n;
  const tokenInfo = TOKEN_INFO[tokenAddress];

  const parsedAmount = useMemo(() => {
    try {
      return amountStr ? parseEther(amountStr) : 0n;
    } catch {
      return 0n;
    }
  }, [amountStr]);

  const isExceedingBalance = parsedAmount > 0n && parsedAmount > balance;
  const canBridge =
    isConnected &&
    parsedAmount > 0n &&
    !isExceedingBalance &&
    !isBridging;

  const swapChains = () => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setAmountStr("");
  };

  const handleMax = () => {
    if (balance > 0n) setAmountStr(formatEther(balance));
  };

  const handleBridge = async () => {
    if (!canBridge) return;
    setIsBridging(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success(`Bridge initiated: ${amountStr} ${selectedToken} from ${fromChainName} → ${toChainName}`);
      setAmountStr("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Bridge failed: ${msg}`);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* From / To chain selectors */}
      <div className="rounded-xl bg-bg-input p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">From</span>
          <select
            value={fromChainId}
            onChange={(e) => {
              const newFrom = Number(e.target.value) as BridgeChainId;
              setFromChainId(newFrom);
              if (newFrom === toChainId) {
                const fallback = BRIDGE_CHAINS.find((c) => c.id !== newFrom)!;
                setToChainId(fallback.id);
              }
              setAmountStr("");
            }}
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ice-400/60"
          >
            {BRIDGE_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <button
            onClick={swapChains}
            className="w-9 h-9 rounded-xl bg-bg-card border border-border hover:border-ice-400/40 flex items-center justify-center transition-all hover:rotate-180 hover:shadow-[0_0_15px_rgba(96,165,250,0.2)] duration-300"
            title="Swap chains"
          >
            <ArrowDownUp className="w-4 h-4 text-ice-400" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">To</span>
          <select
            value={toChainId}
            onChange={(e) => {
              setToChainId(Number(e.target.value) as BridgeChainId);
              setAmountStr("");
            }}
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ice-400/60"
          >
            {BRIDGE_CHAINS.filter((c) => c.id !== fromChainId).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token selector */}
      <div className="rounded-xl bg-bg-input p-4 space-y-2">
        <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Token</span>
        <div className="flex flex-wrap gap-2 pt-1">
          {TOKEN_SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSelectedToken(sym);
                setAmountStr("");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedToken === sym
                  ? "bg-ice-400/10 border-ice-400/60 text-ice-400"
                  : "bg-bg-card border-border text-text-secondary hover:border-ice-400/30 hover:text-text-primary"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div className="rounded-xl bg-bg-input p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Amount</span>
          {isConnected && (
            <div className="flex items-center gap-2">
              {isBalanceLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-text-tertiary" />
              ) : (
                <span className="text-xs text-text-secondary">
                  Balance: {formatTokenAmount(balance, tokenInfo?.decimals ?? 18, 4)} {selectedToken}
                </span>
              )}
              <button
                onClick={handleMax}
                className="text-xs text-ice-400 hover:text-ice-300 font-medium transition-colors"
                disabled={balance === 0n}
              >
                MAX
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-2xl font-mono text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <span className="text-sm font-medium text-text-secondary shrink-0">{selectedToken}</span>
        </div>
        {isExceedingBalance && (
          <p className="text-xs text-red-400 mt-1.5">Insufficient balance</p>
        )}
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <span>Est. Time</span>
        <span>~2 min</span>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <span>Fee</span>
        <span>~0.001 CTC</span>
      </div>

      {/* Action button */}
      <div className="pt-1">
        {!isConnected ? (
          <Button className="w-full" disabled>
            Connect Wallet
          </Button>
        ) : parsedAmount === 0n ? (
          <Button className="w-full" variant="secondary" disabled>
            Enter an amount
          </Button>
        ) : isExceedingBalance ? (
          <Button className="w-full" variant="secondary" disabled>
            Insufficient balance
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleBridge}
            disabled={!canBridge}
          >
            {isBridging && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Bridge Assets
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── CCTP Bridge Tab ───────────────────────────────────────────────────────

function CCTPBridgeTab() {
  const { address, isConnected, chainId } = useAccount();
  const { isSourceSupported, sourceChain, availableDestinations, bridge, isPending } =
    useCCTPBridge();

  const [destChainId, setDestChainId] = useState<number>(
    CCTP_CHAINS.find((c: { chainId: number }) => c.chainId !== chainId)?.chainId ?? CCTP_CHAINS[0].chainId,
  );
  const [amountStr, setAmountStr] = useState("");

  // USDC on source chain has 6 decimals (mainnet standard)
  const USDC_DECIMALS = 6;

  const { data: balanceRaw, isLoading: isBalanceLoading } = useReadContract({
    address: sourceChain?.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && isSourceSupported },
  });

  const balance = typeof balanceRaw === "bigint" ? balanceRaw : 0n;

  const parsedAmount = useMemo(() => {
    try {
      return amountStr ? parseUnits(amountStr, USDC_DECIMALS) : 0n;
    } catch {
      return 0n;
    }
  }, [amountStr]);

  const isExceedingBalance = parsedAmount > 0n && parsedAmount > balance;
  const canBridge =
    isConnected &&
    isSourceSupported &&
    parsedAmount > 0n &&
    !isExceedingBalance &&
    !isPending;

  const handleMax = () => {
    if (balance > 0n) {
      // Format with 6 decimals
      const whole = balance / 10n ** BigInt(USDC_DECIMALS);
      const frac = balance % 10n ** BigInt(USDC_DECIMALS);
      const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
      setAmountStr(fracStr ? `${whole}.${fracStr}` : `${whole}`);
    }
  };

  const handleBridge = async () => {
    if (!canBridge) return;
    try {
      const destChain = getCCTPChain(destChainId);
      const hash = await bridge(destChainId, parsedAmount);
      toast.success(
        `CCTP bridge initiated: ${amountStr} USDC → ${destChain?.name ?? "destination"}`,
        { description: `TX: ${hash}` },
      );
      setAmountStr("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`CCTP bridge failed: ${msg}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <UnsupportedNotice />
        <Button className="w-full" disabled>
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (!isSourceSupported) {
    return (
      <div className="space-y-3">
        <UnsupportedNotice />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chain selector */}
      <div className="rounded-xl bg-bg-input p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">From</span>
          <div className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary">
            {sourceChain?.name}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-9 h-9 rounded-xl bg-bg-card border border-border flex items-center justify-center">
            <ArrowDownUp className="w-4 h-4 text-ice-400/50" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">To</span>
          <select
            value={destChainId}
            onChange={(e) => setDestChainId(Number(e.target.value))}
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ice-400/60"
          >
            {availableDestinations.map((c) => (
              <option key={c.chainId} value={c.chainId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token (USDC only) */}
      <div className="rounded-xl bg-bg-input p-4 space-y-2">
        <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Token</span>
        <div className="pt-1">
          <div className="inline-flex px-3 py-1.5 rounded-lg text-sm font-medium border bg-ice-400/10 border-ice-400/60 text-ice-400">
            USDC
          </div>
        </div>
      </div>

      {/* Amount input */}
      <div className="rounded-xl bg-bg-input p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">Amount</span>
          <div className="flex items-center gap-2">
            {isBalanceLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-text-tertiary" />
            ) : (
              <span className="text-xs text-text-secondary">
                Balance: {formatTokenAmount(balance, USDC_DECIMALS, 4)} USDC
              </span>
            )}
            <button
              onClick={handleMax}
              className="text-xs text-ice-400 hover:text-ice-300 font-medium transition-colors"
              disabled={balance === 0n}
            >
              MAX
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-2xl font-mono text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <span className="text-sm font-medium text-text-secondary shrink-0">USDC</span>
        </div>
        {isExceedingBalance && (
          <p className="text-xs text-red-400 mt-1.5">Insufficient balance</p>
        )}
      </div>

      {/* Info rows */}
      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <span>Est. Time</span>
        <span>~1–3 min</span>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
        <span>Fee</span>
        <span>Gas only (no bridge fee)</span>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-text-tertiary">
        <span>Powered by</span>
        <span>Circle CCTP V2</span>
      </div>

      {/* Action button */}
      <div className="pt-1">
        {parsedAmount === 0n ? (
          <Button className="w-full" variant="secondary" disabled>
            Enter an amount
          </Button>
        ) : isExceedingBalance ? (
          <Button className="w-full" variant="secondary" disabled>
            Insufficient balance
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleBridge}
            disabled={!canBridge}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Bridge via CCTP
          </Button>
        )}
      </div>
    </div>
  );
}

function UnsupportedNotice() {
  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-300">
      <p className="font-medium mb-1">Chain not supported</p>
      <p className="text-amber-300/70 text-xs">
        Switch to a CCTP-supported chain: Ethereum, Arbitrum, Optimism, or Base.
      </p>
    </div>
  );
}

// ─── Bridge Page ──────────────────────────────────────────────────────────────

type Tab = "internal" | "cctp";

export default function BridgePage() {
  const [activeTab, setActiveTab] = useState<Tab>("internal");

  return (
    <div className="max-w-xl mx-auto px-4 py-8 lg:py-12">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Bridge Assets</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-bg-input p-1 gap-1">
            <button
              onClick={() => setActiveTab("internal")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "internal"
                  ? "bg-bg-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Internal Bridge
            </button>
            <button
              onClick={() => setActiveTab("cctp")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "cctp"
                  ? "bg-bg-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              CCTP Bridge
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "internal" ? <InternalBridgeTab /> : <CCTPBridgeTab />}
        </CardContent>
      </Card>
    </div>
  );
}
