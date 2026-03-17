# Snowball iOS App — Implementation Plan

> **Mode**: RALPLAN-DR Short | **Date**: 2026-03-17
> **Status**: DRAFT — Awaiting user confirmation

---

## RALPLAN-DR Summary

### Principles (5)

1. **Agent-First Architecture** — The AI agent is the core product, not the UI. Every design decision flows from "how does the agent use this?" rather than "how does the user click this?"
2. **On-Chain Direct** — No backend server. The app communicates directly with Creditcoin Testnet RPC. This eliminates a dependency and aligns with DeFi trustlessness.
3. **Graceful Degradation** — Local LLM (Phi-3-mini via MLX) is primary, cloud API is fallback. The app must never be "stuck" because one inference path fails.
4. **Zero Key Custody** — The app never stores, generates, or handles private keys. WalletConnect v2 is the only signing path. Security posture is "we never had your keys."
5. **Protocol Parity** — The iOS app must support the same 5 protocol families as the web app (DEX, Liquity, Morpho, Yield, ERC-8004), using identical contract addresses and ABIs from `packages/core/`.

### Decision Drivers (Top 3)

| # | Driver | Why It Matters |
|---|--------|---------------|
| 1 | **MVP delivery speed** | First iOS DeFi agent app on Creditcoin. Time-to-testnet-demo matters more than polish. |
| 2 | **Agent reliability** | If the agent cannot reliably parse intent and produce correct TX calldata, nothing else matters. The LLM + Skills system must be rock-solid on at least 2 protocols. |
| 3 | **Signing safety** | A single auto-signed TX that drains a wallet destroys trust permanently. The amount-threshold system and WalletConnect confirmation flow are non-negotiable. |

### Viable Options

#### Option A: Native Swift + MLX (Recommended)

| Aspect | Detail |
|--------|--------|
| Framework | SwiftUI + UIKit (terminal rendering) |
| LLM | MLX Swift (Phi-3-mini INT4) + cloud fallback |
| Web3 | web3.swift |
| Wallet | WalletConnect Swift SDK v2 |
| Pros | Best on-device LLM performance (Metal acceleration); native iOS feel; smallest binary (no JS bridge); Face ID integration is trivial |
| Cons | No code sharing with existing TypeScript codebase; web3.swift is less mature than ethers.js/viem; Swift ABI encoding requires manual work |
| Risk | web3.swift may lack some ABI encoding features (e.g., complex tuple structs for Morpho `marketParams`). Mitigation: use raw `eth_call` / `eth_sendRawTransaction` with manual ABI encoding via Swift `keccak256` + `ABIEncoder`. |

#### Option B: React Native + Expo

| Aspect | Detail |
|--------|--------|
| Framework | React Native + Expo |
| LLM | ONNX Runtime Mobile or TensorFlow Lite (no MLX) |
| Web3 | ethers.js or viem (direct reuse from monorepo) |
| Wallet | WalletConnect React Native SDK |
| Pros | Direct reuse of `packages/core/` TypeScript ABIs and addresses; faster initial development for web-familiar team; single language |
| Cons | On-device LLM performance is significantly worse (no Metal MLX path); terminal UI rendering is awkward in RN; bundle size bloat; JS bridge overhead for crypto operations |
| Risk | LLM latency will likely exceed the 3-second AC-006 requirement. ONNX Phi-3-mini on RN has reported 8-12s first-token latency on iPhone 15 Pro. |
| **Invalidation** | **AC-006 (< 3s first token) is a hard requirement. RN's LLM inference path cannot meet it without MLX. This option is viable only if the local LLM requirement is dropped (cloud-only), which contradicts the spec.** |

#### Option C: Flutter + Native MLX Bridge

| Aspect | Detail |
|--------|--------|
| Framework | Flutter (Dart) + Platform Channel to Swift MLX |
| LLM | MLX Swift via platform channel |
| Web3 | web3dart |
| Wallet | WalletConnect Dart SDK |
| Pros | Cross-platform potential (Android later); decent UI toolkit |
| Cons | Platform channel adds latency and complexity to LLM streaming; web3dart is even less mature than web3.swift; no code reuse with TS monorepo; Dart ecosystem for crypto is thin |
| **Invalidation** | **The spec explicitly states "no Android" for MVP. Flutter's only advantage (cross-platform) is irrelevant. The platform channel bridge to MLX adds unnecessary latency and failure modes for zero benefit.** |

