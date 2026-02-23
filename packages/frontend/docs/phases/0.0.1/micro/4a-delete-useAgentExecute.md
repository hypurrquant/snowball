# Ticket 4a: Delete useAgentExecute.ts

**Phase:** 4 (Cleanup)
**Depends on:** 2e, 2g, 2h (all consumers migrated)

## Task

Delete `src/hooks/useAgentExecute.ts`. All 3 consumers (Borrow.tsx, AdjustTroveModal.tsx, CloseTroveModal.tsx) have been migrated.

## Verification
```bash
grep -r "useAgentExecute" src/    # should return 0 results
grep -r "UnsignedTx" src/         # should return 0 results (type was also exported)
```

## Acceptance Criteria
- [ ] File deleted
- [ ] No remaining imports of `useAgentExecute` or `UnsignedTx` from this file
- [ ] `pnpm build` passes
