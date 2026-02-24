# Ticket 3b: Rewrite useUserSPDeposits (on-chain reads)

**Phase:** 3 (Data Reads)
**Depends on:** 0b, 0c

## Task

Rewrite `src/hooks/useUserSPDeposits.ts` to read SP deposits directly from chain.

### Reads per branch
```
stabilityPool.getCompoundedBoldDeposit(address)
stabilityPool.getDepositorBoldGain(address)
stabilityPool.getDepositorCollGain(address)
```

### Interface `SPUserDeposit` — unchanged

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE`
- [ ] Same data shape returned
- [ ] `pnpm build` passes
