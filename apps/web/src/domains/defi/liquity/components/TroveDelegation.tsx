"use client";

import { useState } from "react";
import { parseEther, toFunctionSelector, maxUint256, type Address } from "viem";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/components/ui/dialog";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { Loader2, Bot } from "lucide-react";
import type { TroveDelegationInfo } from "../hooks/useTroveDelegationStatus";
import { useTroveDelegate } from "../hooks/useTroveDelegate";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { LIQUITY, TOKENS, ERC8004 } from "@/core/config/addresses";
import type { TroveData } from "../types";

interface TroveDelegationProps {
  branch: "wCTC" | "lstCTC";
  trove: TroveData;
  delegationInfo: TroveDelegationInfo | undefined;
  /** User wallet address (needed for undelegate receiver) */
  address: Address;
  /** Agent domain: grantPermission handler passed from app layer */
  grantPermission: (params: {
    agent: Address;
    targets: Address[];
    functions: `0x${string}`[];
    expiry: bigint;
    tokenCaps?: { token: Address; cap: bigint }[];
  }) => Promise<unknown>;
  onDelegationChange: () => void;
}

export function TroveDelegation({
  branch,
  trove,
  delegationInfo,
  address,
  grantPermission,
  onDelegationChange,
}: TroveDelegationProps) {
  const isDelegated = delegationInfo?.isDelegated ?? false;
  const { fullUndelegate, setAddManager, setInterestIndividualDelegate, isPending: isDelegatePending } = useTroveDelegate(branch);
  const delegatePipeline = useTxPipeline();

  const [undelegateOpen, setUndelegateOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);

  const handleUndelegate = async () => {
    try {
      await fullUndelegate(trove.id, address, ERC8004.agentVault as Address);
      setUndelegateOpen(false);
      onDelegationChange();
    } catch {
      // error visible to user through isPending state reset
    }
  };

  const handleDelegate = async () => {
    const b = LIQUITY.branches[branch];
    const collToken = (branch === "lstCTC" ? TOKENS.lstCTC : TOKENS.wCTC) as Address;

    await delegatePipeline.run(
      [
        { id: "permission", type: "approve" as const, label: "Grant Vault Permission" },
        { id: "add-manager", type: "delegate" as const, label: "Set Add Manager" },
        { id: "interest-delegate", type: "delegate" as const, label: "Set Interest Delegate" },
      ],
      {
        permission: async () => {
          const hash = await grantPermission({
            agent: ERC8004.agentEOA as Address,
            targets: [b.borrowerOperations as Address],
            functions: [
              toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)"),
              toFunctionSelector("addColl(uint256,uint256)"),
            ],
            expiry: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600),
            tokenCaps: [{ token: collToken, cap: parseEther("100") }],
          });
          return hash as `0x${string}` | undefined;
        },
        "add-manager": async () => {
          const hash = await setAddManager(trove.id, ERC8004.agentVault as Address);
          return hash as `0x${string}` | undefined;
        },
        "interest-delegate": async () => {
          const hash = await setInterestIndividualDelegate({
            troveId: trove.id,
            delegate: ERC8004.agentVault as Address,
            minInterestRate: parseEther("0.005"),
            maxInterestRate: parseEther("0.15"),
            newAnnualInterestRate: 0n,
            upperHint: 0n,
            lowerHint: 0n,
            maxUpfrontFee: maxUint256,
            minInterestRateChangePeriod: 0n,
          });
          return hash as `0x${string}` | undefined;
        },
      },
    );
    onDelegationChange();
  };

  return (
    <>
      {isDelegated ? (
        <Dialog open={undelegateOpen} onOpenChange={setUndelegateOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ice-400/20 text-ice-300 hover:bg-ice-400/30 transition-colors text-xs font-medium"
              title="Agent Delegated — click to undelegate"
            >
              <Bot className="w-3.5 h-3.5" /> Delegated
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Undelegate Trove</DialogTitle>
              <DialogDescription>
                Remove agent delegation from this trove. The agent will no longer manage interest rates or collateral.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setUndelegateOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleUndelegate}
                disabled={isDelegatePending}
                className="flex-1"
              >
                {isDelegatePending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Confirm Undelegate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-tertiary hover:text-ice-300 hover:bg-ice-400/10 transition-colors text-xs"
              title="Delegate to Agent"
            >
              <Bot className="w-3.5 h-3.5" /> Delegate
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delegate Trove to Agent</DialogTitle>
              <DialogDescription>
                Allow the AI agent to manage this trove&apos;s interest rate automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-bg-input p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-tertiary">Collateral</span>
                  <p className="font-mono text-white">{formatTokenAmount(trove.coll, 18, 4)} {branch}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Debt</span>
                  <p className="font-mono text-white">{formatTokenAmount(trove.debt, 18, 2)} sbUSD</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Current Rate</span>
                  <p className="font-mono text-white">{formatNumber(Number(trove.interestRate) / 1e16)}%</p>
                </div>
                <div>
                  <span className="text-text-tertiary">ICR</span>
                  <p className="font-mono text-white">{formatNumber(trove.icr)}%</p>
                </div>
              </div>
              <div className="rounded-xl bg-ice-400/10 border border-ice-400/20 p-3 text-xs space-y-1.5">
                <p className="text-ice-300 font-medium">Agent will manage:</p>
                <ul className="text-text-secondary space-y-1 ml-3 list-disc">
                  <li>Adjust interest rate to track market average</li>
                  <li>Rate range: 0.5% ~ 15%</li>
                  <li>Cooldown: 7 days between changes</li>
                  <li>Permission expires in 30 days</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDelegateOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleDelegate}
                  disabled={isDelegatePending}
                  className="flex-1"
                >
                  {isDelegatePending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Confirm Delegate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Tx Pipeline Modal — Delegate Trove */}
      <TxPipelineModal
        open={delegatePipeline.showTxModal}
        onClose={() => { delegatePipeline.reset(); setDelegateOpen(false); }}
        steps={delegatePipeline.txSteps}
        phase={delegatePipeline.txPhase}
        title="Delegate Trove"
      />
    </>
  );
}
