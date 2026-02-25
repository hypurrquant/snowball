// Options Protocol ABIs

export const OptionsClearingHouseABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdraw", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "escrowOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const OptionsVaultABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "requestWithdraw", inputs: [{ name: "shares", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "executeWithdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "sharesOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalDeposited", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalShares", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const SnowballOptionsABI = [
  { type: "function", name: "currentRound", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rounds", inputs: [{ name: "roundId", type: "uint256" }], outputs: [{ name: "startPrice", type: "uint256" }, { name: "endPrice", type: "uint256" }, { name: "startTime", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "totalOverAmount", type: "uint256" }, { name: "totalUnderAmount", type: "uint256" }, { name: "status", type: "uint8" }, { name: "totalOrders", type: "uint256" }, { name: "settledOrders", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "commissionFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "RoundStarted", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "startPrice", type: "uint256" }, { name: "duration", type: "uint256" }] },
  { type: "event", name: "RoundExecuted", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "endPrice", type: "uint256" }] },
  { type: "event", name: "OrderSettled", inputs: [{ name: "roundId", type: "uint256", indexed: true }, { name: "user", type: "address", indexed: true }, { name: "isOver", type: "bool" }, { name: "amount", type: "uint256" }, { name: "payout", type: "uint256" }] },
] as const;

export const BTCMockOracleABI = [
  { type: "function", name: "price", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lastUpdated", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "fetchPrice", inputs: [], outputs: [{ name: "price_", type: "uint256" }, { name: "isFresh", type: "bool" }], stateMutability: "view" },
] as const;
