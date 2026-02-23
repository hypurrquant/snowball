# Ticket 3c: Rewrite useProtocolStats (on-chain reads)

**Phase:** 3 (Data Reads)
**Depends on:** 0b, 0c

## Task

Rewrite `src/hooks/useProtocolStats.ts` to aggregate protocol stats from chain.

### Reads per branch
```
activePool.getCollBalance()
activePool.getBoldDebt()
priceFeed.lastGoodPrice()
```

### Math
```
totalCollateralUSD = sum(collBalance * price / 1e18)
totalBorrowedUSD = sum(boldDebt) / 1e18
sbUSDPrice = '1.00'
activeAgents = 0 (or from IdentityRegistry)
```

### Interface `ProtocolStats` — unchanged

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE`
- [ ] Same data shape returned
- [ ] `pnpm build` passes
