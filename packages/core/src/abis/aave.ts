// Aave V3 ABIs
// Sources: aave/aave-v3-core (Pool, AToken, DataProvider, Oracle)

export const AavePoolABI = [
  { type: "function", name: "supply", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "onBehalfOf", type: "address" }, { name: "referralCode", type: "uint16" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "to", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "borrow", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "interestRateMode", type: "uint256" }, { name: "referralCode", type: "uint16" }, { name: "onBehalfOf", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "repay", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }, { name: "interestRateMode", type: "uint256" }, { name: "onBehalfOf", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "getUserAccountData", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "totalCollateralBase", type: "uint256" }, { name: "totalDebtBase", type: "uint256" }, { name: "availableBorrowsBase", type: "uint256" }, { name: "currentLiquidationThreshold", type: "uint256" }, { name: "ltv", type: "uint256" }, { name: "healthFactor", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getReserveData", inputs: [{ name: "asset", type: "address" }], outputs: [{ name: "configuration", type: "uint256" }, { name: "liquidityIndex", type: "uint128" }, { name: "currentLiquidityRate", type: "uint128" }, { name: "variableBorrowIndex", type: "uint128" }, { name: "currentVariableBorrowRate", type: "uint128" }, { name: "currentStableBorrowRate", type: "uint128" }, { name: "lastUpdateTimestamp", type: "uint40" }, { name: "id", type: "uint16" }, { name: "aTokenAddress", type: "address" }, { name: "stableDebtTokenAddress", type: "address" }, { name: "variableDebtTokenAddress", type: "address" }, { name: "interestRateStrategyAddress", type: "address" }, { name: "accruedToTreasury", type: "uint128" }, { name: "unbacked", type: "uint128" }, { name: "isolationModeTotalDebt", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "getReservesList", inputs: [], outputs: [{ type: "address[]" }], stateMutability: "view" },
] as const;

export const AaveDataProviderABI = [
  { type: "function", name: "getReserveConfigurationData", inputs: [{ name: "asset", type: "address" }], outputs: [{ name: "decimals", type: "uint256" }, { name: "ltv", type: "uint256" }, { name: "liquidationThreshold", type: "uint256" }, { name: "liquidationBonus", type: "uint256" }, { name: "reserveFactor", type: "uint256" }, { name: "usageAsCollateralEnabled", type: "bool" }, { name: "borrowingEnabled", type: "bool" }, { name: "stableBorrowRateEnabled", type: "bool" }, { name: "isActive", type: "bool" }, { name: "isFrozen", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getUserReserveData", inputs: [{ name: "asset", type: "address" }, { name: "user", type: "address" }], outputs: [{ name: "currentATokenBalance", type: "uint256" }, { name: "currentStableDebt", type: "uint256" }, { name: "currentVariableDebt", type: "uint256" }, { name: "principalStableDebt", type: "uint256" }, { name: "scaledVariableDebt", type: "uint256" }, { name: "stableBorrowRate", type: "uint256" }, { name: "liquidityRate", type: "uint256" }, { name: "stableRateLastUpdated", type: "uint40" }, { name: "usageAsCollateralEnabled", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getReserveTokensAddresses", inputs: [{ name: "asset", type: "address" }], outputs: [{ name: "aTokenAddress", type: "address" }, { name: "stableDebtTokenAddress", type: "address" }, { name: "variableDebtTokenAddress", type: "address" }], stateMutability: "view" },
] as const;

export const AaveOracleABI = [
  { type: "function", name: "getAssetPrice", inputs: [{ name: "asset", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getAssetsPrices", inputs: [{ name: "assets", type: "address[]" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "BASE_CURRENCY_UNIT", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
