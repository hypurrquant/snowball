"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FORWARD } from "@snowball/core/src/config/addresses";
import { ForwardMarketplaceABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";

export function useForwardMarketplace(onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();

  // Approve Forward NFT (ERC-721) for marketplace to transfer positions
  const { approve: approveNFT, isApproving: isApprovingNFT } = useTokenApproval({
    token: FORWARD.positionNFT,
    spender: FORWARD.marketplace,
    amount: undefined,
    owner: address,
  });

  // Approve USDC for marketplace to take payment when buying
  const { approve: approveUSDC, isApproving: isApprovingUSDC } = useTokenApproval({
    token: FORWARD.collateralToken,
    spender: FORWARD.marketplace,
    amount: undefined,
    owner: address,
  });

  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  const listPosition = async (tokenId: bigint, askPrice: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.marketplace,
      abi: ForwardMarketplaceABI,
      functionName: "list",
      args: [tokenId, askPrice],
    });
    return waitAndCallback(hash);
  };

  const cancelListing = async (tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.marketplace,
      abi: ForwardMarketplaceABI,
      functionName: "cancelListing",
      args: [tokenId],
    });
    return waitAndCallback(hash);
  };

  const buyPosition = async (tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.marketplace,
      abi: ForwardMarketplaceABI,
      functionName: "buy",
      args: [tokenId],
    });
    return waitAndCallback(hash);
  };

  return {
    approveNFT,
    approveUSDC,
    listPosition,
    cancelListing,
    buyPosition,
    isPending: isPending || isApprovingNFT || isApprovingUSDC,
  };
}
