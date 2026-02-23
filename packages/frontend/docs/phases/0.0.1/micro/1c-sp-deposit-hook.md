# Ticket 1c: Create useSPDeposit hook

**Phase:** 1 (SP Transactions)
**Depends on:** 0b
**Blocks:** 1d

## Task

Create `src/hooks/useSPDeposit.ts` — direct contract call for StabilityPool.provideToSP(amount).

## File: `src/hooks/useSPDeposit.ts` (NEW)

### Interface
```typescript
function useSPDeposit(): {
  deposit: (params: { branch: 0 | 1; amount: bigint }) => Promise<Hash>
  isPending: boolean
  isConfirmed: boolean
  txHash: Hash | undefined
  error: Error | null
}
```

### Contract Call
```
StabilityPool[branch].provideToSP(amount)   // 1 arg
```

## Acceptance Criteria
- [ ] Hook compiles
- [ ] `pnpm build` passes
