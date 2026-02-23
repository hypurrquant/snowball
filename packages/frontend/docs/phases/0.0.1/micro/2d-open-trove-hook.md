# Ticket 2d: Create useOpenTrove hook

**Phase:** 2 (Trove Transactions)
**Depends on:** 0b
**Blocks:** 2h

## Task

Create `src/hooks/useOpenTrove.ts`.

## Contract Call
```
BorrowerOperations[branch].openTrove(
  owner, 0n, collAmount, debtAmount, 0n, 0n, interestRate, maxUpfrontFee
)
```

## Acceptance Criteria
- [ ] Hook compiles, `pnpm build` passes
