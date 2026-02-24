# Ticket 2e: Migrate CloseTroveModal to useCloseTrove

**Phase:** 2 (Trove Transactions)
**Depends on:** 2a

## Task

Replace `useAgentExecute` with `useCloseTrove` in `CloseTroveModal.tsx`.

### Remove
- `import { useAgentExecute } from '@/hooks/useAgentExecute'`
- `useSendTransaction()` hook
- `agentExecute.mutateAsync()` call
- `sendTransactionAsync()` call
- `building` step

### Add
- `import { useCloseTrove } from '@/hooks/useCloseTrove'`
- Direct `closeTrove({ branch, troveId })` call

## Acceptance Criteria
- [ ] No `useAgentExecute` or `useSendTransaction` imports
- [ ] `pnpm build` passes
