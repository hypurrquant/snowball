import addresses from "./addresses.json";

export type AddressString = `0x${string}`;

// Core contract addresses
export const CONTRACTS = {
  snowballFactory: addresses.core.snowballFactory as AddressString,
  snowballPoolDeployer: addresses.core.snowballPoolDeployer as AddressString,
  snowballRouter: addresses.core.snowballRouter as AddressString,
  dynamicFeePlugin: addresses.core.dynamicFeePlugin as AddressString,
  nonfungiblePositionManager:
    addresses.core.nonfungiblePositionManager as AddressString,
  quoterV2: addresses.core.quoterV2 as AddressString,
} as const;

// Mock token addresses (testnet)
export const TOKENS = {
  sbUSD: addresses.mockTokens.sbUSD as AddressString,
  wCTC: addresses.mockTokens.wCTC as AddressString,
  lstCTC: addresses.mockTokens.lstCTC as AddressString,
  USDC: addresses.mockTokens.USDC as AddressString,
} as const;

// Pool addresses
export const POOLS = {
  sbUSD_USDC: addresses.pools.sbUSD_USDC as AddressString,
  wCTC_sbUSD: addresses.pools.wCTC_sbUSD as AddressString,
  wCTC_USDC: addresses.pools.wCTC_USDC as AddressString,
  lstCTC_wCTC: addresses.pools.lstCTC_wCTC as AddressString,
} as const;

export { addresses };
