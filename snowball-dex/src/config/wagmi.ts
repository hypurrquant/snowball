import { http, createConfig } from "wagmi";
import { creditcoinTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet],
  transports: {
    [creditcoinTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