**Decision: Option A (Native Swift + MLX)**

---

## Requirements Summary

### Functional Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| FR-01 | Natural language conversation to DeFi TX execution | AC-001 |
| FR-02 | Auto/manual signing based on configurable USD threshold | AC-002 |
| FR-03 | Local LLM with automatic cloud fallback | AC-003 |
| FR-04 | WalletConnect v2 external wallet connection | AC-004 |
| FR-05 | Terminal mode with CLI command input | AC-005 |
| FR-06 | Agent first-token latency < 3 seconds (local) | AC-006 |
| FR-07 | Natural language TX failure explanation | AC-007 |
| FR-08 | Face ID biometric session recovery | AC-008 |
| FR-09 | Terminal/Chat UI mode switching | AC-009 |

### Protocol Coverage (from existing codebase)

| Protocol | Priority | Key Contracts | Source File |
|----------|----------|---------------|-------------|
| DEX (Uniswap V3) | P1 | SwapRouter `0xec48...`, QuoterV2 `0x2383...`, Factory `0x0961...` | `packages/core/src/abis/dex.ts` |
| Liquity v2 | P1 | BorrowerOperations (wCTC: `0xb637...`, lstCTC: `0x8700...`), StabilityPool (wCTC: `0xf165...`, lstCTC: `0xec70...`) | `packages/core/src/abis/liquity.ts` |
| Morpho (SnowballLend) | P2 | SnowballLend `0x190a...`, 3 markets, 3 oracles | `packages/core/src/abis/lend.ts` |
| Yield Vaults | P2 | 4 vaults (StabilityPool, Morpho sbUSD/wCTC/USDC) | `packages/core/src/abis/yield.ts` |
| ERC-8004 Agent | P3 | IdentityRegistry `0x993C...`, AgentVault `0x7bca...` | `packages/core/src/abis/agent.ts` |

### Non-Functional Requirements

- Target: iOS 17+ (MLX Swift requires iOS 16+, but 17 for modern SwiftUI features)
- Network: Creditcoin Testnet only (chainId: 102031, RPC: `https://rpc.cc3-testnet.creditcoin.network`)
- No private key storage — ever
- No backend server dependency
- No Options module code

---

## Architecture

