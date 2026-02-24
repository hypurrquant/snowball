# Ticket 2c: Create useAdjustTrove hook

**Phase:** 2 (Trove Transactions)
**Depends on:** 0b
**Blocks:** 2g

## Task

Create `src/hooks/useAdjustTrove.ts`.

## Contract Call
```
BorrowerOperations[branch].adjustTrove(
  troveId, collChange, isCollIncrease, debtChange, isDebtIncrease, 0n, 0n, maxUpfrontFee
)
```

## Acceptance Criteria
- [ ] Hook compiles, `pnpm build` passes
