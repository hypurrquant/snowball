import { defineChain } from "viem";
import { sepolia } from "viem/chains";

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

export const sepoliaChain = sepolia;

export const uscTestnet = defineChain({
  id: 102036,
  name: "USC Testnet",
  nativeCurrency: {
    name: "Creditcoin",
    symbol: "tCTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.usc-testnet2.creditcoin.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "USC Explorer",
      url: "https://explorer.usc-testnet2.creditcoin.network",
    },
  },
  testnet: true,
});

export const CHAIN_EXPLORERS: Record<number, string> = {
  [creditcoinTestnet.id]: "https://creditcoin-testnet.blockscout.com",
  [sepoliaChain.id]: "https://sepolia.etherscan.io",
  [uscTestnet.id]: "https://explorer.usc-testnet2.creditcoin.network",
};
