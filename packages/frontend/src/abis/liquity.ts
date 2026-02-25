// Liquity v2 ABIs (Borrow & Earn)

export const BorrowerOperationsABI = [
  { type: "function", name: "openTrove", inputs: [{ name: "owner", type: "address" }, { name: "ownerIndex", type: "uint256" }, { name: "collAmount", type: "uint256" }, { name: "boldAmount", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }, { name: "addManager", type: "address" }, { name: "removeManager", type: "address" }, { name: "receiver", type: "address" }], outputs: [{ name: "troveId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "adjustTrove", inputs: [{ name: "troveId", type: "uint256" }, { name: "collChange", type: "uint256" }, { name: "isCollIncrease", type: "bool" }, { name: "debtChange", type: "uint256" }, { name: "isDebtIncrease", type: "bool" }, { name: "maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "closeTrove", inputs: [{ name: "troveId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "adjustTroveInterestRate", inputs: [{ name: "troveId", type: "uint256" }, { name: "newAnnualInterestRate", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "MIN_ANNUAL_INTEREST_RATE", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MAX_ANNUAL_INTEREST_RATE", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "CCR", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MCR", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const TroveManagerABI = [
  { type: "function", name: "getTroveEntireColl", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveEntireDebt", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveAnnualInterestRate", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveStatus", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getEntireSystemColl", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getEntireSystemDebt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTCR", inputs: [{ name: "price", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const StabilityPoolABI = [
  { type: "function", name: "provideToSP", inputs: [{ name: "amount", type: "uint256" }, { name: "doClaim", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawFromSP", inputs: [{ name: "amount", type: "uint256" }, { name: "doClaim", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimAllCollGains", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getCompoundedBoldDeposit", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDepositorCollGain", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTotalBoldDeposits", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const TroveNFTABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const MockPriceFeedABI = [
  { type: "function", name: "getPrice", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "fetchPrice", inputs: [], outputs: [{ name: "price", type: "uint256" }, { name: "isFresh", type: "bool" }], stateMutability: "view" },
] as const;

export const ActivePoolABI = [
  { type: "function", name: "getCollBalance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getBoldDebt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
