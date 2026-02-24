import { createPublicClient, http } from 'viem'
import { creditcoinTestnet } from './chain'

export const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http('https://rpc.cc3-testnet.creditcoin.network', {
    batch: true,
  }),
})
