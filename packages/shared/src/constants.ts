import { defineChain } from "viem";

// ==================== Network ====================

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  testnet: true,
});

export const CHAIN_ID = 102031;
export const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
export const EXPLORER_URL = "https://creditcoin-testnet.blockscout.com";

// ==================== Liquity Protocol Constants ====================

export const DECIMAL_PRECISION = 10n ** 18n;
export const _100PCT = 10n ** 18n;

// Branch 0: wCTC
export const WCTC_MCR = (110n * DECIMAL_PRECISION) / 100n; // 1.1e18
export const WCTC_CCR = (150n * DECIMAL_PRECISION) / 100n; // 1.5e18

// Branch 1: lstCTC
export const LSTCTC_MCR = (120n * DECIMAL_PRECISION) / 100n; // 1.2e18
export const LSTCTC_CCR = (160n * DECIMAL_PRECISION) / 100n; // 1.6e18

// Interest rate bounds
export const MIN_ANNUAL_INTEREST_RATE = (5n * DECIMAL_PRECISION) / 1000n; // 0.5%
export const MAX_ANNUAL_INTEREST_RATE = (25n * DECIMAL_PRECISION) / 100n; // 25%

// Min debt
export const MIN_DEBT = 200n * DECIMAL_PRECISION; // 200 sbUSD

// Gas compensation
export const GAS_COMPENSATION = 200n * DECIMAL_PRECISION; // 200 sbUSD
