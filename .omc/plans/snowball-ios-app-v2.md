# Snowball iOS App - Revised Work Plan (v2)

> **RALPLAN-DR Consensus Plan** | Revision after Critic/Architect rejection of v1
> **Date**: 2026-03-17
> **Status**: REVISED - Awaiting user confirmation

---

## Context

Snowball Protocol is a DeFi frontend (Next.js + wagmi + viem) targeting Creditcoin Testnet (chainId: 102031). The user wants a native iOS companion app that is AI-agent-centric, with a hybrid terminal+chat UI, hybrid LLM (local+cloud), WalletConnect wallet integration, all MVP protocols, and direct on-chain communication (no backend dependency).

### Codebase Facts (verified)

- **Addresses**: 74 unique contract addresses in MVP scope (excluding 5 Options + 3 Bridge)
  - Tokens: 4, DEX: 4, Liquity: 28 (2 branches x 11 + 6 shared), Morpho: 8, Yield: 11, ERC-8004: 5, Aave: 6, Forward: 9, Staker: 1, Multicall3: 1
- **ABIs**: 35 exported ABI constants across 9 files (excluding Options), ~481 lines total
  - `agent-runtime/src/abis.ts` has 64 lines of minimal ABI subsets used by the agent
- **Web Agent Runtime** (`packages/agent-runtime/`): Implements exactly **4 capabilities** across **2 protocols**:
  - `morpho.supply`, `morpho.withdraw` (Morpho/Lend)
  - `liquity.adjustInterestRate`, `liquity.addCollateral` (Liquity)
- **Agent architecture**: Observer->Planner->Executor pipeline; Planner uses Claude API (Anthropic SDK) with tool_use to select capabilities; Executor sends txs via `writeContract`
- **Gas model**: No evidence of EIP-1559 usage in app code; Creditcoin testnet gas model unverified
- **LLM integration**: `anthropic-planner.ts` calls Claude API with `tool_use` pattern; system prompt loaded from file; max_tokens=1024

---

## RALPLAN-DR Summary

### Principles (5)

1. **Agent-First**: The AI agent is the primary interaction mode, not a secondary feature
2. **Cloud-Primary LLM**: Claude API is the reliable backbone for structured intent extraction; local LLM is an optimization layer for simple classifications only
3. **Explicit User Consent**: Every on-chain transaction requires explicit user approval via WalletConnect; no auto-signing
4. **Parity Before Expansion**: iOS MVP must match web agent-runtime scope (2 protocols, 4 capabilities) before adding new protocols
5. **TypeScript Reuse Maximization**: Minimize reimplementation of existing TypeScript logic (ABIs, addresses, math)

### Decision Drivers (top 3)

1. **Code reuse vs native performance**: `packages/core/` contains 74 addresses, 35 ABIs, and precision-critical financial math. Rewriting in another language introduces correctness risk.
2. **LLM reliability**: Structured JSON intent extraction requires a capable model. Cloud Claude is proven in the codebase. Local models (Phi-3-mini 4K context, INT4) cannot reliably produce tool_use-compatible JSON.
3. **Signing UX reality**: WalletConnect v2 is a remote signing protocol. The wallet app ALWAYS prompts the user. There is no mechanism to suppress this. The signing UX must be designed around this constraint.

### Technology Decision: Swift vs React Native

#### Option A: React Native (Expo) -- RECOMMENDED

**Rationale**: With cloud-primary LLM as baseline, the original v1 argument for Swift (local LLM latency) is invalidated. The dominant driver becomes code reuse.