```
snowball-ios/
├── SnowballApp.swift                    # @main entry, environment injection
├── App/
│   ├── AppState.swift                   # Global observable state
│   ├── AppCoordinator.swift             # Navigation + mode switching
│   └── DependencyContainer.swift        # DI container
│
├── Features/
│   ├── Chat/
│   │   ├── ChatView.swift               # SwiftUI chat bubble UI
│   │   ├── ChatViewModel.swift          # Binds agent responses to UI
│   │   └── MessageBubble.swift          # Reusable message component
│   ├── Terminal/
│   │   ├── TerminalView.swift           # UIKit-backed terminal renderer
│   │   ├── TerminalViewModel.swift      # CLI command parser + history
│   │   └── ANSIRenderer.swift           # ANSI escape code rendering
│   ├── Agent/
│   │   ├── AgentOrchestrator.swift      # Core agent loop: intent → skill → TX
│   │   ├── IntentParser.swift           # NL → structured intent
│   │   ├── SkillRouter.swift            # Intent → correct protocol skill
│   │   └── ConversationManager.swift    # History, context window management
│   └── Settings/
│       ├── SettingsView.swift           # Wallet, LLM, threshold config
│       ├── WalletSettingsView.swift     # WC session management
│       └── ThresholdSettingsView.swift  # Auto-sign threshold config
│
├── Core/
│   ├── Skills/                          # Protocol-specific agent guides
│   │   ├── SwapSkill.swift              # DEX swap intent → TX builder
│   │   ├── BorrowSkill.swift            # Liquity trove operations
│   │   ├── EarnSkill.swift              # Stability Pool deposit/withdraw
│   │   ├── LendSkill.swift              # Morpho supply/borrow
│   │   ├── VaultSkill.swift             # Yield vault deposit/withdraw
│   │   └── AgentSkill.swift             # ERC-8004 registration/query
│   ├── CLI/
│   │   ├── CLIParser.swift              # Command tokenizer
│   │   ├── CLIRegistry.swift            # Available commands registry
│   │   └── Commands/                    # Individual CLI command handlers
│   │       ├── SwapCommand.swift
│   │       ├── BorrowCommand.swift
│   │       ├── BalanceCommand.swift
│   │       └── StatusCommand.swift
│   ├── Protocols/                       # On-chain interaction layer
│   │   ├── Config/
│   │   │   ├── Addresses.swift          # Port of packages/core/src/config/addresses.ts
│   │   │   └── TokenInfo.swift          # Token metadata (symbol, decimals, price)
│   │   ├── ABIs/
│   │   │   ├── DEXABI.swift             # Port of packages/core/src/abis/dex.ts
│   │   │   ├── LiquityABI.swift         # Port of packages/core/src/abis/liquity.ts
│   │   │   ├── MorphoABI.swift          # Port of packages/core/src/abis/lend.ts
│   │   │   ├── YieldABI.swift           # Port of packages/core/src/abis/yield.ts
│   │   │   ├── AgentABI.swift           # Port of packages/core/src/abis/agent.ts
│   │   │   └── ERC20ABI.swift           # ERC-20 approve/transfer/balanceOf
│   │   ├── DEXService.swift             # Swap, quote, pool queries
│   │   ├── LiquityService.swift         # Trove open/adjust/close, SP deposit/withdraw
│   │   ├── MorphoService.swift          # Supply, borrow, repay, collateral
│   │   ├── YieldService.swift           # Vault deposit/withdraw, getPricePerFullShare
│   │   └── ERC8004Service.swift         # Agent registration, reputation query
│   └── Wallet/
│       ├── WalletConnectManager.swift   # WC v2 session lifecycle
│       ├── SigningPolicy.swift          # Auto/manual threshold logic
│       └── TransactionBuilder.swift     # Raw TX construction + gas estimation
│
├── Infrastructure/
│   ├── LLM/
│   │   ├── LLMService.swift             # Protocol: generate(prompt) → AsyncStream<String>
│   │   ├── LocalLLMService.swift         # MLX Swift Phi-3-mini inference
│   │   ├── CloudLLMService.swift         # Claude/OpenAI API fallback
│   │   └── LLMFallbackCoordinator.swift  # Local-first with auto cloud fallback
│   ├── RPC/
│   │   ├── RPCClient.swift              # JSON-RPC 2.0 client for Creditcoin Testnet
│   │   ├── ABIEncoder.swift             # Solidity ABI encoding in Swift
│   │   └── ABIDecoder.swift             # Solidity ABI decoding in Swift
│   └── Keychain/
│       ├── KeychainService.swift        # iOS Keychain wrapper
│       └── BiometricAuth.swift          # Face ID / Touch ID
│
├── Resources/
│   ├── Models/                          # LLM model weights (downloaded on-demand)
│   └── Skills/                          # Protocol skill definitions (JSON/markdown)
│       ├── swap-skill.json
│       ├── borrow-skill.json
│       ├── earn-skill.json
│       ├── lend-skill.json
│       └── vault-skill.json
│
└── Tests/
    ├── AgentTests/
    │   ├── IntentParserTests.swift
    │   ├── SkillRouterTests.swift
    │   └── AgentOrchestratorTests.swift
    ├── CoreTests/
    │   ├── ABIEncoderTests.swift
    │   ├── DEXServiceTests.swift
    │   ├── LiquityServiceTests.swift
    │   └── SigningPolicyTests.swift
    └── IntegrationTests/
        ├── SwapE2ETests.swift
        └── BorrowE2ETests.swift
```

---

## Implementation Steps

### Step 1: Project Scaffold + Infrastructure Layer

**Objective**: Xcode project with SPM dependencies, RPC client talking to Creditcoin Testnet, and ABI encoding/decoding working.

**Files to create**:
- `SnowballApp.swift` — SwiftUI app entry point
- `App/DependencyContainer.swift` — Service registry
- `Infrastructure/RPC/RPCClient.swift` — JSON-RPC 2.0 over URLSession
- `Infrastructure/RPC/ABIEncoder.swift` — Solidity type encoding (address, uint256, bytes32, tuples)
- `Infrastructure/RPC/ABIDecoder.swift` — Decode `eth_call` return data
- `Core/Protocols/Config/Addresses.swift` — Direct port of all addresses from `packages/core/src/config/addresses.ts`
- `Core/Protocols/Config/TokenInfo.swift` — Token metadata
- `Core/Protocols/ABIs/*.swift` — All 6 ABI files ported to Swift structs

