"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, parseEther, isAddress } from "viem";
import { Shield, AlertTriangle, Fuel, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { GasSponsorBadge } from "@/shared/components/GasSponsorBadge";
import { useGasSponsor } from "@/shared/hooks/useGasSponsor";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";

// ─── ABI ───

const PaymasterABI = [
  { type: "function", name: "sponsorAll", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "dailyLimitPerUser", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "sponsoredSenders", inputs: [{ name: "sender", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getDeposit", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "entryPoint", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "setSponsorAll", inputs: [{ name: "_sponsorAll", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setSponsoredSender", inputs: [{ name: "sender", type: "address" }, { name: "sponsored", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setDailyLimit", inputs: [{ name: "limit", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdraw", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address" }], outputs: [], stateMutability: "nonpayable" },
] as const;

// ─── Helpers ───

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className="text-sm font-mono text-text-primary">{value}</span>
    </div>
  );
}

// ─── Section: Status ───

function StatusSection({
  paymasterAddress,
  chainId,
}: {
  paymasterAddress: `0x${string}`;
  chainId: number;
}) {
  const [depositAmount, setDepositAmount] = useState("");
  const { writeContractAsync, isPending } = useChainWriteContract(chainId);

  const { data: owner } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "owner",
  });

  const { data: entryPoint } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "entryPoint",
  });

  const { data: depositRaw, refetch: refetchDeposit } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "getDeposit",
  });

  async function handleDeposit() {
    if (!depositAmount) return;
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "deposit",
        value: parseEther(depositAmount),
      });
      setDepositAmount("");
      refetchDeposit();
    } catch {
      // TX rejected or failed — wagmi toasts handle this
    }
  }

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-ice-400" />
          Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <InfoRow label="Chain ID" value={chainId} />
        <InfoRow label="Paymaster" value={shortAddr(paymasterAddress)} />
        <InfoRow
          label="Owner"
          value={owner ? shortAddr(owner) : <span className="text-text-tertiary">—</span>}
        />
        <InfoRow
          label="EntryPoint"
          value={entryPoint ? shortAddr(entryPoint) : <span className="text-text-tertiary">—</span>}
        />
        <InfoRow
          label="Deposit Balance"
          value={
            depositRaw !== undefined
              ? `${Number(formatEther(depositRaw)).toFixed(4)} CTC`
              : <span className="text-text-tertiary">—</span>
          }
        />

        <div className="pt-4 flex items-center gap-2">
          <Input
            placeholder="Amount (CTC)"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="max-w-[160px]"
          />
          <Button
            size="sm"
            onClick={handleDeposit}
            disabled={isPending || !depositAmount}
          >
            {isPending ? "Depositing…" : "Deposit More"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section: Sponsor Policy ───

function SponsorPolicySection({
  paymasterAddress,
  chainId,
}: {
  paymasterAddress: `0x${string}`;
  chainId: number;
}) {
  const [dailyLimitInput, setDailyLimitInput] = useState("");
  const { writeContractAsync, isPending } = useChainWriteContract(chainId);

  const { data: sponsorAll, refetch: refetchSponsorAll } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "sponsorAll",
  });

  const { data: dailyLimit, refetch: refetchDailyLimit } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "dailyLimitPerUser",
  });

  async function handleToggleSponsorAll() {
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "setSponsorAll",
        args: [!sponsorAll],
      });
      refetchSponsorAll();
    } catch {
      // handled by wagmi
    }
  }

  async function handleSetDailyLimit() {
    if (!dailyLimitInput) return;
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "setDailyLimit",
        args: [parseEther(dailyLimitInput)],
      });
      setDailyLimitInput("");
      refetchDailyLimit();
    } catch {
      // handled by wagmi
    }
  }

  const currentLimit =
    dailyLimit !== undefined
      ? dailyLimit === 0n
        ? "Unlimited"
        : `${Number(formatEther(dailyLimit)).toFixed(4)} CTC`
      : "—";

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Fuel className="w-4 h-4 text-ice-400" />
          Sponsor Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Sponsor All toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Sponsor All</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              Sponsor gas for every sender unconditionally
            </p>
          </div>
          <button
            onClick={handleToggleSponsorAll}
            disabled={isPending || sponsorAll === undefined}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50",
              sponsorAll ? "bg-ice-400" : "bg-border",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                sponsorAll ? "translate-x-6" : "translate-x-1",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Daily Limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">Daily Limit per User</p>
            <span className="text-xs font-mono text-ice-400">{currentLimit}</span>
          </div>
          <p className="text-xs text-text-tertiary">Set to 0 for unlimited. Value in CTC.</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="0.01 (0 = unlimited)"
              value={dailyLimitInput}
              onChange={(e) => setDailyLimitInput(e.target.value)}
              className="max-w-[200px]"
            />
            <Button
              size="sm"
              onClick={handleSetDailyLimit}
              disabled={isPending || !dailyLimitInput}
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section: Sender Whitelist ───

