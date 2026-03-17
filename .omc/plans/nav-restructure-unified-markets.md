# Plan: Navigation Restructure + Unified Supply/Borrow Pages

**Created:** 2026-03-17
**Revised:** 2026-03-17 (v3 -- Consensus approved by Architect + Critic)
**Status:** APPROVED -- Ready for execution
**Estimated Complexity:** MEDIUM-HIGH

---

## Context

The Snowball DeFi platform currently organizes its sidebar navigation by protocol (Trade/DeFi/More with 15 items total). Users must know which protocol (Morpho vs Aave) to use before they can supply or borrow. The goal is to restructure navigation by **purpose** (Earn/Borrow/Trade/Manage) and create unified pages that aggregate markets from multiple lending protocols.

### Current State
- **Nav config:** `apps/web/src/shared/config/nav.tsx` -- 3 groups (Trade: 3 items, DeFi: 7 items, More: 5 items)
- **Nav config has resolved merge conflict** in working tree (diff is clean, but file will be fully rewritten in Step 2)
- **Sidebar/MobileNav:** Both consume `NAV_GROUPS` from nav.tsx directly. Active state logic: `pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))`
- **Route groups:** `(trade)/`, `(defi)/`, `(more)/`, plus standalone `faucet/`
- **Existing routes under (more):** `/dashboard`, `/analytics`, `/agent` (with sub-routes), `/chat`
- **Existing routes under (defi):** `/bridge`, `/morpho/*`, `/aave/*`, `/liquity/*`, `/yield`, `/forward/*`, `/stake`
- **Protocol pages:** Morpho and Aave each have separate supply/borrow pages with their own hooks, types, and UI components
- **No middleware.ts exists** -- redirects will use `next.config.ts` redirects or in-page `redirect()`
- **Homepage:** 4 feature cards linking to `/swap`, `/lend`, `/borrow`, `/earn` in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` layout

### Key Data Shapes (for unified hooks)
- `MorphoMarket`: borrowAPR (simple annual rate via `borrowRateToAPR`), supplyAPY (derived: `borrowAPR * utilization * feeMultiplier`)
- `AaveMarket`: borrowAPY (compound rate via `rayRateToAPY`: `((1 + r)^n - 1) * 100`), supplyAPY (same compound formula)
- **IMPORTANT:** Morpho uses APR (simple), Aave uses APY (compound). These are different metrics and must be normalized for the unified view.

### APR vs APY Conversion
- `APR -> APY`: `APY = ((1 + APR / (100 * n))^n - 1) * 100` where n = compounding periods (use n=365 for daily)
- `APY -> APR`: `APR = n * ((1 + APY / 100)^(1/n) - 1) * 100`
- For display, normalize everything to **APY** since users compare compound returns.

---

## RALPLAN-DR Summary

### Principles (5)
1. **Purpose over Protocol** -- Users think "I want to earn yield" not "I want to use Morpho"
2. **Backward Compatibility** -- All existing `/morpho/*`, `/aave/*`, `/liquity/*` URLs must keep working
3. **Minimal Disruption** -- Reuse existing domain hooks and components; no ABI/address changes
4. **Progressive Enhancement** -- Ship navigation + unified pages first, existing protocol detail pages remain untouched
5. **Single Source of Truth** -- `nav.tsx` remains the sole nav configuration; Sidebar and MobileNav consume it unchanged

### Decision Drivers (top 3)
1. **Route strategy** -- How to handle new routes alongside existing ones without breaking anything
2. **Data unification** -- How to normalize MorphoMarket and AaveMarket into a single type for unified views (APR vs APY normalization)
3. **Redirect mechanism** -- Where to implement backward-compatible redirects (next.config vs middleware vs page-level)

### Options

#### Option A: New Route Groups + next.config Redirects (RECOMMENDED)
Create new route groups `(earn)/` and `(borrow)/` only. Keep existing `(defi)/`, `(trade)/`, `(more)/` route groups intact. The Manage and Trade nav groups point to existing routes (no new route groups needed). Add `redirects()` in `next.config.ts` for convenience paths.

**Pros:**
- Zero risk of breaking existing pages -- old route groups untouched
- Redirects at config level are fast (no JS execution)
- Clean separation between old and new routes
- No route collisions -- Manage items point to existing `(more)/` and `(defi)/` pages

**Cons:**
- Temporary duplication of route groups (earn/borrow alongside defi)
- Two entry points for same content (e.g., `/earn/supply` and `/morpho/supply`)

#### Option B: In-Place Refactor of Existing Route Groups
Rename `(defi)/` to split across `(earn)/` and `(borrow)/`, move items from `(trade)/` and `(more)/`.

**Pros:**
- No duplication, cleaner file tree immediately

**Cons:**
- High risk of breaking existing protocol pages during refactor
- Git history becomes harder to follow
- All-or-nothing deployment -- cannot ship incrementally

**Option B invalidation rationale:** The spec explicitly requires "existing individual protocol pages must still work." An in-place refactor creates a window where old URLs break during development. Option A avoids this entirely by keeping old route groups intact.

---

## ADR

**Decision:** Option A -- New route groups `(earn)/` and `(borrow)/` alongside existing ones. Manage and Trade nav groups point directly to existing routes (no `(manage)/` or `(trade-new)/` route groups). `next.config.ts` redirects for convenience paths.

**Drivers:** Backward compatibility is non-negotiable. The spec requires existing protocol routes to keep working. Route collision avoidance is critical -- `/dashboard`, `/agent`, `/bridge` already exist under `(more)/` and `(defi)/` respectively, so we must NOT create duplicate page files for these routes.

**Alternatives Considered:** Option B (in-place refactor) was rejected because it cannot guarantee backward compatibility during development and prevents incremental shipping.

**Why Chosen:** Option A allows us to ship new navigation and unified pages without touching any existing route code. Old URLs redirect cleanly. Manage group items simply reference existing routes, avoiding any route collision. Only truly new pages (`/earn/supply`, `/borrow/lending`) need new route groups.

**Consequences:**
- Temporary file tree duplication (earn/borrow groups alongside defi)
- Need to maintain redirect list as routes evolve
- Developers must know to create new features in new route groups
- When user navigates from unified page to protocol-specific page (e.g., `/morpho/supply`), no sidebar item will be active (known limitation, mitigated by `matchPaths` on NavItem)
- Old route groups `(defi)/`, `(trade)/`, `(more)/` are permanent -- they host protocol-specific pages that remain the canonical destinations

**Follow-ups:**
- Migrate Faucet page from standalone `faucet/` to `(more)/faucet/` (optional, low priority)
- Consider adding protocol sub-navigation within unified pages (breadcrumb or tabs)

---

## Guardrails

### Must Have
- All 4 nav groups render in Sidebar and MobileNav
- `/earn/supply` shows both Morpho and Aave supply markets with APY normalized
- `/borrow/lending` shows both Morpho and Aave borrow markets with APY normalized
- `/morpho`, `/morpho/supply`, `/morpho/borrow`, `/aave`, `/aave/supply`, `/aave/borrow` still resolve (existing pages, untouched)
- Homepage feature cards link to new routes in a 2x2 grid
- No changes to ABIs, addresses.ts, or domain hook internals
- Manage group includes `/dashboard`, `/analytics`, `/agent`, `/chat`, `/bridge`, `/faucet`

### Must NOT Have
- No changes to Options module files
- No new smart contract deployments
- No modifications to existing protocol page components (Morpho/Aave supply/borrow pages)
- No removal of existing route groups (they are permanent)
- No creation of page files under `(manage)/` -- all Manage nav items point to existing routes
- No new `(trade-new)/` route group -- Trade nav items point to existing `(trade)/` and `(defi)/` routes

---

## Task Flow (6 Steps)

### Step 0: Resolve nav.tsx Working Tree State
**Files to verify:**
- `apps/web/src/shared/config/nav.tsx`

**What to do:**
The working tree has a modified `nav.tsx` from a previously resolved merge conflict. Verify the file is in a clean, parseable state (no conflict markers like `<<<<<<<`, `=======`, `>>>>>>>`). If any remain, resolve them by keeping the `title`-based interface (not the `label`-based variant from the conflicting branch).

This is a verification step only. Step 2 will fully rewrite this file, so any residual issues will be overwritten.

**Acceptance Criteria:**
- [ ] `nav.tsx` has no merge conflict markers
- [ ] File compiles without TypeScript errors
- [ ] Sidebar renders correctly with current nav groups

---

### Step 1: Unified Market Types + Hooks (with APR/APY normalization)
**Files to create:**
- `apps/web/src/domains/defi/unified/types.ts`
- `apps/web/src/domains/defi/unified/lib/rateConversion.ts`
- `apps/web/src/domains/defi/unified/hooks/useUnifiedSupplyMarkets.ts`
- `apps/web/src/domains/defi/unified/hooks/useUnifiedBorrowMarkets.ts`

**What to do:**

1. Create `rateConversion.ts` with two functions:
   - `aprToAPY(aprPercent: number, compoundingPeriods = 365): number` -- converts simple APR percentage to compound APY percentage. Formula: `((1 + apr / (100 * n))^n - 1) * 100`
   - `apyToAPR(apyPercent: number, compoundingPeriods = 365): number` -- inverse conversion. Formula: `n * ((1 + apy / 100)^(1/n) - 1) * 100`

2. Define a `UnifiedSupplyMarket` type that normalizes both `MorphoMarket` and `AaveMarket`:
   ```
   { protocol: "morpho" | "aave", id: string, name: string, asset: string,
     supplyAPY: number, totalSupply: bigint, utilization?: number,
     ltv: number, price: bigint, raw: MorphoMarket | AaveMarket }
   ```
   - Both Morpho and Aave already provide `supplyAPY` as a percentage, so no conversion is needed for the supply side.

3. Define a `UnifiedBorrowMarket` type with borrow-specific fields:
   ```
   { protocol: "morpho" | "aave", id: string, name: string, asset: string,
     borrowAPY: number, borrowAPR: number, availableLiquidity: bigint,
     totalBorrow: bigint, liquidationThreshold: number, price: bigint,
     raw: MorphoMarket | AaveMarket }
   ```
   - **Morpho source**: has `borrowAPR`. Convert to APY using `aprToAPY()`.
   - **Aave source**: has `borrowAPY`. Convert to APR using `apyToAPR()`.
   - Store BOTH `borrowAPY` and `borrowAPR` on the unified type. Display APY by default.

4. `useUnifiedSupplyMarkets()` calls both `useMorphoMarkets()` and `useAaveMarkets()`, maps each to `UnifiedSupplyMarket[]`, merges and sorts by supplyAPY descending.

5. `useUnifiedBorrowMarkets()` same pattern. When mapping Morpho markets, call `aprToAPY(market.borrowAPR)` for the `borrowAPY` field. When mapping Aave markets, call `apyToAPR(market.borrowAPY)` for the `borrowAPR` field.

**Acceptance Criteria:**
- [ ] `aprToAPY(5)` returns approximately `5.1267%` (daily compounding)
- [ ] `apyToAPR(aprToAPY(x))` round-trips to within 0.001% of x
- [ ] `useUnifiedSupplyMarkets()` returns a merged array containing markets from both protocols
- [ ] `useUnifiedBorrowMarkets()` returns markets with both `borrowAPY` and `borrowAPR` fields populated
- [ ] Each item has a `protocol` discriminator field
- [ ] Each item preserves the `raw` original market object for protocol-specific actions
- [ ] `isLoading` is true until both underlying hooks resolve
- [ ] All files compile with zero TypeScript errors

---

### Step 2: Navigation Config Rewrite + Sidebar matchPaths Support
**Files to modify:**
- `apps/web/src/shared/config/nav.tsx`
- `apps/web/src/shared/components/layout/Sidebar.tsx`
- `apps/web/src/shared/components/layout/MobileNav.tsx`

**What to do:**

1. Add an optional `matchPaths` field to `NavItem`:
   ```ts
   export interface NavItem {
     href: string;
     label: string;
     icon: (className: string) => React.ReactNode;
     matchPaths?: string[];  // additional path prefixes that activate this nav item
   }
   ```

2. Update the active state logic in both `Sidebar.tsx` and `MobileNav.tsx`:
   ```ts
   const isActive =
     pathname === item.href ||
     (item.href !== "/" && pathname.startsWith(item.href)) ||
     (item.matchPaths?.some((p) => pathname.startsWith(p)) ?? false);
   ```

3. Rewrite `NAV_GROUPS` to 4 groups. All hrefs point to existing routes or new unified pages. No `(manage)/` route group needed:

   ```
   Earn:
     - /earn/supply     "Supply"       (Landmark)    matchPaths: ["/morpho/supply", "/aave/supply"]
     - /yield           "Yield Vaults" (Vault)
     - /stake           "LP Staking"   (Coins)

   Borrow:
     - /borrow/lending  "Lending"      (Building2)   matchPaths: ["/morpho/borrow", "/aave/borrow"]
     - /liquity         "CDP"          (HandCoins)   matchPaths: ["/liquity/borrow", "/liquity/earn"]

   Trade:
     - /swap            "Swap"         (ArrowLeftRight)
     - /pool            "Pool"         (Droplets)
     - /pool/positions  "Positions"    (Layers)
     - /forward         "ForwardX"     (TrendingUp)

   Manage:
     - /dashboard       "Dashboard"    (LayoutDashboard)
     - /analytics       "Analytics"    (BarChart3)
     - /agent           "Agent"        (Bot)
     - /chat            "Chat"         (MessageSquare)
     - /bridge          "Bridge"       (Link2)
     - /faucet          "Faucet"       (GlassWater)
   ```

   Key routing decisions:
   - `/yield` (not `/earn/vaults`) -- points directly to existing `(defi)/yield/page.tsx`
   - `/stake` (not `/earn/staking`) -- points directly to existing `(defi)/stake/page.tsx`
   - `/liquity` (not `/borrow/cdp`) -- points directly to existing `(defi)/liquity/page.tsx`
   - `/dashboard`, `/analytics`, `/agent`, `/chat` -- point to existing `(more)/` pages
   - `/bridge` -- points to existing `(defi)/bridge/page.tsx`
   - `/faucet` -- points to existing standalone `faucet/page.tsx`
   - Only `/earn/supply` and `/borrow/lending` are truly new routes needing new page files

**Acceptance Criteria:**
- [ ] `NAV_GROUPS` has exactly 4 groups: Earn, Borrow, Trade, Manage
- [ ] Manage group includes all 6 items: Dashboard, Analytics, Agent, Chat, Bridge, Faucet
- [ ] `NavItem` interface has optional `matchPaths` field
- [ ] Sidebar highlights "Supply" when pathname is `/morpho/supply` or `/aave/supply`
- [ ] Sidebar highlights "Lending" when pathname is `/morpho/borrow` or `/aave/borrow`
- [ ] Sidebar renders 4 group headings with correct items
- [ ] MobileNav renders all items from new groups with same active-state logic
- [ ] Existing Trade group items (`/swap`, `/pool`, `/pool/positions`) keep their exact hrefs
- [ ] No changes to Sidebar/MobileNav structure beyond the `isActive` logic update

---

### Step 3: New Route Groups + Unified Pages
**Files to create:**
- `apps/web/src/app/(earn)/earn/supply/page.tsx` -- Unified Supply page
- `apps/web/src/app/(borrow)/borrow/lending/page.tsx` -- Unified Borrow page
- `apps/web/src/app/(earn)/layout.tsx` -- layout file (can re-export root layout or be minimal)
- `apps/web/src/app/(borrow)/layout.tsx` -- layout file

**What to do:**

Only TWO new page files are needed. The other nav items (`/yield`, `/stake`, `/liquity`, `/dashboard`, etc.) point directly to existing routes -- no wrapper pages, no redirects.

**Unified Supply Page (`/earn/supply`) details:**
- Uses `useUnifiedSupplyMarkets()` from Step 1
- Renders a table/card grid with: protocol badge (Morpho/Aave), asset name, Supply APY, Total Supply, LTV
- Includes a protocol filter toggle (All / Morpho / Aave)
- Each row links to the existing protocol-specific supply page (`/morpho/supply` or `/aave/supply`) for the actual supply action
- Shows "No Aave markets available" gracefully if Aave has no active markets

**Unified Borrow Page (`/borrow/lending`) details:**
- Uses `useUnifiedBorrowMarkets()` from Step 1
- Same layout pattern as Supply page but with borrow-specific columns: Borrow APY (primary), Borrow APR (secondary/tooltip), Available Liquidity, Liquidation Threshold
- Each row links to existing protocol borrow page for action

**Routing note:** Next.js route groups with parentheses `(earn)` don't affect the URL. So `(earn)/earn/supply/page.tsx` maps to `/earn/supply`. The existing `(defi)/morpho/...` routes continue to work since we are not removing them.

**Acceptance Criteria:**
- [ ] `/earn/supply` renders a page showing markets from both Morpho and Aave
- [ ] `/borrow/lending` renders a page showing borrow markets from both protocols
- [ ] Borrow markets display APY as the primary rate metric
- [ ] Protocol filter works (All / Morpho / Aave)
- [ ] Existing routes `/morpho/supply`, `/aave/supply`, `/liquity/borrow` etc. still work
- [ ] No layout conflicts between old and new route groups
- [ ] No route collisions (only 2 new URL paths: `/earn/supply` and `/borrow/lending`)
- [ ] Layout files exist for `(earn)` and `(borrow)` route groups

---

### Step 4: Backward-Compatible Redirects
**Files to modify:**
- `apps/web/next.config.ts`

**What to do:**
Add a `redirects()` function to `next.config.ts` that maps old convenience paths to new ones:

```ts
async redirects() {
  return [
    { source: "/lend", destination: "/earn/supply", permanent: false },
    { source: "/earn", destination: "/earn/supply", permanent: false },
    { source: "/borrow", destination: "/liquity", permanent: false },
  ];
}
```

Use `permanent: false` (302) during this phase so search engines don't cache old paths permanently while we validate.

Notes:
- `/morpho`, `/aave`, `/liquity` need NO redirects -- their pages still exist under `(defi)/`
- `/earn` bare path redirects to `/earn/supply` (the unified supply page)
- `/lend` redirects to `/earn/supply` (old homepage card target)
- `/borrow` redirects to `/liquity` (old homepage card target, CDP is the primary borrow product)

**Acceptance Criteria:**
- [ ] `/lend` redirects (302) to `/earn/supply`
- [ ] `/earn` (bare) redirects (302) to `/earn/supply`
- [ ] `/borrow` (bare) redirects (302) to `/liquity`
- [ ] `/morpho`, `/aave`, `/liquity` still work directly (no redirect, old pages intact)
- [ ] Redirects use 302 (temporary)
- [ ] No redirect loops

---

### Step 5: Homepage Update
**Files to modify:**
- `apps/web/src/app/page.tsx`

**What to do:**
1. Update the `FEATURES` array to reflect the new 4-group structure:
   ```ts
   const FEATURES = [
     { href: "/swap", title: "Swap", desc: "Trade tokens with concentrated liquidity AMM", icon: <ArrowLeftRight />, gradient: "from-blue-500/20 to-cyan-500/20" },
     { href: "/earn/supply", title: "Supply", desc: "Earn yield across Morpho and Aave markets", icon: <Landmark />, gradient: "from-emerald-500/20 to-teal-500/20" },
     { href: "/borrow/lending", title: "Borrow", desc: "Compare borrow rates across lending protocols", icon: <Building2 />, gradient: "from-amber-500/20 to-orange-500/20" },
     { href: "/yield", title: "Earn", desc: "Auto-compound yield vaults and LP staking", icon: <Vault />, gradient: "from-purple-500/20 to-pink-500/20" },
   ];
   ```

2. Change the grid layout from `lg:grid-cols-3` to `grid-cols-2` for a 2x2 layout:
   ```
   grid grid-cols-1 sm:grid-cols-2 gap-6
   ```
   This gives a clean 2x2 grid on tablet+ and stacked on mobile. Remove the `lg:grid-cols-3` breakpoint.

3. Update hero subtitle to: "The unified DeFi protocol on Creditcoin. Supply, Borrow, Swap, and Earn in one seamless experience."

**Acceptance Criteria:**
- [ ] Homepage feature cards link to `/swap`, `/earn/supply`, `/borrow/lending`, `/yield`
- [ ] All 4 card links resolve to working pages (no 404)
- [ ] Grid layout is 2x2 on sm+ screens (`sm:grid-cols-2`, no `lg:grid-cols-3`)
- [ ] Visual layout remains consistent (gradients, icons, hover effects)
- [ ] Hero subtitle updated to mention "Supply, Borrow, Swap, and Earn"

---

## Known Limitations

1. **Sidebar active state on deep protocol pages:** When a user clicks a row in `/earn/supply` and navigates to `/morpho/supply`, the "Supply" nav item stays highlighted via `matchPaths`. However, if the user navigates directly to `/morpho` (the Morpho overview page, not supply-specific), no Earn/Borrow nav item will be active. This is acceptable -- the Morpho overview is a protocol landing page, not a purpose-specific page.

2. **Aave markets may be empty:** If Aave V3 has no active markets on the testnet, the unified pages will show Morpho markets only. The UI should handle this gracefully (no empty table, just Morpho rows).

3. **APR/APY rounding:** The conversion between APR and APY introduces small floating-point differences. Display values should be rounded to 2 decimal places.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Route group conflicts (two groups claiming same URL) | Low (mitigated) | High | Only 2 new routes created; no Manage/Trade-new route groups. Test with `next build`. |
| Unified hooks cause extra RPC calls | Low | Medium | Both hooks already use `refetchInterval`; unified hook only runs on unified pages |
| APR/APY conversion confusion | Medium | Medium | Store both APR and APY on UnifiedBorrowMarket; display APY prominently with APR in tooltip |
| MobileNav active state with matchPaths | Low | Low | Same logic applied to both Sidebar and MobileNav |
| Aave markets return empty | Known | Low | Unified page gracefully filters; shows Morpho-only when Aave is empty |

---

## File Impact Summary

| Action | Path | Description |
|--------|------|-------------|
| CREATE | `src/domains/defi/unified/types.ts` | Unified market types |
| CREATE | `src/domains/defi/unified/lib/rateConversion.ts` | APR-to-APY and APY-to-APR conversion functions |
| CREATE | `src/domains/defi/unified/hooks/useUnifiedSupplyMarkets.ts` | Aggregated supply hook |
| CREATE | `src/domains/defi/unified/hooks/useUnifiedBorrowMarkets.ts` | Aggregated borrow hook |
| MODIFY | `src/shared/config/nav.tsx` | Rewrite NAV_GROUPS to 4 groups + add matchPaths to NavItem |
| MODIFY | `src/shared/components/layout/Sidebar.tsx` | Update isActive logic to support matchPaths |
| MODIFY | `src/shared/components/layout/MobileNav.tsx` | Update isActive logic to support matchPaths |
| CREATE | `src/app/(earn)/layout.tsx` | Layout for earn route group |
| CREATE | `src/app/(earn)/earn/supply/page.tsx` | Unified supply page |
| CREATE | `src/app/(borrow)/layout.tsx` | Layout for borrow route group |
| CREATE | `src/app/(borrow)/borrow/lending/page.tsx` | Unified borrow page |
| MODIFY | `next.config.ts` | Add redirects() for /lend, /earn, /borrow |
| MODIFY | `src/app/page.tsx` | Update feature cards + grid layout + hero text |

**Total: 8 new files, 5 modified files**
**Existing files untouched: All protocol pages under (defi)/, all protocol hooks, all ABIs, all (more)/ pages**
**Explicitly NOT created: (manage)/ route group, (trade-new)/ route group, wrapper/redirect pages for /yield, /stake, /liquity, /dashboard, /analytics, /agent, /chat, /bridge, /faucet**

---

## Revision Changelog (v2)

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | CRITICAL | Route collision: `(manage)/dashboard/page.tsx` would collide with `(more)/dashboard/page.tsx`. Same for `/agent`, `/bridge`. | Removed `(manage)/` route group entirely. Manage nav items point directly to existing routes. No new page files for Manage group. |
| 2 | CRITICAL | Working tree has unresolved merge conflict markers in nav.tsx. | Added Step 0 to verify/resolve. Noted that Step 2 fully rewrites the file. Confirmed via git diff that working tree is already clean. |
| 3 | MAJOR | APR vs APY normalization: Morpho uses `borrowAPR` (simple), Aave uses `borrowAPY` (compound). | Added `rateConversion.ts` with `aprToAPY()` and `apyToAPR()`. UnifiedBorrowMarket stores both fields. Display normalized to APY. Documented the math. |
| 4 | MAJOR | Wrapper pages strategy was ambiguous (redirect vs re-export). | Eliminated wrapper pages entirely. Nav items for existing content (`/yield`, `/stake`, `/liquity`, `/dashboard`, etc.) point directly to existing routes. Only truly new pages (`/earn/supply`, `/borrow/lending`) get new files. |
| 5 | MAJOR | Sidebar active state breaks on protocol sub-pages. | Added `matchPaths` optional field to `NavItem`. Updated Sidebar.tsx and MobileNav.tsx active-state logic. Documented remaining known limitation. |
| 6 | MAJOR | Missing `/analytics` and `/chat` from new nav. | Added both to Manage group (6 items total). |
| 7 | MINOR | "Phase 2: remove old route groups" was incorrect -- routes are permanent. | Removed from ADR follow-ups. Old route groups host canonical protocol pages. |
| 8 | MINOR | Steps 4 and 5 both modified homepage `page.tsx`. | Consolidated homepage changes into a single Step 5. Step 4 is now redirects-only. |
| 9 | MINOR | Homepage grid was `lg:grid-cols-3` for 4 cards. | Changed to `sm:grid-cols-2` (2x2 grid). |
| 10 | MINOR | Sidebar.tsx and MobileNav.tsx were listed as "no changes needed" but now need matchPaths update. | Added to Step 2 scope and file impact summary. Updated total to 5 modified files. |