**Key details**:
- Chain config: `chainId = 102031`, RPC = `https://rpc.cc3-testnet.creditcoin.network`
- ABIEncoder must handle Morpho's `MarketParams` tuple: `(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)` — this is the most complex encoding needed
- Addresses.swift must contain all addresses exactly as in the TypeScript source (4 tokens, DEX 4 contracts, Liquity 2 branches + shared, Morpho + 3 oracles + 3 markets, 4 yield vaults, ERC-8004 5 contracts)
- Oracle prices use 1e36 scale — define `ORACLE_SCALE` constant
- SPM dependencies: web3.swift, WalletConnectSwift v2, MLX (apple/mlx-swift)

**Acceptance criteria**:
- [ ] `RPCClient` can call `eth_chainId` and return `102031`
- [ ] `RPCClient` can call `eth_call` on `TOKENS.wCTC.balanceOf(address)` and decode a `uint256`
- [ ] `ABIEncoder` correctly encodes a Morpho `MarketParams` tuple (verified against known market ID hash)
- [ ] `ABIEncoder` correctly encodes Uniswap `exactInputSingle` params tuple
- [ ] All 46+ contract addresses from `packages/core/src/config/addresses.ts` are present in `Addresses.swift`
- [ ] Project builds with zero warnings on Xcode 16+ / iOS 17 target

---

### Step 2: WalletConnect + Signing Policy

**Objective**: Users can connect an external wallet via WalletConnect v2, and the signing policy enforces auto/manual threshold.

**Files to create**:
- `Core/Wallet/WalletConnectManager.swift` — Session pairing, proposal, approval, disconnect
- `Core/Wallet/SigningPolicy.swift` — Threshold-based auto/manual decision
- `Core/Wallet/TransactionBuilder.swift` — Construct `eth_sendTransaction` payloads with gas estimation
- `Infrastructure/Keychain/KeychainService.swift` — Store WC session topic, threshold config
- `Infrastructure/Keychain/BiometricAuth.swift` — Face ID gate for session recovery + manual signing
- `Features/Settings/WalletSettingsView.swift` — QR scanner + session status
- `Features/Settings/ThresholdSettingsView.swift` — Slider/input for USD threshold

**Key details**:
- WalletConnect v2 relay: `wss://relay.walletconnect.com`
- Required chain: `eip155:102031` (Creditcoin Testnet)
- Required methods: `eth_sendTransaction`, `personal_sign`, `eth_signTypedData_v4`
- SigningPolicy logic:
  ```
  if estimatedUsdValue <= threshold → auto-sign (request WC sign without user confirmation)
  else → show confirmation sheet with TX details, require Face ID, then request WC sign
  ```
- USD value estimation uses `TOKEN_INFO.mockPriceUsd` from addresses config (wCTC=$5, lstCTC=$5.20, sbUSD=$1, USDC=$1)
- WC session topic stored in Keychain, recovered on app launch after Face ID
- On session disconnect/expiry: prompt reconnect, do not auto-reconnect without biometric

**Acceptance criteria**:
- [ ] AC-004: Can scan WC QR code, approve session on `eip155:102031`, see connected address
- [ ] AC-002: TX below threshold is sent to wallet without confirmation prompt; TX above threshold shows detail sheet + requires Face ID
- [ ] AC-008: App kill + relaunch → Face ID → WC session auto-recovers without re-scanning QR
- [ ] Disconnect button in settings properly terminates WC session
- [ ] Threshold is persisted across app launches (Keychain)

---

### Step 3: LLM Engine (Local + Cloud Fallback)

**Objective**: On-device Phi-3-mini inference via MLX Swift with automatic cloud API fallback. Streaming responses.

**Files to create**:
- `Infrastructure/LLM/LLMService.swift` — Protocol definition: `func generate(prompt: String, systemPrompt: String) -> AsyncThrowingStream<String, Error>`
- `Infrastructure/LLM/LocalLLMService.swift` — MLX Swift integration with Phi-3-mini INT4
- `Infrastructure/LLM/CloudLLMService.swift` — HTTP client for Claude API (or configurable)
- `Infrastructure/LLM/LLMFallbackCoordinator.swift` — Try local first, catch failure, switch to cloud seamlessly
- `Resources/Models/` — Model download manager (on-demand, not bundled)

