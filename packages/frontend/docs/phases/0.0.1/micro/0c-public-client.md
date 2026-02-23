# Ticket 0c: Create shared PublicClient

**Phase:** 0 (Infrastructure)
**Depends on:** 0a
**Blocks:** 0d, 3a-3e

## Task

Create `src/config/publicClient.ts` — shared viem PublicClient with batch transport.

## File: `src/config/publicClient.ts` (NEW)

### Exports
- `publicClient` — singleton `PublicClient` instance

### Implementation
```typescript
import { createPublicClient, http } from 'viem'
import { creditcoinTestnet } from './chain'

export const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http('https://rpc.cc3-testnet.creditcoin.network', {
    batch: true,
  }),
})
```

## Acceptance Criteria
- [ ] `publicClient.readContract()` works
- [ ] Batch transport enabled (multiple reads in same tick → single RPC call)
- [ ] `pnpm build` passes
