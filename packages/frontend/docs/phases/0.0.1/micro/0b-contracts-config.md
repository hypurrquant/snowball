# Ticket 0b: Create contracts config module

**Phase:** 0 (Infrastructure)
**Depends on:** 0a
**Blocks:** 1a-1c, 2a-2d, 3a-3e

## Task

Create `src/config/contracts.ts` — centralized contract address resolution and parsed ABIs.

## File: `src/config/contracts.ts` (NEW)

### Exports
- `abis` — object with parsed ABIs for all contract types
- `getBranchAddresses(branch: 0 | 1)` — returns all addresses for a branch
- `getCollToken(branch: 0 | 1)` — returns collateral token address
- `getSbUSDToken()` — returns sbUSD address
- `BRANCH_SYMBOLS` — `['wCTC', 'lstCTC']`

### Implementation
- Import ABIs from `@snowball/shared` (BorrowerOperationsABI, TroveManagerABI, StabilityPoolABI, etc.)
- Parse using viem's `parseAbi()`
- Read addresses from `./addresses.json`

## Acceptance Criteria
- [ ] All ABI imports resolve from `@snowball/shared`
- [ ] `getBranchAddresses(0).borrowerOperations` returns correct address
- [ ] `pnpm build` passes