**Key details**:
- MLX Swift: Use `apple/mlx-swift` package, `MLXModelFactory` for model loading
- Model: `microsoft/Phi-3-mini-4k-instruct` quantized to INT4 (~1.8GB)
- Model is NOT bundled in the app binary (App Store 4GB limit). Downloaded on first launch to `Application Support/Models/`
- Download shows progress bar; app is functional with cloud-only until download completes
- Fallback trigger conditions:
  - Model not yet downloaded → cloud
  - MLX inference throws error → cloud
  - First token latency exceeds 5s timeout → cancel local, switch to cloud
  - Device has < 2GB available RAM → cloud (check `os_proc_available_memory()`)
- Cloud API: User provides their own API key (stored in Keychain). No server proxy in MVP.
- System prompt template includes: protocol knowledge, available skills, current wallet state, token balances

**Acceptance criteria**:
- [ ] AC-006: Local LLM first-token latency < 3 seconds on iPhone 14 Pro or newer
- [ ] AC-003: If local model file is deleted/missing, cloud fallback activates within 1 second with no user action
- [ ] AC-003: If local inference crashes mid-response, cloud picks up (may restart response)
- [ ] Model download shows progress and can be cancelled/resumed
- [ ] Cloud API key is stored encrypted in Keychain, never logged or transmitted except to the API endpoint

---

### Step 4: Agent Core + Skills System

**Objective**: The central agent orchestrator that converts natural language into structured intents, routes to protocol-specific skills, builds TX calldata, and manages conversation flow.

**Files to create**:
- `Features/Agent/AgentOrchestrator.swift` — Main loop: user input → LLM → intent → skill → TX → result → LLM → response
- `Features/Agent/IntentParser.swift` — Extract structured intent from LLM output (action, protocol, params)
- `Features/Agent/SkillRouter.swift` — Map intent to correct Skill handler
- `Features/Agent/ConversationManager.swift` — Message history, context window trimming
- `Core/Skills/SwapSkill.swift` — DEX swap: parse amount/tokens, call QuoterV2, build SwapRouter TX
- `Core/Skills/BorrowSkill.swift` — Liquity: open/adjust/close trove with hint calculation
- `Core/Skills/EarnSkill.swift` — Stability Pool: provideToSP/withdrawFromSP
- `Core/Skills/LendSkill.swift` — Morpho: supply/withdraw/borrow/repay with MarketParams
- `Core/Skills/VaultSkill.swift` — Yield: deposit/withdraw with approve
- `Core/Skills/AgentSkill.swift` — ERC-8004: query agent info, reputation
- `Resources/Skills/*.json` — Skill definitions (natural language descriptions, parameter schemas, example phrases)

**Key details**:
- Agent loop (per user message):
  1. Append user message to conversation history
  2. Build system prompt: base instructions + available skills + wallet state (address, balances, positions)
  3. Call LLM (local or cloud) with conversation history
  4. Parse LLM output for structured intent block (JSON in markdown code fence)
  5. If intent found → route to skill → skill builds TX → present TX for signing
  6. If no intent → treat as informational response, display to user
  7. After TX result (success/failure) → feed result back to LLM for natural language summary

- Intent format (LLM output):
  ```json
  {
    "action": "swap",
    "protocol": "dex",
    "params": {
      "tokenIn": "wCTC",
      "tokenOut": "sbUSD",
      "amount": "1.5"
    }
  }
  ```

- Skill implementation detail for MVP protocols:

  **SwapSkill** (DEX):
  - Calls `QuoterV2.quoteExactInputSingle` for price quote
  - Builds `SwapRouter.exactInputSingle` calldata
  - Slippage: 1% default, configurable
  - Deadline: `block.timestamp + 300` (5 min)

  **BorrowSkill** (Liquity):
  - Must calculate hints via `HintHelpers.getApproxHint` + `SortedTroves.findInsertPosition`
  - Branch selection: wCTC or lstCTC based on user's collateral token
  - `maxUpfrontFee`: 5% of debt amount (reasonable default)
  - Interest rate: suggest 5% annual (mid-range), let user override

  **EarnSkill** (Liquity Stability Pool):
  - `StabilityPool.provideToSP(amount, doClaim=true)`
  - Must approve sbUSD to StabilityPool first
  - Show pending collateral gains before withdraw

  **LendSkill** (Morpho):
  - MarketParams tuple must be correctly constructed from `LEND.markets[].id` config
  - Oracle scale: 1e36 — needed for position health display
  - Approve loanToken to SnowballLend before supply/repay

  **VaultSkill** (Yield):
  - Approve want token to vault before deposit
  - Withdraw uses shares, not assets — must calculate: `shares = amount * totalSupply / balance`
  - Show `getPricePerFullShare` for yield display

