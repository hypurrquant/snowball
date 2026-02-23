# PRD: Frontend-Only Transaction Architecture

**Phase:** 0.0.1
**Status:** Draft
**Date:** 2026-02-23

---

## 1. Problem Statement

All 7 user-initiated transaction types (openTrove, adjustTrove, closeTrove, adjustInterestRate, SP deposit/withdraw/claim) and 5 data-read operations currently route through a backend API that:

1. Receives parameters from frontend via `fetch()`
2. Calls `encodeFunctionData()` to build calldata
3. Returns an `unsignedTx` object to frontend
4. Frontend then calls `sendTransactionAsync(unsignedTx)` for user signing

**The backend does NOT compute SortedTroves hints** — it passes hardcoded `0, 0` for all hint parameters. Therefore the backend provides zero computational value for user-initiated transactions beyond simple ABI encoding, which viem/wagmi can do natively.

**Security concern is invalid:** Backend-built calldata offers no security benefit because the user can modify `to`, `data`, `value` before signing. All validation must happen at the smart contract level (and already does).

## 2. Objective

Eliminate backend dependency for all user-initiated transactions and on-chain data reads. The frontend will call smart contracts directly using wagmi's `useWriteContract` and viem's `readContract`/`multicall`.

## 3. Scope

### In Scope
- 7 transaction write operations → direct `writeContract` calls
- 5 data-read hooks → direct on-chain reads via viem PublicClient
- Shared contract config module (addresses + ABIs)
- Shared PublicClient with batch transport
- Deletion of `useAgentExecute` hook

### Out of Scope
- Backend AI features: chat (`/api/chat`), agent recommendations (`/api/agent/recommend`)
- Backend agent features: agent registry, history, reputation (`/api/agents/*`)
- Agent autonomous execution (backend must retain this capability)
- SortedTroves hint optimization (future improvement, not needed now)
- Backend endpoint deletion (endpoints remain for agent use)

## 4. User Impact

| Aspect | Before | After |
|--------|--------|-------|
| Transaction speed | ~1-3s backend round-trip before wallet popup | Wallet popup appears immediately |
| Failure modes | Backend down = no transactions possible | Only RPC down = no transactions |
| Step UI | idle → approving → building → signing → confirming → done | idle → approving → signing → confirming → done |
| Data freshness | Backend polling → frontend polling | Direct RPC polling (same intervals) |
| Architecture | Frontend → Backend → Chain | Frontend → Chain |

## 5. Technical Prerequisites

- `@snowball/shared` package contains all ABIs: `BorrowerOperationsABI`, `TroveManagerABI`, `StabilityPoolABI`, `ActivePoolABI`, `MockPriceFeedABI`
- `src/config/addresses.json` contains all contract addresses for both branches
- wagmi `^2.13.5` supports `useWriteContract`, `useReadContracts` (multicall)
- viem `^2.21.54` supports `encodeFunctionData`, `batch` transport, `multicall`

## 6. Success Criteria

1. All 7 transaction types work without backend running
2. All 5 data-read hooks return identical data shapes as current backend responses
3. `pnpm build` passes with zero errors
4. E2E test: connect wallet → open trove → adjust → close, all without backend
5. `useAgentExecute.ts` deleted with no remaining imports
6. No `fetch(API_BASE + '/agent/execute')` or `fetch(API_BASE + '/sp/...')` calls remain
7. Chat and agent features continue working via backend
