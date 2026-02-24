# Ticket 1a: Create useSPClaim hook

**Phase:** 1 (SP Transactions)
**Depends on:** 0b
**Blocks:** 1d

## Task

Create `src/hooks/useSPClaim.ts` — direct contract call for StabilityPool.claimReward().

## File: `src/hooks/useSPClaim.ts` (NEW)

### Interface
```typescript
function useSPClaim(): {
  claim: (params: { branch: 0 | 1 }) => Promise<Hash>
  isPending: boolean
  isConfirmed: boolean
  txHash: Hash | undefined
  error: Error | null
}
```

### Contract Call
```
StabilityPool[branch].claimReward()   // 0 args
```

## Acceptance Criteria
- [ ] Hook compiles with correct types
- [ ] Uses `getBranchAddresses(branch).stabilityPool` for address
- [ ] Uses `abis.stabilityPool` for ABI
- [ ] `pnpm build` passes
