# Ticket 0a: Add @snowball/shared dependency

**Phase:** 0 (Infrastructure)
**Depends on:** None
**Blocks:** 0b, 0c, 0d

## Task

Add `@snowball/shared` as a workspace dependency to the frontend package.

## Changes

### `package.json`
- Add `"@snowball/shared": "workspace:*"` to `dependencies`

### Verification
```bash
pnpm install
pnpm build   # verify shared package resolves correctly
```

## Acceptance Criteria
- [ ] `import { BorrowerOperationsABI } from '@snowball/shared'` compiles
- [ ] `pnpm build` passes
