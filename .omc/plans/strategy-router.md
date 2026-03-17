# Work Plan: DeFi Strategy Router

**Spec:** `.omc/specs/deep-interview-strategy-router.md`
**Route:** `/earn/strategy`
**Type:** Brownfield (new domain module, integrates existing hooks)
**Estimated Complexity:** MEDIUM
**Date:** 2026-03-17
**Revision:** v2 (2026-03-17) -- Architect + Critic feedback applied

---

## RALPLAN-DR Summary

### Principles
1. **Reuse over Rebuild** -- Consume existing read hooks (`useAaveMarkets`, `useMorphoMarkets`, `useYieldVaults`, `useYieldVaultAPY`, `useStabilityPool`) and action hooks (`useAaveActions`, `useMorphoActions`, `useTroveActions`, `useStakerActions`). No new on-chain calls.
2. **DDD Layer Discipline** -- New code lives in `domains/defi/strategy/` (domain logic) and `app/(earn)/earn/strategy/` (page shell). No shared layer pollution.
3. **Read/Write Separation** -- The monolithic aggregation hook handles all READ (path computation). WRITE (execution) is isolated in a lazy `<StrategyExecutor>` component that mounts only when user clicks [Execute], instantiating only the action hooks needed for that specific path type. This avoids calling all write hooks unconditionally.
4. **Progressive Disclosure** -- Path calculation is synchronous over already-fetched on-chain data. No new RPC round-trips in the strategy hook itself.
5. **Design System Consistency** -- Use Card, Badge (with existing variant system), ice-blue theme, skeleton patterns from `earn/supply/page.tsx`.

### Decision Drivers (Top 3)
1. **APY Accuracy** -- Single-hop APYs must come from the same on-chain hooks the rest of the app uses (no hardcoded values). Multi-hop net APY = targetAPY - borrowCost. Stability Pool has no APY metric; display "Variable" badge and sort last.
2. **Execution Correctness** -- Multi-hop paths require sequential tx steps (approve -> openTrove -> approve -> supply). The existing `useTxPipeline.run()` handles this pattern. Action hooks have specific parameter requirements (full `MorphoMarket` object, `collAmount` for Trove approval sizing) that must be satisfied via `protocolContext` on each path.
3. **Asset Eligibility Filtering** -- Not every path is valid for every asset (e.g., Stability Pool only accepts sbUSD, CDP only accepts wCTC/lstCTC as collateral). The path calculator must filter by input asset. Morpho market lookup uses `loanToken` matching for supply paths, `collateralToken` for CDP paths.

### Options Considered

#### Option A: Monolithic Read Hook + Lazy Write Component (CHOSEN)
Single `useStrategyRoutes(asset, amount)` hook for READ (calls all existing read hooks, runs `pathCalculator`). Separate `<StrategyExecutor path={selectedPath} />` component for WRITE (mounts on execute, instantiates only the needed action hooks).
- **Pro:** Clean read/write separation. Write hooks only instantiated for the chosen path. Follows React hooks rules (no conditional hook calls).
- **Pro:** Single entry point for read, easy to test. Lazy executor avoids unused hook overhead.
- **Con:** Read hook calls all protocol hooks even if some paths are ineligible (minor wasted reads, but these hooks already run globally on earn pages).

#### Option B: Per-Path Lazy Hooks
Each path gets its own hook, composed at the page level. Only hooks relevant to the selected asset are called.
- **Pro:** Minimal RPC calls per asset.
- **Con:** 6+ hooks at page level, complex conditional rendering, breaks React hooks rules if paths are conditionally enabled.
- **Invalidation rationale:** React hooks cannot be conditionally called. Would require wrapper components per path, adding significant complexity for marginal RPC savings on data that is already polled every 10-15s across the app.

---

## ADR: Strategy Router Architecture

