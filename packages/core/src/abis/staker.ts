// SnowballStaker (LP Incentives) ABI
// Source: packages/staker/src/SnowballStaker.sol

export const SnowballStakerABI = [
  // ─── Incentive Management ───
  { type: "function", name: "createIncentive", inputs: [{ name: "key", type: "tuple", components: [{ name: "rewardToken", type: "address" }, { name: "pool", type: "address" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "refundee", type: "address" }] }, { name: "reward", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "endIncentive", inputs: [{ name: "key", type: "tuple", components: [{ name: "rewardToken", type: "address" }, { name: "pool", type: "address" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "refundee", type: "address" }] }], outputs: [{ name: "refund", type: "uint256" }], stateMutability: "nonpayable" },

  // ─── Stake / Unstake ───
  { type: "function", name: "stakeToken", inputs: [{ name: "key", type: "tuple", components: [{ name: "rewardToken", type: "address" }, { name: "pool", type: "address" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "refundee", type: "address" }] }, { name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unstakeToken", inputs: [{ name: "key", type: "tuple", components: [{ name: "rewardToken", type: "address" }, { name: "pool", type: "address" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "refundee", type: "address" }] }, { name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },

  // ─── Rewards ───
  { type: "function", name: "claimReward", inputs: [{ name: "rewardToken", type: "address" }, { name: "to", type: "address" }, { name: "amountRequested", type: "uint256" }], outputs: [{ name: "reward", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "getRewardInfo", inputs: [{ name: "key", type: "tuple", components: [{ name: "rewardToken", type: "address" }, { name: "pool", type: "address" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "refundee", type: "address" }] }, { name: "tokenId", type: "uint256" }], outputs: [{ name: "reward", type: "uint256" }, { name: "secondsInsideX128", type: "uint160" }], stateMutability: "view" },

  // ─── Fee Collection (Snowball addition) ───
  { type: "function", name: "collectFee", inputs: [{ name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "nonpayable" },

  // ─── Deposit / Withdraw ───
  { type: "function", name: "withdrawToken", inputs: [{ name: "tokenId", type: "uint256" }, { name: "to", type: "address" }, { name: "data", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transferDeposit", inputs: [{ name: "tokenId", type: "uint256" }, { name: "to", type: "address" }], outputs: [], stateMutability: "nonpayable" },

  // ─── View Functions ───
  { type: "function", name: "deposits", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "owner", type: "address" }, { name: "numberOfStakes", type: "uint48" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }], stateMutability: "view" },
  { type: "function", name: "stakes", inputs: [{ name: "tokenId", type: "uint256" }, { name: "incentiveId", type: "bytes32" }], outputs: [{ name: "secondsPerLiquidityInsideInitialX128", type: "uint160" }, { name: "liquidity", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "rewards", inputs: [{ name: "rewardToken", type: "address" }, { name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "incentives", inputs: [{ name: "incentiveId", type: "bytes32" }], outputs: [{ name: "totalRewardUnclaimed", type: "uint256" }, { name: "totalSecondsClaimedX128", type: "uint160" }, { name: "numberOfStakes", type: "uint96" }], stateMutability: "view" },
  { type: "function", name: "factory", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "nonfungiblePositionManager", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },

  // ─── Events ───
  { type: "event", name: "IncentiveCreated", inputs: [{ name: "rewardToken", type: "address", indexed: true }, { name: "pool", type: "address", indexed: true }, { name: "startTime", type: "uint256", indexed: false }, { name: "endTime", type: "uint256", indexed: false }, { name: "refundee", type: "address", indexed: false }, { name: "reward", type: "uint256", indexed: false }] },
  { type: "event", name: "IncentiveEnded", inputs: [{ name: "incentiveId", type: "bytes32", indexed: true }, { name: "refund", type: "uint256", indexed: false }] },
  { type: "event", name: "DepositTransferred", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "oldOwner", type: "address", indexed: true }, { name: "newOwner", type: "address", indexed: true }] },
  { type: "event", name: "TokenStaked", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "incentiveId", type: "bytes32", indexed: true }, { name: "liquidity", type: "uint128", indexed: false }] },
  { type: "event", name: "TokenUnstaked", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "incentiveId", type: "bytes32", indexed: true }] },
  { type: "event", name: "RewardClaimed", inputs: [{ name: "to", type: "address", indexed: true }, { name: "reward", type: "uint256", indexed: false }] },
  { type: "event", name: "FeeCollected", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "recipient", type: "address", indexed: false }, { name: "amount0", type: "uint256", indexed: false }, { name: "amount1", type: "uint256", indexed: false }] },
] as const;
