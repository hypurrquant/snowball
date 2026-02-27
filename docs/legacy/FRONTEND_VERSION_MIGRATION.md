# Frontend Version Migration Walkthrough

This document summarizes the changes made during the frontend tech stack upgrade to improve project maintainability and compatibility with modern features.

## Dependency Upgrades
- **Next.js**: Upgraded from `^15.1.0` to `^16.1.6` with the removal of experimental `--turbopack` flags since it is now standard.
- **React**: Updated version bounds to `19.2.0`/`19.2.4` and related `@types` configs.
- **Privy & Wagmi Ecosystem**:
  - `@privy-io/react-auth` bumped from v2 to v3 (`3.14.1`).
  - `@privy-io/wagmi` bumped from v1 to v4 (`4.0.2`).
  - `wagmi` bumped from v2 to v3 (`3.5.0`).
- **Charting Libraries**:
  - `lightweight-charts` bumped from `^4.2.0` to `5.1.0`.
  - `recharts` bumped from `2.15.4` to `3.7.0`.
- **Quality tooling**: Migrated from legacy ESLint schemas to modern flat configs (`eslint.config.mjs`) handling Next v16 integrations and ESLint `v10.0.2`. Also bumped `tailwind-merge` to v3.

## Code Modifications
- **Wagmi v3 Refactoring**:
  - Handled the renaming of wagmi's hook behavior via global find/replace routines (translated target `useAccount` functions to equivalent `useConnection` instances where standard mapping applied).
  - Resolved `useBalance` type breakage. As wagmi v3 removed the `token: Address` param for generic ERC20 lookups, a backwards-compatible `useTokenBalance.ts` custom hook wrap using `useReadContract` alongside `erc20Abi` was created to safely stub legacy usages without rewriting internal file component logic.
- **Visuals and UI Components**:
  - Migrated outdated Shadcn UI `recharts` components referencing legacy prop signatures (`ChartTooltipContent` / `ChartLegendContent`) to intercept the refactored types by explicitly expanding `payload`, `active`, and `label` properties.
  - Swapped lightweight-charts invocation code from `.addCandlestickSeries()` to the explicit `.addSeries(CandlestickSeries)` pattern.
- **Privy Initialization & Docker Base Image**: Minor internal key realignments inside `providers.tsx` handling embedding behavior and bumped local Node runtimes up to v22 LTS architectures.

## Verification
Automated checks via `pnpm run build` returned cleanly without syntax errors across the 14 application bounds.
> [!IMPORTANT]
> To fully conclude the upgrade cycle, Step 10 from the original Spec is yet to be tackled: **interactive local behavior testing**. Please boot up the site components locally (`pnpm dev`) to trigger testnet swap features and Privy login sequences visually!
