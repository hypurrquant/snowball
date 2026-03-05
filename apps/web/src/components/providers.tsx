"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { wagmiConfig, createTestWagmiConfig } from "@/config/wagmi";
import { creditcoinTestnet } from "@/config/chain";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
export const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

/** Minimal context so components can call login/logout without Privy in test mode */
export const TestModeContext = createContext(false);
export const useIsTestMode = () => useContext(TestModeContext);

function TestProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  const [testConfig] = useState(() => createTestWagmiConfig());

  useEffect(() => {
    // Expose for Playwright to trigger connect
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__testWagmiConfig = testConfig;
  }, [testConfig]);

  return (
    <TestModeContext.Provider value={true}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={testConfig as typeof wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </TestModeContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 10_000,
          },
        },
      })
  );

  if (IS_TEST_MODE) {
    return (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#60a5fa",
        },
        loginMethods: ["email", "wallet", "google"],
        defaultChain: creditcoinTestnet,
        supportedChains: [creditcoinTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
