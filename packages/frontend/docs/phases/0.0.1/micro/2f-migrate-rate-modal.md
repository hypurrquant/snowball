# Ticket 2f: Migrate AdjustRateModal to useAdjustInterestRate

**Phase:** 2 (Trove Transactions)
**Depends on:** 2b

## Task

Replace `fetch('/agent/adjust-rate')` with `useAdjustInterestRate` in `AdjustRateModal.tsx`.

### Remove
- `import { API_BASE } from '@/config/api'`
- `import type { UnsignedTx } from '@/hooks/useAgentExecute'`
- `useSendTransaction()` hook
- `fetch()` block
- `building` step

### Add
- `import { useAdjustInterestRate } from '@/hooks/useAdjustInterestRate'`
- Direct `adjustRate({ branch, troveId, newInterestRate })` call

## Acceptance Criteria
- [ ] No `fetch()`, `API_BASE`, or `UnsignedTx` imports
- [ ] `pnpm build` passes
