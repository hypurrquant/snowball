# Ticket 2h: Migrate Borrow.tsx to useOpenTrove

**Phase:** 2 (Trove Transactions)
**Depends on:** 2d

## Task

Replace `useAgentExecute` with `useOpenTrove` in `Borrow.tsx`.

### Remove
- `import { useAgentExecute } from '@/hooks/useAgentExecute'`
- `useSendTransaction()` hook
- `agentExecute.mutateAsync()` call
- `sendTransactionAsync()` call
- `building` step

### Add
- `import { useOpenTrove } from '@/hooks/useOpenTrove'`
- Direct `openTrove(params)` call after approve

## Acceptance Criteria
- [ ] No `useAgentExecute` or `useSendTransaction`
- [ ] Open trove flow: approve → sign → confirm
- [ ] `pnpm build` passes
