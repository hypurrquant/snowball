"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, toFunctionSelector, maxUint256, type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Loader2, ChevronRight, Check } from "lucide-react";
import { LIQUITY, LEND, TOKENS, ERC8004 } from "@/core/config/addresses";
import { useVaultActions } from "../hooks/useVaultActions";
import { useVaultPermission } from "../hooks/useVaultPermission";
import { PERMISSION_EXPIRY_SECONDS, AGENT_RATE_BOUNDS } from "../lib/constants";
import { useVaultBalance } from "../hooks/useVaultBalance";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { useMorphoAuthorization } from "@/domains/defi/morpho/hooks/useMorphoAuthorization";
import { useTroveDelegate } from "@/domains/defi/liquity/hooks/useTroveDelegate";

type Scenario = "morpho" | "liquity";

interface DelegationSetupWizardProps {
  agentAddress: Address;
  agentVaultAddress: Address;
  scenario: Scenario;
  branch?: "wCTC" | "lstCTC";
  troveId?: string;
  onTroveIdChange?: (troveId: string) => void;
  onComplete?: () => void;
}

const MORPHO_PERMISSION = {
  targets: [LEND.snowballLend],
  functions: [
    toFunctionSelector("supply((address,address,address,address,uint256),uint256,uint256,address,bytes)"),
    toFunctionSelector("withdraw((address,address,address,address,uint256),uint256,uint256,address,address)"),
  ] as `0x${string}`[],
};

function getLiquityPermission(branch: "wCTC" | "lstCTC") {
  return {
    targets: [LIQUITY.branches[branch].borrowerOperations],
    functions: [
      toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)"),
      toFunctionSelector("addColl(uint256,uint256)"),
    ] as `0x${string}`[],
  };
}

