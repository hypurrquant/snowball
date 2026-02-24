# Ticket 3a: Rewrite useUserBalance (on-chain reads)

**Phase:** 3 (Data Reads)
**Depends on:** 0b, 0c

## Task

Rewrite `src/hooks/useUserBalance.ts` to read balances directly from chain.

### Reads
```
publicClient.getBalance({ address })         → CTC native
erc20(wCTC).balanceOf(address)               → wCTC
erc20(lstCTC).balanceOf(address)             → lstCTC
erc20(sbUSD).balanceOf(address)              → sbUSD
```

### Interface `UserBalance` — unchanged

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE`
- [ ] Same data shape returned
- [ ] `pnpm build` passes
