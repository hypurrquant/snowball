import { createConfig, http } from 'wagmi'
import { creditcoinTestnet } from './chain'

export const wagmiConfig = createConfig({
    chains: [creditcoinTestnet],
    transports: {
        [creditcoinTestnet.id]: http('https://rpc.cc3-testnet.creditcoin.network'),
    },
})
