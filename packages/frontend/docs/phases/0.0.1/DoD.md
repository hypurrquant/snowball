# Definition of Done (DoD)

**Phase:** 0.0.1
**Date:** 2026-02-23

---

## Files to CREATE (10)

| # | File | Purpose | Exports |
|---|------|---------|---------|
| 1 | `src/config/contracts.ts` | Centralized ABI parsing, address helpers, branch constants | `abis`, `getBranchAddresses()`, `getCollToken()`, `getSbUSDToken()`, `BRANCH_MCR`, `BRANCH_SYMBOLS` |
| 2 | `src/config/publicClient.ts` | Shared viem PublicClient with batch transport | `publicClient` |
| 3 | `src/hooks/useOpenTrove.ts` | BorrowerOperations.openTrove direct call | `useOpenTrove()` |
| 4 | `src/hooks/useAdjustTrove.ts` | BorrowerOperations.adjustTrove direct call | `useAdjustTrove()` |
| 5 | `src/hooks/useCloseTrove.ts` | BorrowerOperations.closeTrove direct call | `useCloseTrove()` |
| 6 | `src/hooks/useAdjustInterestRate.ts` | BorrowerOperations.adjustTroveInterestRate direct call | `useAdjustInterestRate()` |
| 7 | `src/hooks/useSPDeposit.ts` | StabilityPool.provideToSP direct call | `useSPDeposit()` |
| 8 | `src/hooks/useSPWithdraw.ts` | StabilityPool.withdrawFromSP direct call | `useSPWithdraw()` |
| 9 | `src/hooks/useSPClaim.ts` | StabilityPool.claimReward direct call | `useSPClaim()` |

## Files to DELETE (1)

| # | File | Reason |
|---|------|--------|
| 1 | `src/hooks/useAgentExecute.ts` | All 3 consumers (Borrow, AdjustTroveModal, CloseTroveModal) migrated to dedicated hooks |

## Files to MODIFY (12)

| # | File | Changes |
|---|------|---------|
| 1 | `package.json` | Add `"@snowball/shared": "workspace:*"` to dependencies |
| 2 | `src/pages/Borrow.tsx` | Replace `useAgentExecute` + `sendTransactionAsync` → `useOpenTrove`. Remove `building` step. Remove `API_BASE` usage. |
| 3 | `src/pages/Earn.tsx` | Replace 3 `fetch()` calls → `useSPDeposit`, `useSPWithdraw`, `useSPClaim`. Remove `API_BASE`, `UnsignedTx`, `useSendTransaction` imports. |
| 4 | `src/components/positions/AdjustTroveModal.tsx` | Replace `useAgentExecute` → `useAdjustTrove`. Remove `useSendTransaction`. |
| 5 | `src/components/positions/CloseTroveModal.tsx` | Replace `useAgentExecute` → `useCloseTrove`. Remove `useSendTransaction`. |
| 6 | `src/components/positions/AdjustRateModal.tsx` | Replace `fetch('/agent/adjust-rate')` → `useAdjustInterestRate`. Remove `API_BASE`, `UnsignedTx`, `useSendTransaction`. |
| 7 | `src/hooks/useUserPositions.ts` | Rewrite: `fetch(API)` → `publicClient.readContract()` multicall on TroveNFT + TroveManager. Same `Position` interface. |
| 8 | `src/hooks/useUserSPDeposits.ts` | Rewrite: `fetch(API)` → `publicClient.readContract()` on StabilityPool. Same `SPUserDeposit` interface. |
| 9 | `src/hooks/useUserBalance.ts` | Rewrite: `fetch(API)` → `publicClient.getBalance()` + `readContract(balanceOf)`. Same `UserBalance` interface. |
| 10 | `src/hooks/useMarkets.ts` | Rewrite: `fetch(API)` → `publicClient.readContract()` on ActivePool + PriceFeed + StabilityPool. Same `Market` interface. |
| 11 | `src/hooks/useProtocolStats.ts` | Rewrite: `fetch(API)` → `publicClient.readContract()` on ActivePool + PriceFeed. Same `ProtocolStats` interface. |
| 12 | `src/hooks/usePrice.ts` | Minor: use shared `publicClient` and ABI from `@snowball/shared` instead of inline. |

