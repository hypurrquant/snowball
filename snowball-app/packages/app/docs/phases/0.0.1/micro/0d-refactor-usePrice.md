# Ticket 0d: Refactor usePrice to use shared modules

**Phase:** 0 (Infrastructure)
**Depends on:** 0b, 0c

## Task

Refactor `src/hooks/usePrice.ts` to use the shared PublicClient and ABI from contracts config instead of inline definitions.

## File: `src/hooks/usePrice.ts` (MODIFY)

### Changes
- Remove inline `createPublicClient()` (lines 6-9)
- Remove inline `priceFeedAbi` definition (lines 12-19)
- Import `publicClient` from `@/config/publicClient`
- Import `abis` from `@/config/contracts`
- Use `abis.priceFeed` instead of inline ABI

## Acceptance Criteria
- [ ] usePrice hook returns same data as before
- [ ] No inline PublicClient or ABI definitions remain
- [ ] `pnpm build` passes