- **Decision:** Monolithic read hook with lazy write component (read/write separation)
- **Drivers:** Hook rules compliance, code simplicity, pattern consistency with `useUnifiedSupplyMarkets`, clean separation of read-only aggregation from stateful write operations
- **Alternatives considered:** Per-path lazy hooks (invalidated due to React hooks rules and complexity); monolithic hook handling both read and write (rejected -- would force all action hooks to mount unconditionally, wasteful and couples concerns)
- **Why chosen:** Read/write separation means the page stays fast (only read hooks poll). Write hooks (`useMorphoActions`, `useTroveActions`, etc.) are heavy (they set up approval watchers, contract writers) and only needed for one path at a time. Lazy `<StrategyExecutor>` mounts them on demand.
- **Consequences:** Slight over-fetching on read side when user selects an asset that only qualifies for 2-3 paths. Acceptable because the data hooks are already active site-wide. Executor component adds one extra render cycle when [Execute] is clicked.
- **Follow-ups:** If performance becomes an issue, add `enabled` flags to protocol hooks (Phase 2 optimization).

---

## Context

The Snowball protocol frontend has individual protocol pages (Aave supply, Morpho supply, Yield Vaults, Liquity CDP, LP Staking) but no unified view that helps users compare yield across all protocols for a given asset. The Strategy Router fills this gap by computing 5 yield paths (4 single-hop, 1 multi-hop) and presenting them sorted by APY with one-click execution.

### Scope Reduction (v2)
The original spec had 6 paths including "CDP -> LP -> Staker". This path is **deferred to Phase 2** because it requires:
- `mintLP` TxStepType (not in current `TxStepType` union)
- `stake` TxStepType (not in current `TxStepType` union)
- An LP minting abstraction hook (no `useMintLP` exists in the codebase)
Adding these 2 missing TxStepTypes + building the LP minting hook is out of scope for this plan.

### The 5 Paths (Phase 1)

| # | Path | Type | Input Assets | Steps |
|---|------|------|-------------|-------|
| 1 | Aave Supply | Single-hop | wCTC, lstCTC, sbUSD, USDC | approve -> supply |
| 2 | Morpho Supply | Single-hop | Matching `loanToken` assets | approve -> supply |
| 3 | Yield Vault Deposit | Single-hop | Vault's underlying asset | approve -> vaultDeposit |
| 4 | Stability Pool Deposit | Single-hop | sbUSD only | approve -> deposit |
| 5 | CDP -> Morpho Supply | Multi-hop | wCTC, lstCTC (collateral) | approveColl -> (approveGas if lstCTC) -> openTrove -> approve sbUSD -> supply sbUSD to Morpho |

### Existing Infrastructure (verified in codebase)

**Read hooks:**
- `useAaveMarkets()` -- returns `{ markets: AaveMarket[], isLoading, refetch }`
- `useMorphoMarkets()` -- returns `{ markets: MorphoMarket[], isLoading, refetch }` where `MorphoMarket` has `loanToken`, `collateralToken`, `supplyAPY`, `borrowAPR`, `lltv`
- `useYieldVaults()` -- returns `{ vaults: VaultData[], isLoading, refetch }`
- `useYieldVaultAPY()` -- returns `Record<Address, ApyState>` where `ApyState = {kind: "loading"} | {kind: "variable"} | {kind: "ready", value: number} | {kind: "error"}`
- `useStabilityPool(branch)` -- returns position/pool data (no APY metric)

**Action hooks (exact signatures -- critical for StrategyExecutor):**
- `useAaveActions(asset: Address, onSuccess?)` -- returns `{ approve, supply, withdraw, borrow, repay, isPending }`
- `useMorphoActions(market: MorphoMarket, onSuccess?)` -- takes FULL `MorphoMarket` object (not address). Returns `{ approveLoan, approveColl, supply, withdraw, supplyCollateral, borrow, repay, withdrawCollateral, isPending }`
- `useTroveActions(branch: "wCTC"|"lstCTC", owner?: Address, collAmount?: bigint)` -- needs `collAmount` for approval sizing (adds `ETH_GAS_COMPENSATION` for wCTC). Returns `{ approveCollateral, approveGasComp, openTrove, adjustTrove, closeTrove, isPending, needsCollApproval, needsGasApproval }`
- `useStakerActions(onSuccess?)` -- returns `{ stakeToken, unstakeToken, claimReward, depositAndStake, isPending }`

**TX pipeline:**
- `useTxPipeline()` with `run(steps, executors)` + `TxPipelineModal`
- `steps: { id: string; type: TxStepType; label: string }[]`
- `executors: Record<string, () => Promise<0x${string} | undefined>>`

