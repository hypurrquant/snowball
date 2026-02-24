# Ticket 1d: Migrate Earn.tsx to use SP hooks

**Phase:** 1 (SP Transactions)
**Depends on:** 1a, 1b, 1c

## Task

Replace all 3 `fetch()` calls in `src/pages/Earn.tsx` with the new SP hooks.

## File: `src/pages/Earn.tsx` (MODIFY)

### Remove
- `import { API_BASE } from '@/config/api'`
- `import type { UnsignedTx } from '@/hooks/useAgentExecute'`
- `useSendTransaction()` hook call
- All 3 `fetch()` blocks (deposit: L77-97, withdraw: L103-123, claim: L127-146)
- `building` from Step type

### Add
- `import { useSPDeposit } from '@/hooks/useSPDeposit'`
- `import { useSPWithdraw } from '@/hooks/useSPWithdraw'`
- `import { useSPClaim } from '@/hooks/useSPClaim'`

### Step type change
```
Before: 'idle' | 'approving' | 'building' | 'signing' | 'confirming' | 'done'
After:  'idle' | 'approving' | 'signing' | 'confirming' | 'done'
```

### handleAction rewrite
- Deposit: approve → `deposit({ branch, amount })` → confirming
- Withdraw: `withdraw({ branch, amount })` → confirming
- Claim: `claim({ branch })` → confirming

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE` in Earn.tsx
- [ ] No `useSendTransaction` in Earn.tsx
- [ ] No `UnsignedTx` type import
- [ ] Deposit/Withdraw/Claim tabs work
- [ ] `pnpm build` passes
