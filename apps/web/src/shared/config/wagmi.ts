import { http, createConfig, createStorage, cookieStorage, mock, injected } from "wagmi";
import { creditcoinTestnet, sepoliaChain, uscTestnet } from "@/core/config/chain";
import { privateKeyToAccount } from "viem/accounts";

export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet, sepoliaChain, uscTestnet],
  connectors: [injected()],
  transports: {
    [creditcoinTestnet.id]: http(),
    [sepoliaChain.id]: http("https://1rpc.io/sepolia"),
    [uscTestnet.id]: http("https://rpc.usc-testnet2.creditcoin.network"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

// Anvil default test account #0
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export function createTestWagmiConfig() {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  return createConfig({
    chains: [creditcoinTestnet],
    connectors: [
      mock({
        accounts: [account.address],
      }),
    ],
    transports: {
      [creditcoinTestnet.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