export function DelegationSetupWizard({
  agentAddress,
  agentVaultAddress,
  scenario,
  branch = "wCTC",
  troveId: externalTroveId,
  onTroveIdChange,
  onComplete,
}: DelegationSetupWizardProps) {
  const [step, setStep] = useState(1);
  const { address } = useAccount();

  // Step 1: Vault
  const { deposit, withdraw, isDepositPending, isWithdrawPending } = useVaultActions();
  const { balances, refetch: refetchBalance } = useVaultBalance();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositToken, setDepositToken] = useState<Address>(TOKENS.sbUSD);

  // ERC20 approval for vault deposit
  // All supported tokens (sbUSD, wCTC, lstCTC, USDC) are 18 decimals on this testnet
  const parsedDepositAmount = depositAmount && !isNaN(Number(depositAmount)) ? parseEther(depositAmount) : 0n;
  const { needsApproval, approve: approveToken, isApproving } = useTokenApproval({
    token: depositToken,
    spender: ERC8004.agentVault,
    amount: parsedDepositAmount,
    owner: address,
  });

  // Step 2: Permission
  const { grantPermission, revokePermission, isGrantPending, isRevokePending } = useVaultPermission();

  // Step 3: Protocol delegation
  const { setAuthorization, isPending: isMorphoPending } = useMorphoAuthorization();
  const { setAddManager, setInterestIndividualDelegate, setRemoveManagerWithReceiver, isPending: isLiquityPending } =
    useTroveDelegate(branch);

  // troveId is controlled by parent when provided, otherwise local state
  const [localTroveId, setLocalTroveId] = useState("");
  const troveId = externalTroveId ?? localTroveId;
  const setTroveId = onTroveIdChange ?? setLocalTroveId;

  const handleDeposit = async () => {
    if (!depositAmount) return;
    const amount = parseEther(depositAmount);
    if (needsApproval) {
      await approveToken(maxUint256);
    }
    await deposit(depositToken, amount);
    setDepositAmount("");
    refetchBalance();
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    const amount = parseEther(withdrawAmount);
    await withdraw(depositToken, amount);
    setWithdrawAmount("");
    refetchBalance();
  };

  const handleGrantPermission = async () => {
    const preset = scenario === "morpho" ? MORPHO_PERMISSION : getLiquityPermission(branch);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + PERMISSION_EXPIRY_SECONDS);
    const collToken = branch === "lstCTC" ? TOKENS.lstCTC : TOKENS.wCTC;
    const tokenCaps = scenario === "morpho"
      ? [{ token: TOKENS.sbUSD as Address, cap: parseEther("1000") }]
      : [{ token: collToken as Address, cap: parseEther("100") }];
    await grantPermission({
      agent: agentAddress,
      targets: preset.targets,
      functions: preset.functions,
      expiry,
      tokenCaps,
    });
  };

  const handleRevokePermission = async () => {
    await revokePermission(agentAddress);
  };

  const handleMorphoAuthorize = async (authorize: boolean) => {
    await setAuthorization(agentVaultAddress, authorize);
  };

  const handleLiquityDelegate = async () => {
    if (!troveId) return;
    const id = BigInt(troveId);
    await setAddManager(id, agentVaultAddress);
    await setInterestIndividualDelegate({
      troveId: id,
      delegate: agentVaultAddress,
      minInterestRate: AGENT_RATE_BOUNDS.minInterestRate,
      maxInterestRate: AGENT_RATE_BOUNDS.maxInterestRate,
      newAnnualInterestRate: 0n,
      upperHint: 0n,
      lowerHint: 0n,
      maxUpfrontFee: parseEther("1000"),
      minInterestRateChangePeriod: 0n,
    });
  };

  const handleLiquityRevoke = async () => {
    if (!troveId || !address) return;
    const id = BigInt(troveId);
    await setRemoveManagerWithReceiver(id, agentVaultAddress, address);
  };

  const steps = [
    { label: "Vault Deposit", number: 1 },
    { label: "Permission", number: 2 },
    { label: "Delegation", number: 3 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Delegation Setup — {scenario === "morpho" ? "Morpho" : "Liquity"}
        </CardTitle>
        {/* Step indicators */}
        <div className="flex items-center gap-2 mt-3">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > s.number
                    ? "bg-green-500 text-white"
                    : step === s.number
                      ? "bg-ice-400 text-white"
                      : "bg-bg-input text-text-tertiary"
                }`}
              >
                {step > s.number ? <Check className="w-3 h-3" /> : s.number}
              </div>
              <span className={`text-xs ${step === s.number ? "text-white" : "text-text-tertiary"}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-text-tertiary" />}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Vault Deposit / Withdraw */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Deposit tokens into the Agent Vault. The agent will operate using these funds.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Token</label>
              <select
                value={depositToken}
                onChange={(e) => setDepositToken(e.target.value as Address)}
                className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white"
              >
                <option value={TOKENS.sbUSD}>sbUSD</option>
                <option value={TOKENS.wCTC}>wCTC</option>
                <option value={TOKENS.lstCTC}>lstCTC</option>
                <option value={TOKENS.USDC}>USDC</option>
              </select>
            </div>
            {/* Vault balances */}
            <div className="text-xs text-text-tertiary space-y-1">
              {balances.map((b) => (
                <div key={b.symbol} className="flex justify-between">
                  <span>{b.symbol}</span>
                  <span className="font-mono">
                    {(Number(b.balance) / 1e18).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount to deposit"
                className="flex-1 rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary"
              />
              <Button onClick={handleDeposit} disabled={isDepositPending || isApproving} size="sm">
                {(isDepositPending || isApproving) && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                {needsApproval ? "Approve & Deposit" : "Deposit"}
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount to withdraw"
                className="flex-1 rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary"
              />
              <Button onClick={handleWithdraw} disabled={isWithdrawPending} variant="outline" size="sm">
                {isWithdrawPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Withdraw
              </Button>
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Next: Grant Permission <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Permission */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Grant the agent permission to operate on your vault for{" "}
              {scenario === "morpho" ? "Morpho (supply/withdraw)" : "Liquity (adjustRate/addColl)"}.
            </p>
            <div className="rounded-xl bg-bg-input p-4 space-y-1 text-xs text-text-tertiary">
              <div>Agent: {agentAddress.slice(0, 8)}...{agentAddress.slice(-6)}</div>
              <div>Scope: {scenario === "morpho" ? "Morpho supply + withdraw" : "Liquity adjustRate + addColl"}</div>
              <div>Expiry: 30 days</div>
              <div>Token Cap: {scenario === "morpho" ? "1,000 sbUSD" : `100 ${branch === "lstCTC" ? "lstCTC" : "wCTC"}`}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGrantPermission} disabled={isGrantPending} className="flex-1">
                {isGrantPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Grant Permission
              </Button>
              <Button onClick={handleRevokePermission} disabled={isRevokePending} variant="destructive" size="sm">
                {isRevokePending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Revoke
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} size="sm">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Next: Protocol Delegation <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Protocol Delegation */}
        {step === 3 && (
          <div className="space-y-4">
            {scenario === "morpho" ? (
              <>
                <p className="text-sm text-text-secondary">
                  Authorize the Agent Vault on Morpho so it can supply/withdraw on your behalf.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleMorphoAuthorize(true)}
                    disabled={isMorphoPending}
                    className="flex-1"
                  >
                    {isMorphoPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Authorize (setAuthorization true)
                  </Button>
                  <Button
                    onClick={() => handleMorphoAuthorize(false)}
                    disabled={isMorphoPending}
                    variant="destructive"
                    size="sm"
                  >
                    Revoke
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  Set the Agent Vault as your Trove&apos;s add manager and interest rate delegate.
                </p>
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary">Trove ID</label>
                  <input
                    value={troveId}
                    onChange={(e) => setTroveId(e.target.value)}
                    placeholder="Enter your Trove ID"
                    className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLiquityDelegate}
                    disabled={isLiquityPending || !troveId}
                    className="flex-1"
                  >
                    {isLiquityPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Set Delegation
                  </Button>
                  <Button
                    onClick={handleLiquityRevoke}
                    disabled={isLiquityPending || !troveId}
                    variant="destructive"
                    size="sm"
                  >
                    Revoke
                  </Button>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} size="sm">
                Back
              </Button>
              <Button
                onClick={onComplete}
                className="flex-1"
                variant="default"
              >
                <Check className="w-4 h-4 mr-1" />
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