## Functions to CREATE

### Transaction Hooks (each hook wraps `useWriteContract`)

| Hook | Contract | Function | Args |
|------|----------|----------|------|
| `useOpenTrove().openTrove()` | BorrowerOperations | `openTrove` | `(owner, 0n, collAmount, debtAmount, 0n, 0n, interestRate, maxUpfrontFee)` |
| `useAdjustTrove().adjustTrove()` | BorrowerOperations | `adjustTrove` | `(troveId, collChange, isCollIncrease, debtChange, isDebtIncrease, 0n, 0n, maxUpfrontFee)` |
| `useCloseTrove().closeTrove()` | BorrowerOperations | `closeTrove` | `(troveId)` |
| `useAdjustInterestRate().adjustRate()` | BorrowerOperations | `adjustTroveInterestRate` | `(troveId, newRate, 0n, 0n, maxUpfrontFee)` |
| `useSPDeposit().deposit()` | StabilityPool | `provideToSP` | `(amount)` |
| `useSPWithdraw().withdraw()` | StabilityPool | `withdrawFromSP` | `(amount)` |
| `useSPClaim().claim()` | StabilityPool | `claimReward` | `()` |

### Config Functions

| Function | File | Purpose |
|----------|------|---------|
| `getBranchAddresses(branch)` | `contracts.ts` | Returns all addresses for branch 0 or 1 |
| `getCollToken(branch)` | `contracts.ts` | Returns collateral token address |
| `getSbUSDToken()` | `contracts.ts` | Returns sbUSD token address |

## Functions to DELETE

| Function | File | Reason |
|----------|------|--------|
| `useAgentExecute()` | `useAgentExecute.ts` | Entire file deleted |
| `fetch(API_BASE + '/agent/execute')` | Borrow.tsx, AdjustTroveModal, CloseTroveModal | Replaced by direct hooks |
| `fetch(API_BASE + '/agent/adjust-rate')` | AdjustRateModal.tsx | Replaced by `useAdjustInterestRate` |
| `fetch(API_BASE + '/sp/deposit')` | Earn.tsx | Replaced by `useSPDeposit` |
| `fetch(API_BASE + '/sp/withdraw')` | Earn.tsx | Replaced by `useSPWithdraw` |
| `fetch(API_BASE + '/sp/claim')` | Earn.tsx | Replaced by `useSPClaim` |
| `fetch(API_BASE + '/user/.../positions')` | useUserPositions.ts | Replaced by on-chain reads |
| `fetch(API_BASE + '/user/.../sp-deposits')` | useUserSPDeposits.ts | Replaced by on-chain reads |
| `fetch(API_BASE + '/user/.../balance')` | useUserBalance.ts | Replaced by on-chain reads |
| `fetch(API_BASE + '/protocol/markets')` | useMarkets.ts | Replaced by on-chain reads |
| `fetch(API_BASE + '/protocol/stats')` | useProtocolStats.ts | Replaced by on-chain reads |

## Verification Checklist

- [ ] `pnpm build` passes with zero errors
- [ ] No `import.*useAgentExecute` found in codebase
- [ ] No `fetch(API_BASE + '/agent/execute')` found in codebase
- [ ] No `fetch(API_BASE + '/sp/')` found in codebase
- [ ] No `fetch(API_BASE + '/user/')` found in codebase
- [ ] No `fetch(API_BASE + '/protocol/')` found in codebase
- [ ] `API_BASE` only imported by agent-related hooks (`useAgents`, `useAgentHistory`, `useAgentReputation`, `useAgentRecommend`)
- [ ] `CHAT_API_BASE` still works for chat
- [ ] All `Position`, `SPUserDeposit`, `UserBalance`, `Market`, `ProtocolStats` interfaces unchanged
- [ ] E2E: SP deposit/withdraw/claim works without backend
- [ ] E2E: openTrove/adjustTrove/closeTrove/adjustRate works without backend
