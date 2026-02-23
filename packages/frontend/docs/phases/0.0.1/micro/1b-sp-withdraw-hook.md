# Ticket 1b: Create useSPWithdraw hook

**Phase:** 1 (SP Transactions)
**Depends on:** 0b
**Blocks:** 1d

## Task

Create `src/hooks/useSPWithdraw.ts` — direct contract call for StabilityPool.withdrawFromSP(amount).

## File: `src/hooks/useSPWithdraw.ts` (NEW)

### Interface
```typescript
function useSPWithdraw(): {
  withdraw: (params: { branch: 0 | 1; amount: bigint }) => Promise<Hash>
  isPending: boolean
  isConfirmed: boolean
  txHash: Hash | undefined
  error: Error | null
}
```

### Contract Call
```
StabilityPool[branch].withdrawFromSP(amount)   // 1 arg
```

## Acceptance Criteria
- [ ] Hook compiles
- [ ] `pnpm build` passes
