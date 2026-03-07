"use client";

import { useState } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { TOKENS, TOKEN_INFO } from "@/core/config/addresses";
import { Droplets, Wallet, CheckCircle, Loader2 } from "lucide-react";

const FAUCET_TOKENS = [
  { address: TOKENS.wCTC, symbol: "wCTC", name: "Wrapped CTC", amount: "1000" },
  { address: TOKENS.lstCTC, symbol: "lstCTC", name: "Liquid Staked CTC", amount: "1000" },
  { address: TOKENS.USDC, symbol: "USDC", name: "Mock USDC", amount: "1000" },
] as const;

const ERC20_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

const FAUCET_ABI = [
  { type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

function TokenRow({ token, balance, isConnected }: {
  token: typeof FAUCET_TOKENS[number];
  balance: bigint | undefined;
  isConnected: boolean;
}) {
  const [mintAmount, setMintAmount] = useState<string>(token.amount);
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = () => {
    reset();
    writeContract({
      address: token.address,
      abi: FAUCET_ABI,
      functionName: "faucet",
      args: [parseEther(mintAmount)],
    });
  };

  const info = TOKEN_INFO[token.address.toLowerCase()];
  const balanceFormatted = balance !== undefined ? Number(formatUnits(balance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
  const balanceUsd = balance !== undefined && info ? (Number(formatUnits(balance, 18)) * info.mockPriceUsd).toLocaleString(undefined, { style: "currency", currency: "USD" }) : "";

  const isBusy = isPending || isConfirming;

  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{token.symbol}</h3>
          <p className="text-sm text-text-secondary">{token.name}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono">{balanceFormatted}</div>
          {balanceUsd && <div className="text-xs text-text-tertiary">{balanceUsd}</div>}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Amount"
          min="1"
          max="100000"
        />
        <button
          onClick={handleMint}
          disabled={!isConnected || isBusy || !mintAmount}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sign</>
          ) : isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Minting</>
          ) : isSuccess ? (
            <><CheckCircle className="w-4 h-4" /> Done!</>
          ) : (
            <><Droplets className="w-4 h-4" /> Mint</>
          )}
        </button>
      </div>

      {isSuccess && hash && (
        <p className="text-xs text-text-tertiary truncate">
          TX: {hash}
        </p>
      )}
    </div>
  );
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();

  const { data: balances } = useReadContracts({
    contracts: FAUCET_TOKENS.map((t) => ({
      address: t.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: address ? [address] : undefined,
    })),
    query: { enabled: isConnected && !!address, refetchInterval: 5000 },
  });

  // Also read sbUSD balance (not mintable but show it)
  const { data: sbUSDBalance } = useReadContracts({
    contracts: [{
      address: TOKENS.sbUSD,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: address ? [address] : undefined,
    }],
    query: { enabled: isConnected && !!address, refetchInterval: 5000 },
  });

  const sbUSDVal = sbUSDBalance?.[0]?.result as bigint | undefined;
  const sbUSDFormatted = sbUSDVal !== undefined ? Number(formatUnits(sbUSDVal, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Droplets className="w-6 h-6" /> Testnet Faucet
        </h1>
        <p className="text-text-secondary">
          Mint test tokens for Creditcoin Testnet. Max 100,000 per call.
        </p>
      </div>

      {!isConnected && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-2">
          <Wallet className="w-8 h-8 mx-auto text-text-tertiary" />
          <p className="text-text-secondary">Connect your wallet to use the faucet</p>
        </div>
      )}

      {isConnected && (
        <>
          {FAUCET_TOKENS.map((token, i) => (
            <TokenRow
              key={token.address}
              token={token}
              balance={balances?.[i]?.result as bigint | undefined}
              isConnected={isConnected}
            />
          ))}

          {/* sbUSD — read-only */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">sbUSD</h3>
                <p className="text-sm text-text-secondary">Snowball USD (borrow to get)</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono">{sbUSDFormatted}</div>
                {sbUSDVal !== undefined && (
                  <div className="text-xs text-text-tertiary">
                    {Number(formatUnits(sbUSDVal, 18)).toLocaleString(undefined, { style: "currency", currency: "USD" })}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">
              sbUSD is minted by borrowing from CDP. Use the CDP page to open a Trove.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