| Factor | Assessment |
|--------|-----------|
| `packages/core/` reuse | Direct import of addresses.ts, ABIs, TOKEN_INFO via monorepo. Zero porting. |
| `agent-runtime` reuse | Can import the entire `packages/agent-runtime/` package. Observer/Planner/Executor pipeline works as-is with viem. |
| BigInt support | Native JS BigInt works in Hermes engine (RN 0.76+). No library needed for 10^54 intermediates. |
| WalletConnect | `@walletconnect/react-native-compat` + `@web3modal/wagmi-react-native` is the official RN integration path. |
| Local LLM (optional) | `react-native-executorch` supports Phi-3-mini. Used only for offline classification, NOT for structured JSON. |
| Terminal UI | react-native-reanimated + custom terminal component. No native equivalent advantage. |
| Test vectors | Not needed -- same TypeScript code runs on both platforms. |
| Team velocity | Same language (TypeScript) as existing codebase. No Swift learning curve. |

**Bounded cons**:
- JS bridge overhead for heavy computation (~5-15ms per cross-bridge call, negligible for DeFi tx flows)
- Hermes engine startup slightly slower than native (~200ms, one-time)
- Expo EAS build pipeline adds CI complexity vs Xcode-only

#### Option B: Native Swift

**Rationale**: Maximum platform integration, best animation performance, full iOS API access.

| Factor | Assessment |
|--------|-----------|
| `packages/core/` reuse | Must rewrite all 74 addresses + 35 ABIs in Swift. Manual sync required on every contract update. |
| `agent-runtime` reuse | Must rewrite Observer/Planner/Executor in Swift. ~600 lines of TypeScript to port. |
| BigInt support | Requires `attaswift/BigInt` SPM package. Swift UInt64 caps at ~10^19; Morpho math needs 10^54. Must verify arithmetic correctness independently. |
| WalletConnect | Swift WalletConnect SDK exists but less mature than RN. |
| Local LLM | Core ML / llama.cpp direct integration. Better performance ceiling. |
| Terminal UI | UIKit/SwiftUI custom views. Comparable effort to RN. |
| Test vectors | REQUIRED: Must generate golden test cases from TypeScript `encodeFunctionData` output to verify Swift ABI encoding matches exactly. |
| Team velocity | Requires Swift expertise. Separate codebase to maintain. |

**Bounded cons**:
- 74 addresses + 35 ABIs to manually port and keep in sync
- ~2,500 lines of precision-critical financial math to rewrite and verify
- `attaswift/BigInt` is less battle-tested than JS BigInt for DeFi
- Two separate codebases to maintain long-term

#### Invalidated Options

- **Flutter**: Dart ecosystem has no mature WalletConnect SDK or viem equivalent. Web3 tooling is minimal.
- **PWA/Capacitor**: Does not meet "native iOS app" requirement. No local LLM support.

### ADR: Technology Choice

- **Decision**: React Native (Expo) with TypeScript
- **Drivers**: Code reuse (D1), LLM reliability already solved by cloud (D2), signing UX identical across both options (D3)
- **Alternatives considered**: Native Swift (Option B above)
- **Why chosen**: With cloud-primary LLM, the dominant differentiator is code reuse. RN allows direct import of `packages/core/` and `packages/agent-runtime/`, eliminating ~3,000 lines of porting, the BigInt library question, and the cross-language test vector requirement entirely. The original Swift justification (local LLM latency) was based on a faulty premise -- local LLM is only used for simple classification, not structured JSON.
- **Consequences**: Depends on Hermes engine BigInt support (stable since RN 0.76). JS bridge overhead is negligible for DeFi transaction flows. Team must learn Expo EAS if not already familiar.
- **Follow-ups**: If local LLM performance becomes critical in a future version, a Swift-based LLM module can be added via native module without rewriting the entire app.

---

## Work Objectives

Build a React Native (Expo) iOS app that reuses `packages/core/` and `packages/agent-runtime/` to provide an AI-agent-centric DeFi experience matching the web agent's current 2-protocol, 4-capability scope.

---

## Guardrails

### Must Have
- Cloud Claude API as primary LLM for all structured intent extraction
- WalletConnect v2 with explicit user approval for every transaction
- MVP scope matches web agent: Morpho (supply/withdraw) + Liquity (adjustInterestRate/addCollateral)
- Direct RPC to Creditcoin Testnet (no backend)
- Terminal + chat hybrid UI
- All 74 MVP addresses from `packages/core/src/config/addresses.ts`

