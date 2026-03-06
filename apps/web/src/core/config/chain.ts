import { defineChain } from "viem";

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: {
    name: "Creditcoin",
    symbol: "tCTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.cc3-testnet.creditcoin.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xa943BE162b5036539017Ce9fcdF7295D41De80c1",
      blockCreated: 4382268,
    },
  },
  testnet: true,
});