- Error handling (AC-007):
  - TX revert → decode revert reason if available → feed to LLM: "The transaction reverted with reason X. Explain to the user what happened and suggest next steps."
  - Common reverts to handle: insufficient balance, insufficient allowance, slippage exceeded, trove below MCR

**Acceptance criteria**:
- [ ] AC-001: "Swap 1 wCTC to sbUSD" → agent produces correct SwapRouter calldata → TX succeeds on testnet
- [ ] AC-001: "Open a trove with 10 wCTC, borrow 20 sbUSD" → agent calculates hints, builds BorrowerOperations calldata → TX succeeds
- [ ] AC-007: Intentionally cause a revert (e.g., swap with 0 liquidity) → agent explains failure in natural language
- [ ] Agent maintains conversation context (follow-up: "now swap the rest" after a partial swap)
- [ ] Skill routing correctly differentiates "swap" (DEX), "borrow" (Liquity), "lend" (Morpho), "deposit into vault" (Yield)

---

### Step 5: Dual UI (Chat + Terminal)

**Objective**: Two UI modes — Chat (general users) and Terminal (power users) — with seamless switching.

**Files to create**:
- `Features/Chat/ChatView.swift` — Scrollable message list with bubbles
- `Features/Chat/ChatViewModel.swift` — Binds AgentOrchestrator to chat UI
- `Features/Chat/MessageBubble.swift` — User/agent/system/TX-status message types
- `Features/Terminal/TerminalView.swift` — UIKit `UITextView` wrapped in SwiftUI for monospace rendering
- `Features/Terminal/TerminalViewModel.swift` — Line-by-line input, command history (up/down arrow)
- `Features/Terminal/ANSIRenderer.swift` — Basic ANSI color codes for terminal output
- `Core/CLI/CLIParser.swift` — Tokenize `swap 1 wCTC sbUSD` into structured command
- `Core/CLI/CLIRegistry.swift` — Register available commands with help text
- `Core/CLI/Commands/*.swift` — Individual command handlers (swap, borrow, balance, status, help)
- `App/AppCoordinator.swift` — Tab bar or gesture for mode switching
- `Features/Settings/SettingsView.swift` — Master settings screen

**Key details**:
- Chat mode: Standard chat bubbles. Agent responses stream token-by-token. TX status shows inline card (pending → confirmed → success/fail).
- Terminal mode:
  - Prompt: `snowball> `
  - Commands: `swap <amount> <tokenIn> <tokenOut>`, `borrow <amount> <collateral>`, `balance`, `status`, `help`, `connect`, `disconnect`
  - Terminal commands bypass LLM — they go directly to skills (faster, no ambiguity)
  - Output uses ANSI colors: green for success, red for errors, yellow for warnings, cyan for info
- Mode switching: Tab at bottom or swipe gesture. Conversation context is shared (terminal command results appear in chat history too).
- TX status rendering:
  - Chat: Inline card component with spinner → checkmark/X
  - Terminal: `[PENDING] TX 0xabc... sent` → `[CONFIRMED] TX 0xabc... block #12345`

**Acceptance criteria**:
- [ ] AC-005: In terminal mode, type `swap 1 wCTC sbUSD` → executes without LLM involvement
- [ ] AC-009: Switch between Chat and Terminal tabs; conversation context persists
- [ ] Chat mode streams agent tokens in real-time (not all-at-once)
- [ ] Terminal renders ANSI colors correctly for command output
- [ ] Both modes show TX pending/confirmed status inline

---

### Step 6: Integration Testing + Polish

**Objective**: End-to-end testing on Creditcoin Testnet, performance optimization, and edge case hardening.

**Tasks**:

1. **E2E Protocol Tests** (on testnet):
   - Swap wCTC→sbUSD via chat: "Swap 0.1 wCTC to sbUSD"
   - Swap wCTC→sbUSD via terminal: `swap 0.1 wCTC sbUSD`
   - Open trove: "Open a trove with 5 wCTC and borrow 10 sbUSD"
   - Deposit to Stability Pool: "Earn with 10 sbUSD in the stability pool"
   - Supply to Morpho: "Lend 5 sbUSD on the wCTC/sbUSD market"
   - Deposit to Yield Vault: "Put 5 sbUSD into the stability pool vault"

