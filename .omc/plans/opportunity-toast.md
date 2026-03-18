# Work Plan: Opportunity Toast (온체인 기회 토스트 + Agent SaaS CTA)

**Spec:** `.omc/specs/deep-interview-opportunity-banner.md`
**Date:** 2026-03-18
**Complexity:** MEDIUM
**Scope:** 4 new files + 1 modified file

---

## RALPLAN-DR Summary

### Principles
1. **Non-intrusive UX** — Toasts must not disrupt user workflows; frequency limits are mandatory, not optional.
2. **Reuse existing hooks** — APY data comes from `useAaveMarkets` / `useMorphoMarkets`; balance from `useTokenBalance`. No new RPC calls for data already available.
3. **Separation of concerns** — Detection logic (hook), presentation (component), persistence (storage util) are distinct modules.
4. **Progressive enhancement** — Agent CTA links to `/agent` in MVP. Payment gating is explicitly Phase 2.
5. **Testability** — Storage layer is pure functions over localStorage; detector hook is independently testable via mock market data.

### Decision Drivers (Top 3)
1. **How to render custom toast content** — sonner supports `toast.custom(jsx)` for fully custom JSX. This is the critical integration point.
2. **APY delta detection strategy** — Need to compare current vs previous APY across polling cycles. Must persist "previous" snapshot to detect 2%p+ changes.
3. **Where to mount the detector** — Must be inside `<Providers>` (for wagmi context) but global (not per-page). Root layout is the only viable location.

### Options Evaluated

#### Option A: sonner `toast.custom()` with dedicated component (CHOSEN)
- **Pros:** Full control over toast JSX, consistent with existing `<Toaster />` in layout, no new dependencies, supports dismiss callbacks natively.
- **Cons:** Must import `toast` from `"sonner"` directly (not currently used elsewhere in the codebase, but this is the standard pattern).

#### Option B: Render custom portal-based toast without sonner
- **Pros:** Zero coupling to sonner internals.
- **Cons:** Reimplements positioning, animation, stacking, auto-dismiss — all things sonner already handles. Significantly more code and maintenance burden. **Invalidated:** Duplicates existing infrastructure with no benefit.

### ADR

- **Decision:** Use `sonner` `toast.custom()` API to render `<OpportunityToast>` as custom toast content. Detect APY changes via `useRef` snapshot comparison in `useOpportunityDetector`. Store frequency/dismiss state in `localStorage` via `opportunityStorage.ts`.
- **Drivers:** Existing sonner `<Toaster>` already mounted in layout; `toast.custom()` gives full JSX control while inheriting positioning, animation, and stacking behavior for free.
- **Alternatives considered:** Custom portal-based toast system — invalidated because it duplicates sonner's positioning/animation/stacking logic with no benefit.
- **Why chosen:** Minimal new code, leverages existing infrastructure, keeps toast behavior (position, animation, auto-dismiss) consistent with any future standard toasts.
- **Consequences:** Direct dependency on sonner's `toast.custom()` API. If sonner is ever replaced, this component needs migration. Acceptable risk given sonner is already a core dependency.
- **Follow-ups:** Phase 2 adds payment CTA pricing to Agent button. Phase 3 could add push notifications as an alternative delivery channel.

---

## Context

The Snowball DeFi frontend needs proactive opportunity notifications that surface APY changes, idle asset suggestions, and new incentives as non-intrusive toasts. Each toast includes two CTAs: [직접 실행] (navigate to protocol page) and [Agent 자동화 →] (navigate to `/agent` page). MVP scope excludes payment integration.

### Codebase Facts (gathered from exploration)
- **sonner** is already installed; `<Toaster />` is mounted in `app/layout.tsx` (line 47). No `toast()` calls exist yet in the codebase — this will be the first usage.
- **`useAaveMarkets()`** polls every 15s, returns `AaveMarket[]` with `supplyAPY` and `borrowAPY` fields (numbers, already converted from ray).
- **`useMorphoMarkets()`** polls every 10s, returns `MorphoMarket[]` with `supplyAPY` and `borrowAPR` fields (numbers).
- **`useTokenBalance()`** returns `{ data: { value: bigint, decimals, symbol } }` for ERC20 tokens.
- **`TOKEN_INFO`** maps address to `{ symbol, name, decimals, mockPriceUsd }` — `mockPriceUsd` enables USD valuation for idle asset detection.
- **`IncentiveCreated`** event exists in `packages/core/src/abis/staker.ts` and the `STAKER` address config is available.
- **Agent page** exists at `/agent` (route group `(more)`).
- **`NextActionBanner`** provides design language reference: `border-l-ice-400`, `bg-bg-card`, `shadow-[0_0_20px_rgba(96,165,250,0.12)]`, `animate-slide-up`.

---

## Work Objectives

