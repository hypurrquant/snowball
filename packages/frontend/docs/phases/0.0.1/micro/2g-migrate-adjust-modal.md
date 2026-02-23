# Ticket 2g: Migrate AdjustTroveModal to useAdjustTrove

**Phase:** 2 (Trove Transactions)
**Depends on:** 2c

## Task

Replace `useAgentExecute` with `useAdjustTrove` in `AdjustTroveModal.tsx`.

### Remove
- `import { useAgentExecute } from '@/hooks/useAgentExecute'`
- `useSendTransaction()` hook
- `agentExecute.mutateAsync()` call
- `sendTransactionAsync()` call

### Add
- `import { useAdjustTrove } from '@/hooks/useAdjustTrove'`
- Direct `adjustTrove(params)` call

## Acceptance Criteria
- [ ] No `useAgentExecute` or `useSendTransaction`
- [ ] All 4 tabs (addColl, withdrawColl, addDebt, repayDebt) wire correctly
- [ ] `pnpm build` passes