**Available TxStepType values:** `approve`, `mint`, `openTrove`, `adjustTrove`, `adjustRate`, `closeTrove`, `supply`, `withdraw`, `supplyCollateral`, `borrow`, `repay`, `withdrawCollateral`, `deposit`, `swap`, `claim`, `vaultDeposit`, `bridgeBurn`, `attestWait`, `uscMint`, `delegate`

**Design components:** `Card`, `CardContent`, `Badge` (variants: default/success/warning/destructive), `ProtocolBadge` pattern in earn/supply page

**Token config:** `TOKENS` (wCTC, lstCTC, sbUSD, USDC), `TOKEN_INFO` with `decimals` and `mockPriceUsd` (wCTC=$5, lstCTC=$5.20, sbUSD=$1, USDC=$1)

**Price source for CDP calculation:** Use `TOKEN_INFO.mockPriceUsd` for testnet. Morpho oracle prices (`MorphoMarket.oraclePrice`) are 1e36 scale and harder to work with for a simple path preview.

---

## Work Objectives

Build the `/earn/strategy` page with asset selection, 5 yield path cards sorted by APY, and execute buttons that trigger multi-step tx-pipeline-modal via a lazy StrategyExecutor component.

---

## Guardrails

### Must Have
- All 5 paths (4 single-hop + 1 multi-hop CDP->Morpho)
- APY from existing on-chain hooks (no hardcoded rates)
- `ApyState` discriminated union handling (loading/variable/ready/error)
- Stability Pool shown with "Variable" badge, sorted last
- Asset filtering (only show eligible paths per asset)
- `protocolContext` discriminated union on `YieldPath` carrying hook-specific data
- Lazy `<StrategyExecutor>` for write operations (read/write separation)
- Execute button triggering `TxPipelineModal`
- Skeleton loading state
- Error handling for partial hook failures (show available paths, skip errored ones)
- Nav entry in Earn group

### Must NOT Have
- CDP -> LP -> Staker path (Phase 2 -- needs `mintLP` hook + 2 new TxStepTypes)
- New smart contracts or on-chain calls beyond existing hooks
- Backend/server changes
- Agent runtime integration (Phase 2)
- ForwardX/Bridge paths (Phase 2)
- Natural language input (Phase 3)
- Options module modifications

---

## Task Flow

```
Step 1: Types + Constants (including protocolContext union + ApyState handling)
         |
Step 2: Path Calculator (pure logic, handles ApyState, uses TOKEN_INFO.mockPriceUsd)
         |
Step 3: useStrategyRoutes hook (aggregation, read-only)
         |
Step 4: StrategyExecutor component (lazy write, builds executors from action hooks)
         |
Step 5: UI Components (AssetSelector + StrategyCard) + Page + Nav Integration
```

---

## Detailed TODOs

### Step 1: Domain Types and Constants
**Files to create:**
- `apps/web/src/domains/defi/strategy/types.ts`
- `apps/web/src/domains/defi/strategy/lib/constants.ts`

**Scope:**

`types.ts`:
- `RiskLevel` enum: `LOW | MEDIUM | HIGH`
- `PathStep` interface: `{ action: string, protocol: string, inputToken: Address, outputToken: Address }`
- `ProtocolContext` discriminated union carrying hook-specific data:
  ```
  | { type: "aave"; asset: Address }
  | { type: "morpho"; market: MorphoMarket }          // full MorphoMarket object
  | { type: "yieldVault"; vaultAddress: Address; underlying: Address }
  | { type: "stabilityPool"; branch: "wCTC" | "lstCTC" }
  | { type: "cdpMorpho"; branch: "wCTC" | "lstCTC"; collAmount: bigint; targetMarket: MorphoMarket }
  ```
- `YieldPath` interface:
  - `id: string`
  - `name: string`
  - `protocol: string`
  - `steps: PathStep[]`
  - `estimatedAPY: number | null` (null when APY unavailable, e.g., Stability Pool)
  - `apyLabel: string` (display string: "12.5%" or "Variable")
  - `netAPY: number | null` (for multi-hop: targetAPY - borrowCost)
  - `riskLevel: RiskLevel`
  - `stepCount: number`
  - `isEligible: boolean`
  - `protocolContext: ProtocolContext`
  - `executionSteps: { id: string; type: TxStepType; label: string }[]` (for tx pipeline)