Build 3 new files and update 1 existing file to deliver real-time DeFi opportunity toasts with dual CTAs.

---

## Guardrails

### Must Have
- 3 trigger types: APY change (2%p+), idle assets ($100+), new incentives
- Dual CTA buttons on every toast: [직접 실행] + [Agent 자동화 →]
- Frequency limits: max 3/day, 24h cooldown on dismiss, localStorage-backed
- Mount inside `<Providers>` in root layout
- ice-blue themed styling consistent with `NextActionBanner`

### Must NOT Have
- Payment/subscription logic (Phase 2)
- User-configurable thresholds (Phase 2)
- Push notifications (Phase 3)
- Backend API calls — this is entirely frontend/on-chain
- Modifications to existing hooks (`useAaveMarkets`, `useMorphoMarkets`, `useTokenBalance`)

---

## Task Flow

### Step 1: localStorage Frequency/Dismiss Manager

**File:** `apps/web/src/shared/lib/opportunityStorage.ts`

**What:** Pure utility module (no React) that manages toast frequency limiting and dismiss cooldowns in localStorage.

**Key implementation details:**
- localStorage key: `"snowball:opportunity-toast"` storing JSON `{ dailyCount: number, dailyResetDate: string, dismissed: Record<string, number> }` where dismissed values are epoch timestamps
- `canShowToast(): boolean` — returns false if dailyCount >= 3 or dailyResetDate is not today
- `recordToastShown(): void` — increments dailyCount, resets if new day
- `dismissOpportunity(id: string): void` — stores current timestamp for the opportunity ID
- `isDismissed(id: string): boolean` — returns true if dismissed within last 24 hours (86400000 ms)
- `generateOpportunityId(type: string, key: string): string` — deterministic ID from trigger type + market/token identifier (e.g., `"apy:aave-wCTC-supply"`)

**Acceptance Criteria:**
- [ ] `canShowToast()` returns false after 3 calls to `recordToastShown()` on same calendar day
- [ ] `canShowToast()` resets to true on a new calendar day
- [ ] `isDismissed("x")` returns true within 24h of `dismissOpportunity("x")`, false after
- [ ] All state survives page reload (localStorage)
- [ ] Handles missing/corrupt localStorage gracefully (returns permissive defaults)

---

### Step 2: Custom Toast Component

**File:** `apps/web/src/shared/components/OpportunityToast.tsx`

**What:** "use client" component that renders the custom toast JSX. Receives opportunity data as props; does NOT contain detection logic.

**Key implementation details:**
- Props: `{ id: string; icon: string; title: string; description: string; directAction: { label: string; href: string }; agentHref: string; onDismiss: (id: string) => void }`
- Layout mirrors spec wireframe: icon + title row, description row, two-button CTA row
- [직접 실행] button: `next/link` to `directAction.href`
- [Agent 자동화 →] button: `next/link` to `agentHref` (always `/agent` in MVP)
- [X] dismiss button: calls `onDismiss(id)`
- Styling: Inherit from `NextActionBanner` design tokens — `bg-bg-card`, `border border-border-hover/40`, `border-l-4 border-l-ice-400`, `shadow-[0_0_20px_rgba(96,165,250,0.12)]`, `rounded-2xl`
- Responsive: `max-w-sm` for mobile, text wraps gracefully

**Acceptance Criteria:**
- [ ] Renders title, description, and both CTA buttons
- [ ] [직접 실행] navigates to the provided `directAction.href`
- [ ] [Agent 자동화 →] navigates to `/agent`
- [ ] [X] dismiss fires `onDismiss` callback with the opportunity ID
- [ ] Visual styling matches ice-blue theme (border-l-ice-400 accent)
- [ ] Responsive on mobile viewports (< 640px)

---

### Step 3: Opportunity Detector Hook

**File:** `apps/web/src/shared/hooks/useOpportunityDetector.ts`

**What:** "use client" hook that consumes existing market/balance hooks, detects opportunities, and fires toasts via `toast.custom()` from sonner.

**Key implementation details:**

**APY change detection:**
- Consume `useAaveMarkets()` and `useMorphoMarkets()`
- Store previous APY values in `useRef<Map<string, number>>`
- On each data update, compare current vs previous; if delta >= 2.0 (percentage points), fire toast
- Update ref after comparison
- Generate opportunity ID: `"apy:{protocol}-{symbol}-{type}"` (e.g., `"apy:aave-wCTC-supply"`)
- Direct action href: protocol-specific supply/borrow page (e.g., `/aave/supply`, `/morpho/supply`)
- Description includes estimated annual yield: `balance * deltaAPY` (use `TOKEN_INFO[address].mockPriceUsd` for USD conversion)

