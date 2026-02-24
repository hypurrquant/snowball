import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/config/wagmi'
import { creditcoinTestnet } from '@/config/chain'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 10_000,
        },
    },
})

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'placeholder-app-id'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PrivyProvider
            appId={PRIVY_APP_ID}
            config={{
                appearance: {
                    theme: 'dark',
                    accentColor: '#60a5fa',
                },
                loginMethods: ['email', 'wallet', 'google'],
                defaultChain: creditcoinTestnet,
                supportedChains: [creditcoinTestnet],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    <App />
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    </React.StrictMode>
)
