# Design Document: Frontend-Only Transaction Architecture

**Phase:** 0.0.1
**Date:** 2026-02-23

---

## 1. Architecture Overview

### Before (Current)

```
User Action → Frontend fetch() → Backend API → encodeFunctionData() → unsignedTx
                                                                          ↓
User signs ← sendTransactionAsync(unsignedTx) ← Frontend receives unsignedTx
```

### After (Target)

```
User Action → Frontend writeContractAsync() → User signs → Chain
```

For reads:

```
Frontend hook → publicClient.readContract() [batch] → RPC → Chain state
```

---

## 2. Infrastructure Layer

### 2.1 `src/config/contracts.ts`

Central module resolving contract addresses and parsed ABIs by branch index.

```typescript
// Key exports
export const abis: {
  borrowerOperations: Abi   // parsed from BorrowerOperationsABI
  troveManager: Abi         // parsed from TroveManagerABI
  stabilityPool: Abi        // parsed from StabilityPoolABI
  activePool: Abi           // parsed from ActivePoolABI
  priceFeed: Abi            // parsed from MockPriceFeedABI
  troveNFT: Abi             // parsed from TroveNFTABI
  erc20: Abi                // parsed from MockWCTCABI (ERC20)
}

export function getBranchAddresses(branch: 0 | 1): {
  borrowerOperations: Address
  troveManager: Address
  stabilityPool: Address
  sortedTroves: Address
  priceFeed: Address
  activePool: Address
  troveNFT: Address
  // ... all branch addresses
}

export function getCollToken(branch: 0 | 1): Address
export function getSbUSDToken(): Address
```

**Import source:** ABIs from `@snowball/shared`, addresses from `./addresses.json`.

### 2.2 `src/config/publicClient.ts`

Singleton viem PublicClient with batch transport enabled.

```typescript
import { createPublicClient, http } from 'viem'
import { creditcoinTestnet } from './chain'

export const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(RPC_URL, { batch: true }),
})
```

**Batch transport** means multiple `readContract()` calls made in the same tick are automatically combined into a single JSON-RPC `eth_call` batch request. This is how we achieve "1-2 fetches" for all data.

---

## 3. Transaction Hook Design

All 7 transaction hooks follow the same pattern:

```typescript
function useXxx() {
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  const execute = async (params: XxxParams) => {
    const branch = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: branch.borrowerOperations,  // or stabilityPool
      abi: abis.borrowerOperations,         // or stabilityPool
      functionName: 'xxx',
      args: [...],
    })
  }

  return { execute, isPending, isConfirmed, txHash, error }
}
```

### 3.1 `useOpenTrove`

```
Contract: BorrowerOperations[branch]
Function: openTrove(address, uint256, uint256, uint256, uint256, uint256, uint256, uint256)
Args:     [owner, 0n, collAmount, debtAmount, 0n, 0n, interestRate, maxUpfrontFee]
                  ↑ ownerIndex   ↑ upperHint ↑ lowerHint
```

### 3.2 `useAdjustTrove`

```
Contract: BorrowerOperations[branch]
Function: adjustTrove(uint256, uint256, bool, uint256, bool, uint256, uint256, uint256)
Args:     [troveId, collChange, isCollIncrease, debtChange, isDebtIncrease, 0n, 0n, maxUpfrontFee]
```

### 3.3 `useCloseTrove`

```
Contract: BorrowerOperations[branch]
Function: closeTrove(uint256)
Args:     [troveId]
```

### 3.4 `useAdjustInterestRate`

```
Contract: BorrowerOperations[branch]
Function: adjustTroveInterestRate(uint256, uint256, uint256, uint256, uint256)
Args:     [troveId, newInterestRate, 0n, 0n, maxUpfrontFee]
```

### 3.5 `useSPDeposit`

```
Contract: StabilityPool[branch]
Function: provideToSP(uint256)
Args:     [amount]
```

### 3.6 `useSPWithdraw`

```
Contract: StabilityPool[branch]
Function: withdrawFromSP(uint256)
Args:     [amount]
```

### 3.7 `useSPClaim`

```
Contract: StabilityPool[branch]
Function: claimReward()
Args:     []
```

---

## 4. Data-Read Hook Design

All read hooks keep the same `useQuery` pattern but replace `fetch(API)` with `publicClient.readContract()`.

### 4.1 `useUserPositions` Rewrite

**Read strategy per branch (0, 1):**

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

All calls batched via `publicClient` batch transport. Interface `Position` unchanged.

### 4.2 `useUserSPDeposits` Rewrite

**Read per branch:**

```
stabilityPool.getCompoundedBoldDeposit(address)
stabilityPool.getDepositorBoldGain(address)
stabilityPool.getDepositorCollGain(address)
```

6 calls total (2 branches × 3 calls). Interface `SPUserDeposit` unchanged.

### 4.3 `useUserBalance` Rewrite

```
publicClient.getBalance({ address })           → CTC native
erc20(wCTC).balanceOf(address)                  → wCTC
erc20(lstCTC).balanceOf(address)                → lstCTC
erc20(sbUSD).balanceOf(address)                 → sbUSD
```

4 calls batched. Interface `UserBalance` unchanged.

### 4.4 `useMarkets` Rewrite

**Per branch:**

