// Liquity v2 ABIs (Borrow & Earn)

export const BorrowerOperationsABI = [
  { type: "function", name: "openTrove", inputs: [{ name: "owner", type: "address" }, { name: "ownerIndex", type: "uint256" }, { name: "collAmount", type: "uint256" }, { name: "boldAmount", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }, { name: "addManager", type: "address" }, { name: "removeManager", type: "address" }, { name: "receiver", type: "address" }], outputs: [{ name: "troveId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "adjustTrove", inputs: [{ name: "troveId", type: "uint256" }, { name: "collChange", type: "uint256" }, { name: "isCollIncrease", type: "bool" }, { name: "debtChange", type: "uint256" }, { name: "isDebtIncrease", type: "bool" }, { name: "maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "closeTrove", inputs: [{ name: "troveId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "adjustTroveInterestRate", inputs: [{ name: "troveId", type: "uint256" }, { name: "newAnnualInterestRate", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "CCR", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MCR", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const TroveManagerABI = [
  { type: "function", name: "getTroveAnnualInterestRate", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveStatus", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "getEntireBranchColl", inputs: [], outputs: [{ name: "entireSystemColl", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getEntireBranchDebt", inputs: [], outputs: [{ name: "entireSystemDebt", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ name: "trove", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistBoldDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getCurrentICR", inputs: [{ name: "troveId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveIdsCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveFromTroveIdsArray", inputs: [{ name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const StabilityPoolABI = [
  { type: "function", name: "provideToSP", inputs: [{ name: "amount", type: "uint256" }, { name: "doClaim", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawFromSP", inputs: [{ name: "amount", type: "uint256" }, { name: "doClaim", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimAllCollGains", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getCompoundedBoldDeposit", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDepositorCollGain", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTotalBoldDeposits", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDepositorYieldGain", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDepositorYieldGainWithPending", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const TroveNFTABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ownerOf", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

export const MockPriceFeedABI = [
  { type: "function", name: "lastGoodPrice", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "fetchPrice", inputs: [], outputs: [{ name: "price", type: "uint256" }, { name: "isFresh", type: "bool" }], stateMutability: "nonpayable" },
] as const;

export const ActivePoolABI = [
  { type: "function", name: "getCollBalance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getBoldDebt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const HintHelpersABI = [
  { type: "function", name: "getApproxHint", inputs: [{ name: "branchIdx", type: "uint256" }, { name: "interestRate", type: "uint256" }, { name: "numTrials", type: "uint256" }, { name: "inputRandomSeed", type: "uint256" }], outputs: [{ name: "hintAddress", type: "uint256" }, { name: "diff", type: "uint256" }, { name: "latestRandomSeed", type: "uint256" }], stateMutability: "view" },
] as const;

export const SortedTrovesABI = [
  { type: "function", name: "findInsertPosition", inputs: [{ name: "annualInterestRate", type: "uint256" }, { name: "prevId", type: "uint256" }, { name: "nextId", type: "uint256" }], outputs: [{ name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getSize", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

// AddRemoveManagers (delegation)
export const AddRemoveManagersABI = [
  { type: "function", name: "setAddManager", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_manager", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setRemoveManagerWithReceiver", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_manager", type: "address" }, { name: "_receiver", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "addManagerOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

// BorrowerOperations — interest delegate
export const InterestDelegateABI = [
  { type: "function", name: "setInterestIndividualDelegate", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_delegate", type: "address" }, { name: "_minInterestRate", type: "uint128" }, { name: "_maxInterestRate", type: "uint128" }, { name: "_newAnnualInterestRate", type: "uint256" }, { name: "_upperHint", type: "uint256" }, { name: "_lowerHint", type: "uint256" }, { name: "_maxUpfrontFee", type: "uint256" }, { name: "_minInterestRateChangePeriod", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "removeInterestIndividualDelegate", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "account", type: "address" }, { name: "minInterestRate", type: "uint128" }, { name: "maxInterestRate", type: "uint128" }, { name: "minInterestRateChangePeriod", type: "uint256" }] }], stateMutability: "view" },
] as const;

export const MultiTroveGetterABI = [
  { type: "function", name: "getMultipleSortedTroves", inputs: [{ name: "_collIndex", type: "uint256" }, { name: "_startIdx", type: "int256" }, { name: "_count", type: "uint256" }], outputs: [{ name: "_troves", type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistBoldDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }, { name: "stake", type: "uint256" }, { name: "lastDebtUpdateTime", type: "uint256" }, { name: "interestBatchManager", type: "address" }, { name: "batchDebtShares", type: "uint256" }, { name: "snapshotETH", type: "uint256" }, { name: "snapshotBoldDebt", type: "uint256" }] }], stateMutability: "view" },
] as const;
