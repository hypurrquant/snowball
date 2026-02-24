# Ticket 3e: Rewrite useUserPositions (on-chain reads)

**Phase:** 3 (Data Reads)
**Depends on:** 0b, 0c

## Task

Rewrite `src/hooks/useUserPositions.ts` to read positions from chain. Most complex hook.

### Read strategy per branch
```
1. troveNFT.balanceOf(address) → count
2. For i in 0..count:
   troveNFT.tokenOfOwnerByIndex(address, i) → troveId
3. For each troveId:
   troveManager.getTroveStatus(troveId)
   troveManager.getTroveDebt(troveId)
   troveManager.getTroveColl(troveId)
   troveManager.getTroveAnnualInterestRate(troveId)
4. priceFeed.lastGoodPrice()
5. Compute: CR, liquidationPrice, collateralUSD
```

### Math
```
price = lastGoodPrice / 1e18
collUSD = (coll / 1e18) * price
cr = debt > 0 ? (collUSD / (debt / 1e18)) * 100 : 0
liqPrice = debt > 0 ? ((debt / 1e18) * mcr) / (coll / 1e18) : 0
interestRate = annualRate / 1e16  (convert from wei to percentage)
```

### Interface `Position` — unchanged

## Acceptance Criteria
- [ ] No `fetch()` or `API_BASE`
- [ ] Handles 0 troves gracefully
- [ ] Same `Position` interface
- [ ] `pnpm build` passes