- `SupportedAsset` type union: `"wCTC" | "lstCTC" | "sbUSD" | "USDC"`

`constants.ts`:
- Static path template definitions (5 paths with names, risk levels, protocol badges)
- `SUPPORTED_ASSETS` array
- `DEFAULT_BORROW_RATE = 0.05` (5%)
- `DEFAULT_LTV` per branch: `{ wCTC: 0.65, lstCTC: 0.70 }` (from CDP)
- Asset-to-eligible-paths mapping

**Acceptance Criteria:**
- [ ] `YieldPath` type includes `protocolContext: ProtocolContext` discriminated union
- [ ] `ProtocolContext` for `"morpho"` carries full `MorphoMarket` object (not just address)
- [ ] `ProtocolContext` for `"cdpMorpho"` carries `branch`, `collAmount`, and `targetMarket: MorphoMarket`
- [ ] `estimatedAPY` is `number | null` (not just `number`) to handle Stability Pool
- [ ] `apyLabel: string` field for display ("12.5%" or "Variable")
- [ ] `executionSteps` typed with existing `TxStepType` values only (no `stake` or `mintLP`)
- [ ] Asset eligibility map: CDP paths only for wCTC/lstCTC, StabilityPool only for sbUSD, Morpho supply by `loanToken` match

### Step 2: Path Calculator (Pure Logic)
**File to create:**
- `apps/web/src/domains/defi/strategy/lib/pathCalculator.ts`