**Idle asset detection:**
- Consume `useAccount()` for wallet address
- For each token in `TOKEN_INFO`, call `useTokenBalance` — but since hooks can't be called in a loop, use `useReadContracts` with batched `balanceOf` calls for all tokens
- Calculate USD value: `(balance / 10^decimals) * mockPriceUsd`
- If any token USD value >= $100, fire toast (once per session + on balance changes)
- Generate opportunity ID: `"idle:{symbol}"`
- Direct action href: best available yield page (pick highest APY from Aave/Morpho markets matching that token)

**New incentive detection:**
- Use `useWatchContractEvent` from wagmi to listen for `IncentiveCreated` events on `STAKER.snowballStaker`
- ABI already exported from `@/core/abis` (staker ABI includes `IncentiveCreated` event)
- On event, fire toast with incentive details
- Generate opportunity ID: `"incentive:{startTime}-{pool}"`
- Direct action href: `/stake`

**Toast firing (shared):**
- Before firing, check `canShowToast()` and `!isDismissed(id)` from opportunityStorage
- Call `toast.custom((t) => <OpportunityToast ... onDismiss={() => { dismissOpportunity(id); toast.dismiss(t); }} />)`
- After firing, call `recordToastShown()`
- Return value: `void` (side-effect-only hook)

**Acceptance Criteria:**
- [ ] APY 2%p+ increase triggers a toast with correct protocol name and APY value
- [ ] Toast is NOT fired if same opportunity was dismissed within 24h
- [ ] Toast is NOT fired if 3 toasts already shown today
- [ ] Idle asset toast fires for wallet balances >= $100 USD equivalent
- [ ] IncentiveCreated event triggers a toast with pool/reward info
- [ ] No toast fires when wallet is disconnected (graceful no-op)
- [ ] Previous APY ref initializes silently on first render (no false-positive toast on mount)

---

### Step 4: Mount Detector in Root Layout

**File:** `apps/web/src/app/layout.tsx` (modify existing)

**What:** Add `<OpportunityDetectorMount />` wrapper component inside `<Providers>`, just before `<Toaster />`.

**Key implementation details:**
- Create a thin client component wrapper (can be inline in the same file or a separate tiny file) since layout.tsx is a server component
- The wrapper simply calls `useOpportunityDetector()` and returns `null`
- Place it right before the existing `<Toaster />` line for logical grouping
- Since layout.tsx is a server component, the detector must be its own `"use client"` component file. Create `apps/web/src/shared/components/OpportunityDetectorMount.tsx` as a 5-line wrapper:
  ```
  "use client";
  import { useOpportunityDetector } from "@/shared/hooks/useOpportunityDetector";
  export function OpportunityDetectorMount() { useOpportunityDetector(); return null; }
  ```
- Import and render `<OpportunityDetectorMount />` in layout.tsx before `<Toaster />`

**Acceptance Criteria:**
- [ ] `OpportunityDetectorMount` is rendered inside `<Providers>` (has access to wagmi context)
- [ ] Layout still renders correctly (no visual changes)
- [ ] Toast appears when opportunity conditions are met on any page
- [ ] No hydration errors (component is properly marked "use client")
- [ ] Build passes with no TypeScript errors

---

## File Summary

| File | Action | Layer |
|------|--------|-------|
| `apps/web/src/shared/lib/opportunityStorage.ts` | NEW | shared/lib |
| `apps/web/src/shared/components/OpportunityToast.tsx` | NEW | shared/components |
| `apps/web/src/shared/hooks/useOpportunityDetector.ts` | NEW | shared/hooks |
| `apps/web/src/shared/components/OpportunityDetectorMount.tsx` | NEW | shared/components |
| `apps/web/src/app/layout.tsx` | MODIFY | app |

---

## Success Criteria

1. APY 2%p+ change on Aave or Morpho markets triggers a styled toast notification
2. Idle wallet assets worth $100+ trigger a personalized recommendation toast
3. New staker incentive creation triggers an incentive toast
4. Every toast has [직접 실행] (protocol page) and [Agent 자동화 →] (`/agent`) buttons that navigate correctly
5. Max 3 toasts/day enforced; dismissed toasts suppressed for 24h
6. No regressions — existing layout, hooks, and toast infrastructure untouched
7. Mobile-responsive toast rendering
8. TypeScript build passes cleanly

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| `toast.custom()` from sonner not yet used in codebase — unfamiliar API surface | sonner docs confirm `toast.custom(jsx)` is stable; test with a hardcoded toast first |
| Batched `balanceOf` calls for idle asset detection need all token addresses | Use `Object.keys(TOKEN_INFO)` which has 4 entries — small fixed set |
| `useWatchContractEvent` may miss events if user navigates away during emission | Acceptable for MVP — incentive creation is infrequent. Phase 2 could add polling fallback |
| First render APY comparison would trigger false positives | Initialize `prevApyRef` on first successful data fetch, skip comparison on first cycle |
