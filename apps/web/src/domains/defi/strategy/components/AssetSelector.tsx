"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { ChevronDown } from "lucide-react";
import { TOKENS, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { formatTokenAmount } from "@/shared/lib/utils";

const SUPPORTED_TOKENS: { key: string; address: Address }[] = [
  { key: "wCTC", address: TOKENS.wCTC },
  { key: "lstCTC", address: TOKENS.lstCTC },
  { key: "sbUSD", address: TOKENS.sbUSD },
  { key: "USDC", address: TOKENS.USDC },
];

interface AssetSelectorProps {
  selectedAsset: Address | undefined;
  amount: bigint;
  onSelect: (asset: Address, amount: bigint) => void;
}

export function AssetSelector({ selectedAsset, amount, onSelect }: AssetSelectorProps) {
  const { address: walletAddress } = useAccount();
  const [inputValue, setInputValue] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentInfo = selectedAsset ? TOKEN_INFO[selectedAsset] : undefined;
  const decimals = currentInfo?.decimals ?? 18;

  const { data: balanceData } = useTokenBalance({
    address: walletAddress,
    token: selectedAsset,
  });

  const handleAssetChange = useCallback(
    (tokenAddress: Address) => {
      setDropdownOpen(false);
      const newDecimals = TOKEN_INFO[tokenAddress]?.decimals ?? 18;
      const newAmount = inputValue
        ? (() => {
            try {
              return parseUnits(inputValue, newDecimals);
            } catch {
              return 0n;
            }
          })()
        : 0n;
      onSelect(tokenAddress, newAmount);
    },
    [inputValue, onSelect],
  );

  const handleAmountChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (!selectedAsset) return;
      const cleaned = value.replace(/,/g, "").trim();
      if (!cleaned) {
        onSelect(selectedAsset, 0n);
        return;
      }
      try {
        const parsed = parseUnits(cleaned, decimals);
        onSelect(selectedAsset, parsed);
      } catch {
        // invalid input — keep old amount
      }
    },
    [selectedAsset, decimals, onSelect],
  );

  const handleMax = useCallback(() => {
    if (!selectedAsset || !balanceData) return;
    const maxStr = formatUnits(balanceData.value, decimals);
    setInputValue(maxStr);
    onSelect(selectedAsset, balanceData.value);
  }, [selectedAsset, balanceData, decimals, onSelect]);

  const handleHalf = useCallback(() => {
    if (!selectedAsset || !balanceData) return;
    const half = balanceData.value / 2n;
    const halfStr = formatUnits(half, decimals);
    setInputValue(halfStr);
    onSelect(selectedAsset, half);
  }, [selectedAsset, balanceData, decimals, onSelect]);

  return (
    <div className="bg-bg-card/60 border border-border rounded-2xl p-4 space-y-3">
      <div className="text-xs text-text-secondary font-medium">Select Asset &amp; Amount</div>

      <div className="flex gap-3">
        {/* Token dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 bg-bg-input border border-border hover:border-ice-400/40 rounded-xl px-3 py-2.5 transition-colors min-w-[110px]"
          >
            {currentInfo ? (
              <>
                <span className="w-6 h-6 rounded-full bg-ice-400/20 flex items-center justify-center text-ice-400 text-xs font-bold shrink-0">
                  {currentInfo.symbol.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-white">{currentInfo.symbol}</span>
              </>
            ) : (
              <span className="text-sm text-text-secondary">Token</span>
            )}
            <ChevronDown className="w-4 h-4 text-text-secondary ml-auto" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden w-40">
              {SUPPORTED_TOKENS.map(({ key, address }) => {
                const info = TOKEN_INFO[address];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAssetChange(address)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-hover transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-ice-400/20 flex items-center justify-center text-ice-400 text-xs font-bold shrink-0">
                      {info.symbol.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-sm text-white">{info.symbol}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount input */}
        <div className="flex-1 bg-bg-input border border-border focus-within:border-ice-400/60 rounded-xl px-3 py-2.5 transition-colors">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={inputValue}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full bg-transparent text-white font-mono text-base outline-none placeholder-text-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Balance row */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          {walletAddress && balanceData
            ? `Balance: ${formatTokenAmount(balanceData.value, decimals, 4)} ${currentInfo?.symbol ?? ""}`
            : walletAddress
              ? "Loading balance…"
              : "Connect wallet to see balance"}
        </span>
        {balanceData && balanceData.value > 0n && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleHalf}
              className="text-xs text-ice-400 hover:text-ice-300 transition-colors"
            >
              Half
            </button>
            <button
              type="button"
              onClick={handleMax}
              className="text-xs text-ice-400 hover:text-ice-300 transition-colors"
            >
              Max
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
