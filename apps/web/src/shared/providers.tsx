"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount, useSwitchChain } from "wagmi";
import { useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { wagmiConfig } from "@/shared/config/wagmi";
import { creditcoinTestnet } from "@/core/config/chain";

function AutoChainSwitch() {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/bridge")) return;
    if (isConnected && chainId && chainId !== creditcoinTestnet.id) {
      switchChain({ chainId: creditcoinTestnet.id });
    }
  }, [isConnected, chainId, switchChain, pathname]);

  return null;
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

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AutoChainSwitch />
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
