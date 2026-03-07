// Minimal ABI subsets for agent-runtime
// Source: deployed contracts on Creditcoin Testnet

export const AgentVaultABI = [
  { type: "function", name: "getBalance", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPermission", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "tokens", type: "address[]" }], outputs: [{ name: "", type: "tuple", components: [{ name: "allowedTargets", type: "address[]" }, { name: "allowedFunctions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "active", type: "bool" }, { name: "tokenAllowances", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }] }] }], stateMutability: "view" },
  { type: "function", name: "getTokenAllowance", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPermNonce", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approveAndExecute", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bytes" }], stateMutability: "nonpayable" },
  { type: "function", name: "executeOnBehalf", inputs: [{ name: "user", type: "address" }, { name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bytes" }], stateMutability: "nonpayable" },
  { type: "function", name: "getDelegatedUsers", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "event", name: "ExecutedOnBehalf", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "target", type: "address", indexed: false }, { name: "selector", type: "bytes4", indexed: false }, { name: "value", type: "uint256", indexed: false }] },
  { type: "event", name: "ApprovedAndExecuted", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "token", type: "address", indexed: false }, { name: "amount", type: "uint256", indexed: false }, { name: "target", type: "address", indexed: false }, { name: "selector", type: "bytes4", indexed: false }] },
] as const;

export const MorphoABI = [
  { type: "function", name: "supply", inputs: [{ name: "marketParams", type: "tuple", components: [{ name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" }, { name: "oracle", type: "address" }, { name: "irm", type: "address" }, { name: "lltv", type: "uint256" }] }, { name: "assets", type: "uint256" }, { name: "shares", type: "uint256" }, { name: "onBehalf", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ name: "assetsSupplied", type: "uint256" }, { name: "sharesSupplied", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "marketParams", type: "tuple", components: [{ name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" }, { name: "oracle", type: "address" }, { name: "irm", type: "address" }, { name: "lltv", type: "uint256" }] }, { name: "assets", type: "uint256" }, { name: "shares", type: "uint256" }, { name: "onBehalf", type: "address" }, { name: "receiver", type: "address" }], outputs: [{ name: "assetsWithdrawn", type: "uint256" }, { name: "sharesWithdrawn", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "position", inputs: [{ name: "id", type: "bytes32" }, { name: "user", type: "address" }], outputs: [{ name: "supplyShares", type: "uint256" }, { name: "borrowShares", type: "uint128" }, { name: "collateral", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "market", inputs: [{ name: "id", type: "bytes32" }], outputs: [{ name: "totalSupplyAssets", type: "uint128" }, { name: "totalSupplyShares", type: "uint128" }, { name: "totalBorrowAssets", type: "uint128" }, { name: "totalBorrowShares", type: "uint128" }, { name: "lastUpdate", type: "uint128" }, { name: "fee", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "isAuthorized", inputs: [{ name: "authorizer", type: "address" }, { name: "authorized", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "setAuthorization", inputs: [{ name: "authorized", type: "address" }, { name: "newIsAuthorized", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const BorrowerOperationsABI = [
  { type: "function", name: "adjustTroveInterestRate", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_newAnnualInterestRate", type: "uint256" }, { name: "_upperHint", type: "uint256" }, { name: "_lowerHint", type: "uint256" }, { name: "_maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "addColl", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_collAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const TroveManagerABI = [
  { type: "function", name: "getTroveIdsCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveFromTroveIdsArray", inputs: [{ name: "_index", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getTroveStatus", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

export const SortedTrovesABI = [
  { type: "function", name: "getSize", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "findInsertPosition", inputs: [{ name: "_annualInterestRate", type: "uint256" }, { name: "_prevId", type: "uint256" }, { name: "_nextId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }], stateMutability: "view" },
] as const;

export const HintHelpersABI = [
  { type: "function", name: "getApproxHint", inputs: [{ name: "_branchIdx", type: "uint256" }, { name: "_interestRate", type: "uint256" }, { name: "_numTrials", type: "uint256" }, { name: "_inputRandomSeed", type: "uint256" }], outputs: [{ name: "hintId", type: "uint256" }, { name: "diff", type: "uint256" }, { name: "latestRandomSeed", type: "uint256" }], stateMutability: "view" },
] as const;

export const ActivePoolABI = [
  { type: "function", name: "aggWeightedDebtSum", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "aggRecordedDebt", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

export const ERC20ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

export const TroveNFTABI = [
  { type: "function", name: "ownerOf", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

export const AddRemoveManagersABI = [
  { type: "function", name: "addManagerOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;
