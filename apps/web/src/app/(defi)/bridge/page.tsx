"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, parseEther, formatEther, type Address } from "viem";
import { toast } from "sonner";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CHAIN_CONFIGS } from "@/core/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";

// ─── Chain / Token Definitions ───────────────────────────────────────────────

const BRIDGE_CHAINS = [
  { id: 102031, name: "CC Testnet" },
  { id: 91342,  name: "GIWA Sepolia" },
] as const;

type BridgeChainId = (typeof BRIDGE_CHAINS)[number]["id"];

const TOKEN_SYMBOLS = ["wCTC", "lstCTC", "sbUSD", "USDC"] as const;
type TokenSymbol = (typeof TOKEN_SYMBOLS)[number];

function getTokenAddress(chainId: BridgeChainId, symbol: TokenSymbol): Address {
  return CHAIN_CONFIGS[chainId].tokens[symbol];
}

// ─── Bridge Page ──────────────────────────────────────────────────────────────

export default function BridgePage() {
  const { address, isConnected } = useAccount();

  const [fromChainId, setFromChainId] = useState<BridgeChainId>(102031);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("wCTC");
  const [amountStr, setAmountStr] = useState("");
  const [isBridging, setIsBridging] = useState(false);

  // Destination is always the other chain
  const toChainId: BridgeChainId = fromChainId === 102031 ? 91342 : 102031;
  const fromChainName = BRIDGE_CHAINS.find((c) => c.id === fromChainId)!.name;
  const toChainName   = BRIDGE_CHAINS.find((c) => c.id === toChainId)!.name;

  const tokenAddress = getTokenAddress(fromChainId, selectedToken);

  // Balance of selected token on source chain
  const { data: balanceRaw, isLoading: isBalanceLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const balance = typeof balanceRaw === "bigint" ? balanceRaw : 0n;
  const tokenInfo = CHAIN_CONFIGS[fromChainId].tokenInfo[tokenAddress];

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
    setAmountStr("");
  };

  const handleMax = () => {
    if (balance > 0n) {
      setAmountStr(formatEther(balance));
    }
  };

  const handleBridge = async () => {
    if (!canBridge) return;
    setIsBridging(true);
    try {
      // Placeholder: actual DN Bridge TX integration goes here
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
    <div className="max-w-xl mx-auto px-4 py-8 lg:py-12">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Bridge Assets</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* From / To chain selectors */}
          <div className="rounded-xl bg-bg-input p-4 space-y-3">
            {/* From chain */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">From</span>
              <select
                value={fromChainId}
                onChange={(e) => {
                  setFromChainId(Number(e.target.value) as BridgeChainId);
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

            {/* Swap button */}
            <div className="flex justify-center">
              <button
                onClick={swapChains}
                className="w-9 h-9 rounded-xl bg-bg-card border border-border hover:border-ice-400/40 flex items-center justify-center transition-all hover:rotate-180 hover:shadow-[0_0_15px_rgba(96,165,250,0.2)] duration-300"
                title="Swap chains"
              >
                <ArrowDownUp className="w-4 h-4 text-ice-400" />
              </button>
            </div>

            {/* To chain */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">To</span>
              <div className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary">
                {toChainName}
              </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