2. **Fallback Tests**:
   - Delete local model → verify cloud fallback activates
   - Simulate RPC timeout → verify agent explains network issue
   - WC session expired → verify reconnect prompt

3. **Signing Policy Tests**:
   - Set threshold to $10 → swap 1 sbUSD ($1) → auto-sign
   - Set threshold to $10 → swap 5 wCTC ($25) → manual confirmation + Face ID

4. **Performance**:
   - Measure local LLM first-token latency on target devices
   - Optimize system prompt length (trim old conversation, summarize)
   - Profile memory usage during LLM inference (Phi-3-mini needs ~2GB)

5. **Edge Cases**:
   - Insufficient balance for gas
   - Token approval already granted (skip redundant approve TX)
   - Multiple TXs in sequence (approve + swap as atomic flow)
   - Agent handles ambiguous input: "swap some tokens" → asks for clarification

**Files to create/modify**:
- `Tests/IntegrationTests/SwapE2ETests.swift`
- `Tests/IntegrationTests/BorrowE2ETests.swift`
- `Tests/AgentTests/IntentParserTests.swift` — Unit tests for intent parsing
- `Tests/CoreTests/ABIEncoderTests.swift` — Known-good ABI encoding vectors
- `Tests/CoreTests/SigningPolicyTests.swift` — Threshold edge cases

**Acceptance criteria**:
- [ ] All 9 acceptance criteria (AC-001 through AC-009) pass on a real device with Creditcoin Testnet
- [ ] Zero crashes during 30-minute continuous usage session
- [ ] LLM memory usage stays below 3GB peak (device has 6GB+)
- [ ] App launch to "ready" state < 5 seconds (without model download)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| web3.swift lacks complex tuple ABI encoding | HIGH | HIGH | Build custom `ABIEncoder` from scratch. Solidity ABI spec is well-documented. Test against known calldata from web app scripts. |
| Phi-3-mini produces incorrect intent JSON | MEDIUM | HIGH | Use constrained generation (JSON mode) if MLX supports it. Add robust fallback parsing (regex extraction). Include 5+ few-shot examples per skill in system prompt. |
| WalletConnect v2 Swift SDK stability | MEDIUM | MEDIUM | Pin to stable release. Implement session recovery with exponential backoff. Test with MetaMask, Rainbow, Trust Wallet. |
| App Store rejection for on-demand model download | LOW | HIGH | Models are "on-demand resources" — Apple allows this pattern. Use Background URLSession for downloads. Alternative: ship cloud-only and make local LLM an opt-in feature. |
| Liquity hint calculation complexity | MEDIUM | MEDIUM | Port hint logic directly from existing `scripts/sim/` TypeScript. Use generous `numTrials=15` for getApproxHint. |
| Morpho 1e36 oracle scale precision | LOW | HIGH | Use Swift `Decimal` or `BigInt` library for all oracle math. Never use `Double`. Test against known oracle values from deploy-history.md. |

---

## ADR (Architectural Decision Record)

**Decision**: Build native Swift iOS app with MLX on-device LLM, WalletConnect v2 for signing, direct RPC for on-chain communication.

**Drivers**:
1. MVP delivery speed with agent reliability
2. On-device LLM performance (AC-006: < 3s first token)
3. Zero key custody security model

**Alternatives considered**:
- React Native + ethers.js: Would enable TypeScript code reuse but cannot meet LLM latency requirement (no MLX path)
- Flutter + MLX bridge: Cross-platform irrelevant for iOS-only MVP; platform channel adds latency

**Why chosen**: Native Swift is the only path that satisfies all 9 acceptance criteria simultaneously. MLX Swift provides the Metal-accelerated inference needed for AC-006. SwiftUI provides native Face ID integration for AC-008. No framework abstraction layers means fewer failure modes for the agent core loop.

**Consequences**:
- No code sharing with existing TypeScript monorepo — all ABIs and addresses must be manually ported and kept in sync
- Smaller developer pool for Swift + ML compared to React Native
- Future Android version would require a separate codebase

**Follow-ups**:
- Establish a CI job to detect address/ABI drift between `packages/core/` and `Core/Protocols/`
- Evaluate code generation tool to auto-convert TypeScript ABIs to Swift structs
- After MVP: evaluate Kotlin Multiplatform for shared Core layer if Android is needed
