import { http, createConfig, createStorage, cookieStorage, mock, injected } from "wagmi";
import { creditcoinTestnet, sepoliaChain, uscTestnet } from "@/core/config/chain";
import { privateKeyToAccount } from "viem/accounts";
import type { Transport } from "viem";

/**
 * Creditcoin Substrate EVM rejects eth_call / eth_estimateGas when nonce
 * is included and doesn't match on-chain state. viem includes nonce in
 * these calls by default. This transport strips it before forwarding.
 */
function creditcoinHttp(url?: string): Transport {
  return (opts) => {
    const transport = http(url)(opts);
    return {
      ...transport,
      async request({ method, params }: { method: string; params?: unknown }) {
        if (
          (method === "eth_call" || method === "eth_estimateGas") &&
          Array.isArray(params) &&
          params[0] &&
          typeof params[0] === "object" &&
          "nonce" in params[0]
        ) {
          const { nonce, ...clean } = params[0] as Record<string, unknown>;
          return transport.request({ method, params: [clean, ...params.slice(1)] });
        }
        return transport.request({ method, params });
      },
    };
  };
}

export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet, sepoliaChain, uscTestnet],
  connectors: [injected()],
  transports: {
    [creditcoinTestnet.id]: creditcoinHttp(),
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