```
activePool.getCollBalance()
activePool.getBoldDebt()
activePool.aggWeightedDebtSum()
stabilityPool.getTotalBoldDeposits()
priceFeed.lastGoodPrice()
```

10 calls total. Compute: `totalCollateralUSD`, `currentCR`, `ltv`, `avgInterestRate`, `spAPY`.

**Math (from chainReader.ts):**

```
totalCollUSD = collBalance * price / 1e18
currentCR = totalBorrow > 0 ? (totalCollUSD / totalBorrow) * 100 : 0
avgInterestRate = totalBorrow > 0 ? (aggWeightedDebtSum / totalBorrow) * 100 : 0
spAPY = estimated from interest accrual to SP depositors
```

Interface `Market` unchanged.

### 4.5 `useProtocolStats` Rewrite

Aggregate across branches:

```
sum(activePool.getCollBalance() * priceFeed.lastGoodPrice() / 1e18)   → totalCollateralUSD
sum(activePool.getBoldDebt())                                          → totalBorrowedUSD
sbUSDPrice = '1.00' (hardcoded peg)
activeAgents = identityRegistry.totalAgents() || 0
```

Interface `ProtocolStats` unchanged.

---

## 5. UI Step State Machine Changes

### Current (6 states)

```
idle → approving → building → signing → confirming → done
                      ↑
              backend round-trip
```

### After (5 states)

```
idle → approving → signing → confirming → done
```

The `building` step is eliminated. For operations without approval (SP withdraw, SP claim, close trove), the flow is even simpler:

```
idle → signing → confirming → done
```

**Impact on components:** All `stepLabel` maps lose the `building` entry. Step type changes from `'idle' | 'approving' | 'building' | 'signing' | 'confirming' | 'done'` to `'idle' | 'approving' | 'signing' | 'confirming' | 'done'`.

---

## 6. Component Integration Pattern

Example: how `Borrow.tsx` changes.

### Before

```typescript
const agentExecute = useAgentExecute()
const { sendTransactionAsync, data: txHash } = useSendTransaction()

const handleOpen = async () => {
  setStep('approving')
  await writeContractAsync({ /* approve */ })

  setStep('building')
  const result = await agentExecute.mutateAsync({
    userAddress: address,
    action: 'openTrove',
    params: { branch, collateralAmount, debtAmount, interestRate },
  })

  setStep('signing')
  await sendTransactionAsync({
    to: result.unsignedTx.to,
    data: result.unsignedTx.data,
    value: BigInt(result.unsignedTx.value),
  })
  setStep('confirming')
}
```

### After

```typescript
const { openTrove, isPending, isConfirmed, txHash } = useOpenTrove()

const handleOpen = async () => {
  setStep('approving')
  await writeContractAsync({ /* approve */ })

  setStep('signing')
  await openTrove({
    branch,
    owner: address,
    collAmount: parseEther(collAmount),
    debtAmount: parseEther(debtAmount),
    interestRate: parseEther((interestRate / 100).toString()),
    maxUpfrontFee: parseEther(debtAmount),
  })
  setStep('confirming')
}
```

**Key difference:** No `sendTransactionAsync`, no `unsignedTx` parsing, no `building` step.

---

## 7. Migration Phases (Implementation Order)

### Phase 0: Infrastructure
1. `0a` — Add `@snowball/shared` to `package.json`
2. `0b` — Create `src/config/contracts.ts`
3. `0c` — Create `src/config/publicClient.ts`
4. `0d` — Refactor `usePrice.ts` to use shared modules

### Phase 1: SP transactions (simplest, isolated)
5. `1a` — Create `useSPClaim.ts` (0 args)
6. `1b` — Create `useSPWithdraw.ts` (1 arg)
7. `1c` — Create `useSPDeposit.ts` (1 arg)
8. `1d` — Migrate `Earn.tsx` to use SP hooks

### Phase 2: Trove transactions
9. `2a` — Create `useCloseTrove.ts` (1 arg)
10. `2b` — Create `useAdjustInterestRate.ts` (5 args)
11. `2c` — Create `useAdjustTrove.ts` (8 args)
12. `2d` — Create `useOpenTrove.ts` (8 args)
13. `2e` — Migrate `CloseTroveModal.tsx`
14. `2f` — Migrate `AdjustRateModal.tsx`
15. `2g` — Migrate `AdjustTroveModal.tsx`
16. `2h` — Migrate `Borrow.tsx`

### Phase 3: Data-read hooks
17. `3a` — Rewrite `useUserBalance.ts`
18. `3b` — Rewrite `useUserSPDeposits.ts`
19. `3c` — Rewrite `useProtocolStats.ts`
20. `3d` — Rewrite `useMarkets.ts`
21. `3e` — Rewrite `useUserPositions.ts`

### Phase 4: Cleanup
22. `4a` — Delete `useAgentExecute.ts`
23. `4b` — Remove dead imports, verify build
24. `4c` — Final E2E verification

---

## 8. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Gas estimation failure | wagmi auto-estimates; falls back cleanly to wallet error |
| RPC rate limiting | Batch transport reduces call count; existing staleTime/refetchInterval limits frequency |
| Data computation mismatch | Copy exact BigInt math from backend `chainReader.ts`; compare outputs |
| Hint values (0,0) suboptimal | Identical to current backend behavior; optimize in future phase |
| `@snowball/shared` ABI format | Verify `parseAbi()` compatibility in Phase 0 |