### Must NOT Have
- Auto-signing or suppressed wallet approval (impossible with WC v2)
- Options or Bridge protocol support (excluded from MVP per CLAUDE.md)
- Local LLM for structured JSON / tool_use extraction (unreliable with 4K context Phi-3-mini)
- New agent capabilities beyond the 4 that exist in web agent-runtime
- Backend server dependency for core agent operations

---

## Task Flow

### Step 1: Project Scaffolding + Core Integration

**What**: Initialize Expo project within the monorepo, configure it to import `packages/core/` and `packages/agent-runtime/`.

**Deliverables**:
- `apps/ios/` directory with Expo + TypeScript config
- `metro.config.js` configured to resolve `packages/core` and `packages/agent-runtime`
- `tsconfig.json` path aliases matching monorepo structure
- Verify: `import { TOKENS, DEX, LIQUITY, LEND } from '@snowball/core/config/addresses'` compiles and runs
- Verify: `import { AgentRuntime } from '@snowball/agent-runtime'` compiles

**Acceptance Criteria**:
- [ ] `npx expo start --ios` launches successfully on simulator
- [ ] Console log prints all 74 MVP addresses imported from `packages/core`
- [ ] BigInt literals from addresses.ts (e.g., `770000000000000000n` LLTV) work correctly in Hermes
- [ ] Agent runtime module resolves without bundler errors

**Estimated effort**: 2-3 days

---

### Step 2: WalletConnect Integration + Signing UX

**What**: Integrate WalletConnect v2 for wallet connection and transaction signing. Design the signing UX around WC v2's mandatory user-approval model.

**Deliverables**:
- WalletConnect v2 integration via `@walletconnect/react-native-compat` + `@web3modal/wagmi-react-native`
- Wallet connection flow: QR scan or deep link to MetaMask/Trust Wallet
- Transaction signing flow:
  1. Agent proposes action with human-readable summary (e.g., "Supply 100 sbUSD to Morpho wCTC/sbUSD market")
  2. App displays TX preview card: target contract, function, parameters, estimated gas
  3. User taps "Approve" which triggers WC `eth_sendTransaction`
  4. Wallet app opens, user confirms in wallet
  5. App shows pending state, then confirmation with tx hash
- Network configuration: Creditcoin Testnet (chainId 102031, RPC URL from `packages/core`)
- Gas estimation: Use `eth_estimateGas` RPC call; display in CTC with USD estimate using TOKEN_INFO mock prices

**Acceptance Criteria**:
- [ ] Can connect to MetaMask Mobile via WalletConnect QR
- [ ] Can read connected wallet's CTC balance and token balances
- [ ] TX preview shows contract address, function name, decoded parameters
- [ ] Wallet approval is ALWAYS required (no auto-sign path exists)
- [ ] Failed/rejected transactions show clear error state in app
- [ ] Gas estimation works on Creditcoin Testnet (determine EIP-1559 vs legacy at this step)

**Estimated effort**: 3-4 days

---

### Step 3: Agent Runtime Integration + Cloud LLM

**What**: Wire up the existing `packages/agent-runtime/` to work in the mobile context, with Claude API as the primary planner.

