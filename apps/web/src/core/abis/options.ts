// Options Protocol ABIs

export const OptionsClearingHouseABI = [
  { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdraw", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "escrowOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const OptionsVaultABI = [
  { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "requestWithdraw", inputs: [{ name: "shares", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "executeWithdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "sharesOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalDeposited", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalShares", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "pendingWithdrawShares", inputs: [{ name: "lp", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "withdrawUnlockTime", inputs: [{ name: "lp", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "availableLiquidity", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const SnowballOptionsABI = [
  { type: "function", name: "currentRoundId", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getRound", inputs: [{ name: "roundId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "roundId", type: "uint256" }, { name: "lockPrice", type: "uint256" }, { name: "closePrice", type: "uint256" }, { name: "lockTimestamp", type: "uint256" }, { name: "closeTimestamp", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "status", type: "uint8" }, { name: "totalOverAmount", type: "uint256" }, { name: "totalUnderAmount", type: "uint256" }, { name: "orderCount", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getOrder", inputs: [{ name: "roundId", type: "uint256" }, { name: "orderId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "overUser", type: "address" }, { name: "underUser", type: "address" }, { name: "amount", type: "uint256" }, { name: "settled", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "commissionFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "event", name: "RoundStarted", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "lockPrice", type: "uint256", indexed: false }, { name: "lockTimestamp", type: "uint256", indexed: false }, { name: "duration", type: "uint256", indexed: false }] },
  { type: "event", name: "RoundExecuted", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "closePrice", type: "uint256", indexed: false }] },
  { type: "event", name: "OrderSettled", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "orderId", type: "uint256", indexed: true }, { name: "winner", type: "address", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
] as const;

export const BTCMockOracleABI = [
  { type: "function", name: "price", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lastUpdated", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "fetchPrice", inputs: [], outputs: [{ name: "price_", type: "uint256" }, { name: "isFresh", type: "bool" }], stateMutability: "view" },
] as const;

export const OptionsRelayerABI = [
  { type: "function", name: "DOMAIN_SEPARATOR", inputs: [], outputs: [{ type: "bytes32" }], stateMutability: "view" },
  { type: "function", name: "nonces", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ORDER_TYPEHASH", inputs: [], outputs: [{ type: "bytes32" }], stateMutability: "view" },
] as const;
