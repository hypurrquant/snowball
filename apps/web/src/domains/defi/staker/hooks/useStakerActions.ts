"use client";

import { useAccount, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { DEX, STAKER } from "@snowball/core/src/config/addresses";
import { SnowballStakerABI, NonfungiblePositionManagerABI } from "@/core/abis";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import type { Address } from "viem";
import type { IncentiveKey } from "../types";

const INCENTIVE_KEY_TYPE = parseAbiParameters(
  "(address rewardToken, address pool, uint256 startTime, uint256 endTime, address refundee)",
);

const INCENTIVE_KEY_ARRAY_TYPE = parseAbiParameters(
  "(address rewardToken, address pool, uint256 startTime, uint256 endTime, address refundee)[]",
);

export function useStakerActions(onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useAccount();

  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  const toKeyTuple = (key: IncentiveKey) => ({
    rewardToken: key.rewardToken,
    pool: key.pool,
    startTime: key.startTime,
    endTime: key.endTime,
    refundee: key.refundee,
  });

  // ─── Stake / Unstake ───

  const stakeToken = async (incentiveKey: IncentiveKey, tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: STAKER.snowballStaker,
      abi: SnowballStakerABI,
      functionName: "stakeToken",
      args: [toKeyTuple(incentiveKey), tokenId],
    });
    return waitAndCallback(hash);
  };

  const unstakeToken = async (incentiveKey: IncentiveKey, tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: STAKER.snowballStaker,
      abi: SnowballStakerABI,
      functionName: "unstakeToken",
      args: [toKeyTuple(incentiveKey), tokenId],
    });
    return waitAndCallback(hash);
  };

  // ─── Rewards ───

  const claimReward = async (
    rewardToken: Address,
    to: Address,
    amount: bigint,
  ) => {
    const hash = await writeContractAsync({
      address: STAKER.snowballStaker,
      abi: SnowballStakerABI,
      functionName: "claimReward",
      args: [rewardToken, to, amount],
    });
    return waitAndCallback(hash);
  };

  // ─── Fee Collection (Snowball addition) ───

  const collectFee = async (tokenId: bigint, recipient: Address) => {
    const hash = await writeContractAsync({
      address: STAKER.snowballStaker,
      abi: SnowballStakerABI,
      functionName: "collectFee",
      args: [tokenId, recipient],
    });
    return waitAndCallback(hash);
  };

  // ─── Withdraw NFT ───

  const withdrawToken = async (tokenId: bigint, to: Address) => {
    const hash = await writeContractAsync({
      address: STAKER.snowballStaker,
      abi: SnowballStakerABI,
      functionName: "withdrawToken",
      args: [tokenId, to, "0x"],
    });
    return waitAndCallback(hash);
  };

  // ─── Deposit & Stake (via safeTransferFrom) ───

  /**
   * Transfer LP NFT to the staker with encoded incentive key(s) as data.
   * The staker's onERC721Received will auto-stake into the provided incentive(s).
   *
   * For single incentive: abi.encode(IncentiveKey)
   * For multiple incentives: abi.encode(IncentiveKey[])
   */
  const depositAndStake = async (
    tokenId: bigint,
    incentiveKeys: IncentiveKey[],
  ) => {
    const keys = incentiveKeys.map(toKeyTuple);

    const encodedData =
      keys.length === 1
        ? encodeAbiParameters(INCENTIVE_KEY_TYPE, [keys[0]])
        : encodeAbiParameters(INCENTIVE_KEY_ARRAY_TYPE, [keys]);

    const hash = await writeContractAsync({
      address: DEX.nonfungiblePositionManager,
      abi: [
        {
          type: "function",
          name: "safeTransferFrom",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "data", type: "bytes" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const,
      functionName: "safeTransferFrom",
      args: [address!, STAKER.snowballStaker, tokenId, encodedData],
    });
    return waitAndCallback(hash);
  };

  return {
    stakeToken,
    unstakeToken,
    claimReward,
    collectFee,
    withdrawToken,
    depositAndStake,
    isPending,
  };
}