**Scope:**
- Pure function `calculatePaths(asset, amount, protocolData)` -> `YieldPath[]`
- `protocolData` typed bag: `{ aaveMarkets, morphoMarkets, yieldVaults, vaultAPYs: Record<Address, ApyState>, stabilityPoolData }`
- **ApyState handling:**
  - `{kind: "ready", value}` -> use `value` as APY number
  - `{kind: "variable"}` -> set `estimatedAPY: null`, `apyLabel: "Variable"`
  - `{kind: "loading"}` -> skip path (will appear on next render cycle)
  - `{kind: "error"}` -> skip path (don't show broken data)
- **Morpho market lookup:**
  - For Morpho Supply paths: find market where `market.loanToken === asset` (user supplies the loan token)
  - For CDP->Morpho paths: find target sbUSD supply market where `market.loanToken === TOKENS.sbUSD`
- **CDP path calculation:**
  - `mintablesbUSD = amount * TOKEN_INFO[asset].mockPriceUsd * DEFAULT_LTV[branch]` (converted to bigint with 18 decimals)
  - Net APY = `targetMorphoMarket.supplyAPY - DEFAULT_BORROW_RATE`
  - Populate `protocolContext.collAmount` from input `amount`
- **Stability Pool:** Always set `estimatedAPY: null`, `apyLabel: "Variable"`
- **Sorting:** By `estimatedAPY` descending, paths with `null` APY (Variable) sorted last
- Filter paths by asset eligibility
- Generate `executionSteps` array for each path
- **Error tolerance:** If a protocol hook returned no data (empty markets array), skip those paths gracefully rather than throwing. Show whatever paths are available.

**Acceptance Criteria:**
- [ ] For wCTC input, returns up to 5 paths (Aave Supply, Morpho Supply if market exists, Yield Vault if vault exists, Stability Pool NO, CDP->Morpho YES)
- [ ] For sbUSD input, returns Morpho Supply (where `loanToken === sbUSD`), Aave Supply, Yield Vault, Stability Pool -- no CDP paths
- [ ] For USDC input, returns only Aave Supply and Morpho Supply (if matching markets exist)
- [ ] Stability Pool paths always have `estimatedAPY: null`, `apyLabel: "Variable"`, sort last
- [ ] `ApyState` with `kind: "loading"` or `kind: "error"` -> path excluded from results
- [ ] `ApyState` with `kind: "ready"` -> `estimatedAPY = value`
- [ ] Multi-hop paths subtract `DEFAULT_BORROW_RATE` from target APY
- [ ] CDP `protocolContext.collAmount` is set from input `amount`
- [ ] Morpho `protocolContext.market` is the full `MorphoMarket` object
- [ ] Function is pure (no hooks, no side effects) -- unit testable
- [ ] Partial hook failures (e.g., morphoMarkets = []) gracefully skip those paths

### Step 3: Strategy Routes Hook (Read-Only)
**File to create:**
- `apps/web/src/domains/defi/strategy/hooks/useStrategyRoutes.ts`

**Scope:**
- `useStrategyRoutes(asset: Address, amount: bigint)` hook
- Internally calls (read-only):
  - `useAaveMarkets()`
  - `useMorphoMarkets()`
  - `useYieldVaults()`
  - `useYieldVaultAPY()`
  - `useStabilityPool("wCTC")`
  - `useStabilityPool("lstCTC")`
- Aggregates loading states: `isLoading = any hook loading`
- Passes all protocol data to `calculatePaths()` from Step 2
- Returns `{ paths: YieldPath[], isLoading: boolean, error: string | null }`
- **Error handling:** If individual protocol hooks error, set those markets to empty arrays and let pathCalculator skip them. Only set top-level `error` if ALL hooks fail.

**Acceptance Criteria:**
- [ ] Hook compiles and returns typed `YieldPath[]` with `protocolContext` populated
- [ ] `isLoading` is true while any underlying hook is loading
- [ ] Paths update reactively when on-chain data refreshes (10-15s intervals)
- [ ] No new `useReadContracts` calls -- only reuses existing hooks
- [ ] Partial hook failures produce partial results (available paths shown, errored protocols skipped)

### Step 4: StrategyExecutor Component (Lazy Write)
**File to create:**
- `apps/web/src/domains/defi/strategy/components/StrategyExecutor.tsx`

**Scope:**
- `<StrategyExecutor path={selectedPath} amount={amount} onClose={handler} />`
- This component **only mounts when user clicks [Execute]** on a StrategyCard
- On mount, reads `path.protocolContext` to determine which action hooks to instantiate:
  - `protocolContext.type === "aave"` -> `useAaveActions(ctx.asset)`
  - `protocolContext.type === "morpho"` -> `useMorphoActions(ctx.market)` (passes full `MorphoMarket`)
  - `protocolContext.type === "yieldVault"` -> vault deposit action (approve + `vaultDeposit` via write contract)
  - `protocolContext.type === "stabilityPool"` -> `useStabilityPool(ctx.branch)` provideToSP action
  - `protocolContext.type === "cdpMorpho"` -> `useTroveActions(ctx.branch, owner, ctx.collAmount)` + `useMorphoActions(ctx.targetMarket)` (both hooks needed for multi-hop)
- Builds `executors: Record<string, () => Promise<0x... | undefined>>` from the instantiated hooks
- Calls `useTxPipeline().run(path.executionSteps, executors)`
- Renders `TxPipelineModal` with pipeline state
- On complete/close, calls `onClose` to unmount

**Key Design:**
```
Page state: selectedPath: YieldPath | null

When selectedPath !== null:
  <StrategyExecutor path={selectedPath} ... />
    -> mounts
    -> reads path.protocolContext.type
    -> calls the CORRECT action hooks (unconditionally within this component)
    -> builds executor closures
    -> runs pipeline
    -> shows TxPipelineModal

When pipeline completes or user closes:
  setSelectedPath(null)
  -> StrategyExecutor unmounts
  -> action hooks cleaned up
```

**Why this pattern:**
- Action hooks (`useMorphoActions`, `useTroveActions`) set up approval watchers and contract writers on mount. Calling all of them unconditionally in the page wastes resources.
- React hooks rules require hooks be called unconditionally within a component. By using a separate component per execution context, we satisfy this rule while only instantiating the hooks we need.
- This is the same pattern used elsewhere (e.g., modal components that mount/unmount with their own hook state).

**Acceptance Criteria:**
- [ ] Component only mounts when `selectedPath` is set (lazy)
- [ ] For `protocolContext.type === "morpho"`, passes full `MorphoMarket` to `useMorphoActions`
- [ ] For `protocolContext.type === "cdpMorpho"`, passes `collAmount` to `useTroveActions` for approval sizing
- [ ] For `protocolContext.type === "cdpMorpho"` with `branch === "lstCTC"`, includes `approveGasComp` step
- [ ] Executor closures correctly map step IDs to action hook methods
- [ ] `TxPipelineModal` renders with correct step labels
- [ ] On close/complete, component unmounts cleanly

### Step 5: UI Components + Page + Nav Integration
**Files to create:**
- `apps/web/src/domains/defi/strategy/components/StrategyCard.tsx`
- `apps/web/src/domains/defi/strategy/components/AssetSelector.tsx`
- `apps/web/src/app/(earn)/earn/strategy/page.tsx`

**Files to modify:**
- `apps/web/src/shared/config/nav.tsx`

**Scope for StrategyCard:**
- Renders a single yield path as a card (using existing `Card` component)
- Shows: path name, protocol badge, APY display (green text for number, muted for "Variable"), risk level badge (success=LOW, warning=MEDIUM, destructive=HIGH), step count, step visualization
- Highlight top path (rank #1) with subtle border accent
- [Execute] button that calls `onExecute(path)` callback
- Skeleton variant for loading state

**Scope for AssetSelector:**
- Token dropdown (wCTC, lstCTC, sbUSD, USDC) using `TOKENS`/`TOKEN_INFO`
- Amount input field with max/half buttons (follow Liquity borrow page pattern)
- Display selected token icon (2-letter abbreviation in circle)

**Scope for page:**
- Layout follows `earn/supply/page.tsx` pattern: max-w-5xl, background glow, header
- Wire AssetSelector state to `useStrategyRoutes` hook
- Map paths to StrategyCard list
- `selectedPath` state: when set, render `<StrategyExecutor path={selectedPath} ... />`
- Each StrategyCard's [Execute] sets `selectedPath`
- Handle empty state (no eligible paths)
- Handle wallet not connected state
- Handle partial-error state (some paths available, some protocols errored)

**Scope for nav:**
- Add `{ href: "/earn/strategy", label: "Strategy", icon: Waypoints, matchPaths: ["/earn/strategy"] }` to the Earn group in `NAV_GROUPS`
- Import `Waypoints` from lucide-react

**Acceptance Criteria:**
- [ ] `/earn/strategy` renders with 200 OK
- [ ] Page header shows "Strategy Router" title with icon
- [ ] Asset selector + amount input are functional
- [ ] Up to 5 paths render for wCTC, sorted by APY descending (Variable last)
- [ ] Stability Pool card shows "Variable" badge instead of APY number
- [ ] Clicking [Execute] mounts `<StrategyExecutor>` and opens `TxPipelineModal`
- [ ] Single-hop paths execute with 1-2 tx steps
- [ ] Multi-hop CDP->Morpho path executes with 3-4 tx steps (approveColl, [approveGas], openTrove, approveLoan, supply)
- [ ] Nav shows "Strategy" in Earn group, active state works
- [ ] Loading skeleton shows while hooks fetch
- [ ] Partial failures show available paths with subtle error indicator for missing protocols
- [ ] Empty/error states handled gracefully

---

## Success Criteria (from Spec, updated for v2)

- [ ] `/earn/strategy` page loads with 200 OK
- [ ] Asset selector (wCTC/lstCTC/sbUSD/USDC) + amount input UI exists
- [ ] 5 paths shown for eligible assets (not 6 -- CDP->LP->Staker deferred)
- [ ] Each path shows: protocol badge, APY (number or "Variable"), risk level, step count
- [ ] Single-hop APY from on-chain data (existing hooks)
- [ ] Stability Pool shows "Variable" badge, sorted last
- [ ] `ApyState` discriminated union properly handled (loading/variable/ready/error)
- [ ] Multi-hop APY = target - borrow cost
- [ ] Each path has [Execute] button
- [ ] [Execute] mounts lazy `<StrategyExecutor>` with correct `protocolContext`
- [ ] `useMorphoActions` receives full `MorphoMarket` object
- [ ] `useTroveActions` receives `collAmount` for approval sizing
- [ ] `TxPipelineModal` shows correct steps (1-2 single-hop, 3-4 multi-hop)
- [ ] Nav has "Strategy" in Earn group
- [ ] Loading skeleton during data fetch
- [ ] Partial hook failures degrade gracefully (show available paths)

---

## Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stability Pool has no APY hook | RESOLVED | -- | Show "Variable" badge, sort last. Decision made. |
| Multi-hop execution fails mid-pipeline (openTrove succeeds, supply fails) | MEDIUM | HIGH | `useTxPipeline` handles partial failure with per-step error state + retry. User sees which step failed. Add tooltip warning on multi-hop cards. |
| Morpho market lookup returns no match for an asset | LOW | MEDIUM | pathCalculator skips the Morpho path for that asset. Partial results shown. |
| `protocolContext` data stale between path calculation and execution | LOW | LOW | StrategyExecutor reads from the path object set at click time. Amount/market data is recent (10-15s polling). |
| Yield Vault APY returns `{kind: "error"}` | MEDIUM | LOW | Path excluded from results. Other paths still shown. |

---

## File Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `domains/defi/strategy/types.ts` | CREATE | YieldPath, ProtocolContext union, PathStep, RiskLevel |
| 2 | `domains/defi/strategy/lib/constants.ts` | CREATE | Path templates, risk mappings, asset eligibility, DEFAULT_BORROW_RATE |
| 3 | `domains/defi/strategy/lib/pathCalculator.ts` | CREATE | Pure APY calculation + ApyState handling + path filtering |
| 4 | `domains/defi/strategy/hooks/useStrategyRoutes.ts` | CREATE | Read-only aggregation hook |
| 5 | `domains/defi/strategy/components/StrategyExecutor.tsx` | CREATE | Lazy write component: mounts on Execute, builds executors from action hooks |
| 6 | `domains/defi/strategy/components/StrategyCard.tsx` | CREATE | Path card with APY/Variable badge, risk badge, execute button |
| 7 | `domains/defi/strategy/components/AssetSelector.tsx` | CREATE | Token dropdown + amount input |
| 8 | `app/(earn)/earn/strategy/page.tsx` | CREATE | Page shell: selectedPath state, wires read hook + lazy executor |
| 9 | `shared/config/nav.tsx` | MODIFY | Add Strategy to Earn nav group |

All paths are relative to `apps/web/src/`.

No `TxStepType` extensions needed -- all 5 paths use existing types (`approve`, `supply`, `openTrove`, `deposit`, `vaultDeposit`).

---

## Revision Changelog

### v2 (2026-03-17) -- Architect + Critic Feedback

**CRITICAL fixes applied:**

1. **Executor wiring pattern (read/write separation):** Added Step 4 `<StrategyExecutor>` lazy component. Page sets `selectedPath` state on [Execute] click. `StrategyExecutor` mounts, instantiates only the action hooks needed for that path's `protocolContext.type`, builds executor closures, calls `useTxPipeline.run()`. This cleanly separates read (monolithic hook, Step 3) from write (lazy component, Step 4).

2. **Hook interface mismatches fixed:**
   - `useMorphoActions(market: MorphoMarket)` -- documented that it needs full `MorphoMarket` object. Added to `ProtocolContext` type as `{ type: "morpho"; market: MorphoMarket }`.
   - `useTroveActions(branch, owner?, collAmount?)` -- documented `collAmount` requirement for approval sizing. Added to `ProtocolContext` as `{ type: "cdpMorpho"; branch; collAmount; targetMarket }`.
   - Added `protocolContext: ProtocolContext` discriminated union to `YieldPath` type.

**MAJOR fixes applied:**

3. **Reduced to 5 paths:** CDP->LP->Staker deferred to Phase 2. Requires `mintLP` hook (doesn't exist) + `stake` and `mintLP` TxStepTypes (not in current union). Explicit invalidation documented in Context section.

4. **ApyState discriminated union handling:** `useYieldVaultAPY` returns `{kind: "loading"|"variable"|"ready"|"error"}`. pathCalculator now handles all 4 variants: `ready` -> use value, `variable` -> null APY + "Variable" label, `loading` -> skip, `error` -> skip. `YieldPath.estimatedAPY` changed from `number` to `number | null`. Added `apyLabel: string` for display.

5. **Stability Pool APY:** Decision made -- show "Variable" badge, always sort last. No APY metric available.

**Additional fixes applied:**

6. Morpho market lookup: documented `loanToken` matching for supply paths, `collateralToken` matching for CDP context.
7. Error handling: partial hook failures show available paths, skip errored protocols.
8. `protocolContext` added to `YieldPath` type with full discriminated union.
9. ADR updated to include read/write separation as the key architectural decision.
10. Price source: `TOKEN_INFO.mockPriceUsd` for testnet CDP calculations.
11. Updated file summary: added `StrategyExecutor.tsx`, removed TxStepType extension step (not needed for 5 paths).
