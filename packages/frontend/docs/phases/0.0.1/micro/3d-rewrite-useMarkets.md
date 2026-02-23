# Ticket 3d: Rewrite useMarkets (on-chain reads)

**Phase:** 3 (Data Reads)
**Depends on:** 0b, 0c

## Task

Rewrite `src/hooks/useMarkets.ts` to read market data from chain. Most complex read hook.

### Reads per branch
```
activePool.getCollBalance()
activePool.getBoldDebt()
activePool.aggWeightedDebtSum()
stabilityPool.getTotalBoldDeposits()
priceFeed.lastGoodPrice()
```

### Math (from chainReader.ts)
```
totalCollUSD = collBalance * price / 1e18
currentCR = totalBorrow > 0 ? (totalCollUSD / totalBorrow) * 100 : 0
avgInterestRate = totalBorrow > 0 ? (aggWeightedDebtSum / totalBorrow) * 100 : 0
MCR = branch === 0 ? '110.00' : '120.00'
CCR = branch === 0 ? '150.00' : '160.00'
LTV = branch === 0 ? '90.91' : '83.33'
```

### Interface `Market` — unchanged

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE`
- [ ] Same data shape returned
- [ ] `pnpm build` passes