**Deliverables**:
- Mobile-adapted agent runtime that replaces `privateKeyToAccount` + `walletClient.writeContract` with WalletConnect signing
- Modified executor that:
  1. Builds PreparedCall[] as before
  2. Instead of direct `writeContract`, queues calls for user approval (Step 2's TX preview flow)
  3. Awaits WC confirmation before proceeding to next step
  4. Refreshes snapshot between steps (existing behavior)
- Claude API integration:
  - API key stored in iOS Keychain (NOT in bundle or env vars)
  - Uses existing `anthropic-planner.ts` logic: build snapshot -> build tools from capabilities -> call Claude -> extract tool_use blocks
  - System prompt loaded from bundled asset
  - Token budget: max_tokens=1024 (matches web)
- Network error handling:
  - RPC call retry with exponential backoff (3 retries, 1s/2s/4s)
  - Claude API retry (2 retries, 2s/4s)
  - Timeout: RPC 10s, Claude API 30s
  - Offline detection: show "No network" state, disable agent

**Acceptance Criteria**:
- [ ] Agent can build snapshot from on-chain data via RPC (Morpho position, Liquity trove, vault balances)
- [ ] Claude API receives snapshot + available tools, returns structured plan
- [ ] Each plan step is presented to user as TX preview before WC signing
- [ ] Retry logic handles transient RPC failures gracefully
- [ ] API key is stored in Keychain, never logged or exposed

**Estimated effort**: 4-5 days

---

### Step 4: Terminal + Chat Hybrid UI

**What**: Build the agent-centric UI with a terminal-style output log and natural language input.

**Deliverables**:
- Chat input bar: natural language text input + send button
- Terminal output area (scrollable, monospace):
  - Agent reasoning (from Claude's text blocks)
  - Step-by-step execution log (from runtime logs[])
  - TX status updates (pending -> confirmed -> hash link to Blockscout)
  - Error messages with actionable context
- Wallet status header: connected address (truncated), CTC balance, network indicator
- Portfolio summary card: Morpho supply position, Liquity trove status (collateral/debt/rate)
- Activity history: past agent runs with status, tx hashes, timestamps
- Dark theme by default (terminal aesthetic)

**Acceptance Criteria**:
- [ ] User can type "supply 100 sbUSD to morpho" and agent processes it
- [ ] Terminal shows real-time execution: snapshot building, planning, each tx step
- [ ] TX cards appear inline in terminal with approve/reject buttons
- [ ] Blockscout explorer links work via deep link (`https://creditcoin-testnet.blockscout.com/tx/{hash}`)
- [ ] Portfolio data refreshes after successful agent run

**Estimated effort**: 4-5 days

---

### Step 5: Local LLM Layer (Optional Enhancement)

**What**: Add local Phi-3-mini for offline intent classification ONLY. Cloud Claude remains primary for all structured operations.

**Deliverables**:
- `react-native-executorch` integration with Phi-3-mini INT4 model (~2GB bundled or downloaded on first launch)
- Local LLM used ONLY for:
  - Binary classification: "Is this a DeFi command or a general question?"
  - Simple intent routing: "morpho" vs "liquity" vs "portfolio" vs "help"
  - Offline fallback: display cached portfolio data + explain that agent actions require network
- Cloud Claude used for ALL:
  - Structured tool_use extraction
  - Multi-step planning
  - Parameter extraction (amounts, tokens, etc.)
- LLM routing logic:
  - If network available: always use Cloud Claude for agent operations
  - If network unavailable: local LLM for classification + "offline" message for actions
  - Local LLM system prompt: under 500 tokens (fits within 4K context with room for user input)

**Acceptance Criteria**:
- [ ] Local model loads and responds within 3 seconds on iPhone 14+
- [ ] Classification accuracy >90% on a test set of 50 DeFi commands vs general questions
- [ ] Cloud Claude is NEVER bypassed for actual transaction planning
- [ ] App works without local model (graceful degradation if download fails)
- [ ] Model download is optional and shows progress indicator

**Estimated effort**: 3-4 days

---

### Step 6: Testing, Polish + App Store Prep

**What**: End-to-end testing on Creditcoin Testnet, error handling hardening, and TestFlight preparation.

**Deliverables**:
- E2E test scenarios on Creditcoin Testnet:
  1. Connect wallet -> view portfolio -> supply to Morpho -> verify on-chain
  2. Connect wallet -> adjust Liquity interest rate -> verify on-chain
  3. Attempt action with insufficient balance -> verify error handling
  4. Network disconnection mid-operation -> verify recovery
  5. WC session expiry -> verify reconnection flow
- Token approval flow: check existing allowance before requesting new approval; cache approval state
- Error boundary: catch all unhandled errors, show recovery UI (not crash)
- App icon, splash screen, basic App Store metadata
- TestFlight build via Expo EAS

**Acceptance Criteria**:
- [ ] All 5 E2E scenarios pass on Creditcoin Testnet
- [ ] No crashes during 30 minutes of continuous usage
- [ ] Token approvals are checked before sending (avoid unnecessary approve txs)
- [ ] TestFlight build installs and runs on physical device
- [ ] Blockscout links correctly open transaction details

**Estimated effort**: 3-4 days

---

## Detailed Address Inventory (74 MVP addresses)

| Section | Count | Notes |
|---------|-------|-------|
| Tokens (wCTC, lstCTC, sbUSD, USDC) | 4 | Shared across protocols |
| DEX / Uniswap V3 | 4 | factory, swapRouter, nftPositionManager, quoterV2 |
| Liquity wCTC branch | 11 | addressesRegistry through priceFeed |
| Liquity lstCTC branch | 11 | Same structure, different addresses |
| Liquity shared | 6 | collateralRegistry, hintHelpers, multiTroveGetter, redemptionHelper, debtInFrontHelper, agentVault |
| Morpho / Lend | 8 | snowballLend, adaptiveCurveIRM, 3 oracles, 3 market IDs (bytes32, not addresses but tracked) |
| Yield Vaults | 11 | 4 vaults x (address + strategy) + 3 morphoMarketId refs |
| ERC-8004 / Agent | 5 | identityRegistry, reputationRegistry, validationRegistry, agentVault (shared), agentEOA |
| Aave V3 | 6 | pool, poolAddressesProvider, poolConfigurator, aclManager, oracle, dataProvider |
| ForwardX | 9 | exchange, vault, marketplace, settlementEngine, consumer, oracleGuard, viewHelper, positionNFT (=exchange), collateralToken ref |
| SnowballStaker | 1 | snowballStaker |
| Multicall3 | 1 | Standard multicall |
| **Excluded: Options** | 5 | Per CLAUDE.md MVP exclusion |
| **Excluded: Bridge** | 3 | Not in MVP scope |

Note: `agentVault` (0x7bca6...) appears in both Liquity.shared and ERC8004 (same contract). `ForwardX.exchange` and `ForwardX.positionNFT` share the same address. Actual unique addresses = 74.

---

## Protocol Scope: MVP vs Future

### MVP (matches web agent-runtime)
| Protocol | Capabilities | Status |
|----------|-------------|--------|
| Morpho (Lend) | `morpho.supply`, `morpho.withdraw` | Exists in agent-runtime |
| Liquity (Borrow) | `liquity.adjustInterestRate`, `liquity.addCollateral` | Exists in agent-runtime |

### Future (requires new capability development)
| Protocol | Potential Capabilities | Status |
|----------|----------------------|--------|
| DEX (Uniswap V3) | swap, addLiquidity | Not implemented in agent-runtime |
| Yield Vaults | deposit, withdraw | Not implemented |
| Aave V3 | supply, borrow, repay | Not implemented |
| ForwardX | openPosition, closePosition | Not implemented |
| ERC-8004 | registerAgent, submitReview | Not implemented (governance, not DeFi actions) |

Adding new protocols to iOS is straightforward once they are implemented in `packages/agent-runtime/` -- the RN app imports them directly.

---

## Gas Strategy

**To be determined in Step 2**:
- Creditcoin Testnet gas model (EIP-1559 or legacy) must be verified empirically by sending a test transaction
- If EIP-1559: use `maxFeePerGas` + `maxPriorityFeePerGas` from `eth_feeHistory`
- If legacy: use `gasPrice` from `eth_gasPrice`
- Gas buffer: multiply estimate by 1.2x for safety margin
- Display: show estimated gas in CTC, with USD equivalent using TOKEN_INFO mockPriceUsd ($5.00/CTC)

---

## Security Considerations

- **API Key Storage**: Claude API key in iOS Keychain via `expo-secure-store`. Never in AsyncStorage, bundle, or logs.
- **No Private Keys**: App never holds private keys. All signing via WalletConnect to external wallet.
- **RPC Endpoint**: Hardcoded to Creditcoin Testnet RPC. No user-configurable RPC (prevents phishing).
- **Input Sanitization**: Agent input sanitized before sending to Claude API (strip injection attempts).
- **WC Session**: Auto-disconnect after 30 minutes of inactivity. Session data in Keychain.

---

## Pre-Mortem (3 failure scenarios)

### Scenario 1: Hermes BigInt Edge Case
**What**: Hermes engine's BigInt implementation has an edge case with Morpho's 10^54 intermediate calculations (supplyShares * totalAssets / totalShares).
**Likelihood**: Low (BigInt is spec-compliant since RN 0.76, and we use the same viem code that works on web).
**Mitigation**: Add a smoke test in Step 1 that computes known Morpho math cases (10^54 intermediates) in Hermes and compares to expected results from Node.js.

### Scenario 2: WalletConnect Session Instability
**What**: WC v2 sessions drop frequently on mobile due to background app suspension, causing agent runs to fail mid-execution.
**Likelihood**: Medium (known issue with mobile WC).
**Mitigation**: Implement session health check before each agent run. Auto-reconnect flow. Design executor to be resumable -- if a multi-step plan fails at step N, allow retry from step N after reconnection.

### Scenario 3: Claude API Latency on Mobile Networks
**What**: Claude API calls take 5-10 seconds on 4G, making the agent feel unresponsive.
**Likelihood**: Medium-High.
**Mitigation**: Streaming response display in terminal UI (show reasoning as it arrives). Cache common snapshots to reduce observer latency. Show "Agent is thinking..." with elapsed timer. Pre-build snapshot while user is typing.

---

## Expanded Test Plan

### Unit Tests
- Address/ABI import verification: all 74 addresses resolve correctly
- BigInt arithmetic: Morpho share-to-asset conversion with 10^54 intermediates
- Agent capability precondition checks with mock snapshots
- TX preview card rendering with various parameter types

### Integration Tests
- Full agent pipeline: mock snapshot -> Claude API -> plan -> TX preview (mocked WC)
- WalletConnect connection + disconnection lifecycle
- RPC retry logic with simulated failures
- Keychain storage/retrieval of API key

### E2E Tests (Creditcoin Testnet)
- 5 scenarios listed in Step 6
- Token approval + supply flow end-to-end
- Multi-step agent plan execution (e.g., approve then supply)

### Observability
- Agent run logging: all logs[] from runtime saved to local SQLite for debugging
- Claude API call metrics: latency, token usage, tool_use success rate
- TX tracking: hash, status, gas used, block number
- Crash reporting: Sentry or equivalent via `sentry-expo`

---

## Success Criteria

1. App connects to wallet, reads portfolio from Creditcoin Testnet, displays Morpho/Liquity positions
2. User types natural language command, agent plans and executes with explicit user approval at each TX
3. All 4 web agent capabilities (morpho.supply, morpho.withdraw, liquity.adjustInterestRate, liquity.addCollateral) work on iOS
4. Terminal UI shows real-time agent reasoning and execution logs
5. No private keys ever touch the app; all signing via WalletConnect
6. Cloud Claude API is the sole LLM for structured operations; local LLM (if included) is classification-only

---

## Estimated Timeline

| Step | Duration | Dependencies |
|------|----------|-------------|
| 1. Scaffolding + Core Integration | 2-3 days | None |
| 2. WalletConnect + Signing UX | 3-4 days | Step 1 |
| 3. Agent Runtime + Cloud LLM | 4-5 days | Steps 1, 2 |
| 4. Terminal + Chat UI | 4-5 days | Step 3 |
| 5. Local LLM (optional) | 3-4 days | Step 4 |
| 6. Testing + Polish | 3-4 days | Steps 1-4 (5 optional) |
| **Total** | **19-25 days** | Steps 1-4 are sequential; 5 is parallel with 6 |

Without Step 5 (local LLM): **16-21 days**.

---

## Open Questions

See `.omc/plans/open-questions.md` for tracked items.
