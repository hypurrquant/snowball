# Ticket 2a: Create useCloseTrove hook

**Phase:** 2 (Trove Transactions)
**Depends on:** 0b
**Blocks:** 2e

## Task

Create `src/hooks/useCloseTrove.ts`.

## Contract Call
```
BorrowerOperations[branch].closeTrove(troveId)   // 1 arg
```

## Acceptance Criteria
- [ ] Hook compiles, `pnpm build` passes
