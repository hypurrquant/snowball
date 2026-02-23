# Ticket 4b: Cleanup dead imports and final verification

**Phase:** 4 (Cleanup)
**Depends on:** 4a, 3a-3e

## Task

Remove all dead imports and verify no backend transaction/data calls remain.

### Verification commands
```bash
# No transaction fetch calls remain
grep -r "fetch.*agent/execute" src/     # 0 results
grep -r "fetch.*agent/adjust-rate" src/ # 0 results
grep -r "fetch.*sp/" src/               # 0 results

# No data fetch calls remain (except agent-related)
grep -r "fetch.*user/" src/             # 0 results
grep -r "fetch.*protocol/" src/         # 0 results

# API_BASE only used by agent hooks
grep -r "API_BASE" src/                 # only in useAgents, useAgentHistory, useAgentReputation, useAgentRecommend

# Build passes
pnpm build
```

### Remaining API_BASE consumers (correct — these stay)
- `src/hooks/useAgents.ts`
- `src/hooks/useAgentHistory.ts`
- `src/hooks/useAgentReputation.ts`
- `src/hooks/useAgentRecommend.ts`

### CHAT_API_BASE consumers (correct — stays)
- `src/hooks/useChat.ts`

## Acceptance Criteria
- [ ] All verification commands pass
- [ ] `pnpm build` passes with 0 errors
- [ ] E2E: all transactions work without backend running
