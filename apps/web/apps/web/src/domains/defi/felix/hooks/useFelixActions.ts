"use client";

import { useAccount, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FELIX } from "@/core/config/hyperevm";
import type { Address } from "viem";

// Liquity V2 BorrowerOperations ABI (Felix is a Liquity fork)
const BorrowerOpsABI = [
  { type: "function", name: "openTrove", inputs: [{ name: "_owner", type: "address" }, { name: "_ownerIndex", type: "uint256" }, { name: "_collAmount", type: "uint256" }, { name: "_boldAmount", type: "uint256" }, { name: "_upperHint", type: "uint256" }, { name: "_lowerHint", type: "uint256" }, { name: "_annualInterestRate", type: "uint256" }, { name: "_maxUpfrontFee", type: "uint256" }, { name: "_addManager", type: "address" }, { name: "_removeManager", type: "address" }, { name: "_receiver", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "closeTrove", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export function useFelixActions(branch: "HYPE" = "HYPE") {
  const config = useConfig();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useChainWriteContract(999);

  const branchAddr = FELIX.branches[branch];
  const isDeployed = branchAddr.borrowerOperations !== "0x0000000000000000000000000000000000000000";

  const openTrove = async (params: { coll: bigint; debt: bigint; rate: bigint; maxFee: bigint }) => {
    if (!isDeployed || !address) return;
    const hash = await writeContractAsync({
      address: branchAddr.borrowerOperations,
      abi: BorrowerOpsABI,
      functionName: "openTrove",
      args: [address, 0n, params.coll, params.debt, 0n, 0n, params.rate, params.maxFee,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x0000000000000000000000000000000000000000" as Address],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  const closeTrove = async (troveId: bigint) => {
    if (!isDeployed) return;
    const hash = await writeContractAsync({
      address: branchAddr.borrowerOperations,
      abi: BorrowerOpsABI,
      functionName: "closeTrove",
      args: [troveId],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  return { openTrove, closeTrove, isPending, isDeployed };
}
