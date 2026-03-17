import type { Address } from "viem";

export interface StakerIncentive {
  id: `0x${string}`;
  rewardToken: Address;
  pool: Address;
  startTime: bigint;
  endTime: bigint;
  refundee: Address;
  totalRewardUnclaimed: bigint;
  totalSecondsClaimedX128: bigint;
  numberOfStakes: number;
}

export interface StakerDeposit {
  tokenId: bigint;
  owner: Address;
  numberOfStakes: number;
  tickLower: number;
  tickUpper: number;
}

export interface StakerRewardInfo {
  reward: bigint;
  secondsInsideX128: bigint;
}

export interface IncentiveKey {
  rewardToken: Address;
  pool: Address;
  startTime: bigint;
  endTime: bigint;
  refundee: Address;
}
