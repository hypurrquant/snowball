# Ticket 2b: Create useAdjustInterestRate hook

**Phase:** 2 (Trove Transactions)
**Depends on:** 0b
**Blocks:** 2f

## Task

Create `src/hooks/useAdjustInterestRate.ts`.

## Contract Call
```
BorrowerOperations[branch].adjustTroveInterestRate(troveId, newRate, 0n, 0n, maxUpfrontFee)
```

## Acceptance Criteria
- [ ] Hook compiles, `pnpm build` passes