function WhitelistSection({
  paymasterAddress,
  chainId,
}: {
  paymasterAddress: `0x${string}`;
  chainId: number;
}) {
  const [addAddr, setAddAddr] = useState("");
  const [removeAddr, setRemoveAddr] = useState("");
  const [checkAddr, setCheckAddr] = useState("");
  const [checkResult, setCheckResult] = useState<boolean | null>(null);
  const { writeContractAsync, isPending } = useChainWriteContract(chainId);

  const { refetch: checkSender } = useReadContract({
    address: paymasterAddress,
    abi: PaymasterABI,
    functionName: "sponsoredSenders",
    args: [checkAddr as `0x${string}`],
    query: { enabled: false },
  });

  async function handleAdd() {
    if (!isAddress(addAddr)) return;
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "setSponsoredSender",
        args: [addAddr as `0x${string}`, true],
      });
      setAddAddr("");
    } catch {
      // handled by wagmi
    }
  }

  async function handleRemove() {
    if (!isAddress(removeAddr)) return;
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "setSponsoredSender",
        args: [removeAddr as `0x${string}`, false],
      });
      setRemoveAddr("");
    } catch {
      // handled by wagmi
    }
  }

  async function handleCheck() {
    if (!isAddress(checkAddr)) return;
    const result = await checkSender();
    setCheckResult(result.data ?? null);
  }

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-ice-400" />
          Sender Whitelist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Add Sender</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="0x..."
              value={addAddr}
              onChange={(e) => setAddAddr(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !isAddress(addAddr)}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Remove */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Remove Sender</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="0x..."
              value={removeAddr}
              onChange={(e) => setRemoveAddr(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemove}
              disabled={isPending || !isAddress(removeAddr)}
            >
              Remove
            </Button>
          </div>
        </div>

        {/* Check */}
        <div className="space-y-1.5 border-t border-border/40 pt-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Check Address</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="0x..."
              value={checkAddr}
              onChange={(e) => { setCheckAddr(e.target.value); setCheckResult(null); }}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheck}
              disabled={!isAddress(checkAddr)}
            >
              Check
            </Button>
          </div>
          {checkResult !== null && (
            <p className="text-sm font-medium mt-1">
              {checkResult
                ? <span className="text-green-400">✅ Sponsored</span>
                : <span className="text-red-400">❌ Not sponsored</span>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section: Withdraw ───

function WithdrawSection({
  paymasterAddress,
  chainId,
}: {
  paymasterAddress: `0x${string}`;
  chainId: number;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { writeContractAsync, isPending } = useChainWriteContract(chainId);

  async function handleWithdraw() {
    if (!isAddress(recipient) || !amount) return;
    try {
      await writeContractAsync({
        address: paymasterAddress,
        abi: PaymasterABI,
        functionName: "withdraw",
        args: [recipient as `0x${string}`, parseEther(amount)],
      });
      setAmount("");
    } catch {
      // handled by wagmi
    }
  }

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
      <CardHeader>
        <CardTitle className="text-base text-white">Withdraw</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-text-tertiary mb-1.5">Recipient address</p>
          <Input
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div>
          <p className="text-xs text-text-tertiary mb-1.5">Amount (CTC)</p>
          <Input
            placeholder="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={handleWithdraw}
          disabled={isPending || !isAddress(recipient) || !amount}
          className="w-full"
        >
          {isPending ? "Withdrawing…" : "Withdraw"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───

export default function PaymasterAdminPage() {
  const { address, isConnected } = useAccount();
  const { isAvailable, paymasterAddress, chainId } = useGasSponsor();

  const { data: owner } = useReadContract({
    address: paymasterAddress as `0x${string}` | undefined,
    abi: PaymasterABI,
    functionName: "owner",
    query: { enabled: isAvailable },
  });

  const isOwner =
    isConnected &&
    !!address &&
    !!owner &&
    address.toLowerCase() === owner.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-ice-400" />
          <h1 className="text-2xl font-bold text-text-primary">Paymaster Admin</h1>
        </div>
        <GasSponsorBadge />
      </div>

      {/* Not connected */}
      {!isConnected && (
        <Card className="bg-bg-card/60 border-border">
          <CardContent className="py-10 text-center text-text-secondary text-sm">
            Connect your wallet to manage the Paymaster.
          </CardContent>
        </Card>
      )}

      {/* Gas sponsor not available on this chain */}
      {isConnected && !isAvailable && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              Paymaster is not available on the current chain. Switch to a supported network.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Not owner warning */}
      {isConnected && isAvailable && !isOwner && owner && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">
              Your wallet is not the owner. Write operations will revert.
              Owner: <span className="font-mono">{shortAddr(owner)}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin sections — shown when paymaster available */}
      {isConnected && isAvailable && paymasterAddress && chainId && (
        <>
          <StatusSection
            paymasterAddress={paymasterAddress as `0x${string}`}
            chainId={chainId}
          />
          <SponsorPolicySection
            paymasterAddress={paymasterAddress as `0x${string}`}
            chainId={chainId}
          />
          <WhitelistSection
            paymasterAddress={paymasterAddress as `0x${string}`}
            chainId={chainId}
          />
          <WithdrawSection
            paymasterAddress={paymasterAddress as `0x${string}`}
            chainId={chainId}
          />
        </>
      )}
    </div>
  );
}
