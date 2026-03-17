# Open Questions

## snowball-ios-app — 2026-03-17

- [ ] **LLM model distribution strategy** — Phi-3-mini INT4 is ~1.8GB. Should it be downloaded on first launch (on-demand) or offered as an optional download in Settings? On-demand is better UX but risks App Store review friction if the app appears broken without it. Recommendation: cloud-only by default, local LLM as opt-in toggle in Settings.
- [ ] **Cloud LLM API key management** — MVP spec says "user provides their own key." Which LLM provider? Claude API, OpenAI, or both? Need to decide the default/recommended provider and whether to support multiple. This affects CloudLLMService implementation.
- [ ] **TX auto-sign default threshold (USD)** — What should the default be? $0 (always manual) is safest but annoying. $10 is reasonable for testnet. $50? This is a UX decision that affects first-run experience. Testnet tokens have mock prices (wCTC=$5, sbUSD=$1) so the threshold should be calibrated to those.
- [ ] **Skills update mechanism** — Skill definition JSONs (swap-skill.json, borrow-skill.json, etc.) contain the few-shot examples and parameter schemas that the LLM uses. If a contract is redeployed or a new protocol is added, these need updating. Options: (a) bundle in app, update via App Store release; (b) fetch from a remote URL on launch. MVP recommendation: bundle, defer remote fetch to post-MVP.
- [ ] **Agent conversation history persistence** — Should conversations survive app restart? Options: (a) session-only (gone on kill); (b) persist to local SQLite/SwiftData. Session-only is simpler but loses context. Recommendation: persist last 50 messages via SwiftData, clear on wallet disconnect.
- [ ] **web3.swift vs custom RPC client** — web3.swift is the obvious choice but may lack Creditcoin Testnet custom chain support and complex tuple ABI encoding. Need to evaluate whether to use web3.swift as-is, fork it, or build a lightweight custom RPC + ABI layer. This should be decided in Step 1 spike.
- [ ] **WalletConnect testing wallets** — Which external wallets support Creditcoin Testnet (chainId 102031)? MetaMask can be configured with custom RPC, but others (Rainbow, Trust) may not. Need to identify at least 2 wallets for testing.
- [ ] **Xcode minimum version + iOS deployment target** — Plan assumes iOS 17+ and Xcode 16+. MLX Swift actually requires iOS 16+. Should we target iOS 16 for wider device reach or iOS 17 for newer SwiftUI APIs (Observable macro, etc.)? Recommendation: iOS 17 — the MLX memory requirements already exclude older devices.

## nav-restructure-unified-markets — 2026-03-17 (v2)

- [ ] **APR/APY compounding period convention** — The plan uses n=365 (daily compounding) for APR-to-APY conversion. Aave uses per-second compounding internally (`(1 + r)^SECONDS_PER_YEAR`). Should the unified display match Aave's per-second convention or use the simpler daily convention? Difference is <0.01% at typical DeFi rates. Recommendation: use daily (n=365) for simplicity; document the <0.01% discrepancy.
- [ ] **Unified page inline actions vs link-to-protocol** — Should unified supply/borrow pages let users perform actions inline (e.g., supply dialog within the unified page) or always link out to the protocol-specific page? Inline is better UX but significantly more scope. Recommendation: link-to-protocol for MVP, inline as follow-up.
- [ ] **Earn group ordering: Supply first or Yield Vaults first?** — The plan puts Supply first since it's the new unified aggregator page. But yield vaults may be more compelling for users. This is a UX preference decision.

## strategy-router — 2026-03-17 (v2 — revised after Architect + Critic review)

### Resolved (v2)
- [x] **Stability Pool APY source** — DECIDED: Show "Variable" badge, sort last. `useYieldVaultAPY` returns `{kind: "variable"}` for SP vaults. pathCalculator sets `estimatedAPY: null`, `apyLabel: "Variable"`.
- [x] **CDP -> LP -> Staker path: DEX mint step** — DECIDED: Deferred to Phase 2. Requires `mintLP` hook (doesn't exist) + 2 new TxStepTypes (`stake`, `mintLP`). Plan reduced to 5 paths.
- [x] **Default borrow rate for CDP paths** — DECIDED: Fixed at 5% (`DEFAULT_BORROW_RATE = 0.05`). Footnote in UI "assumes 5% borrow rate". User-configurable slider deferred to Phase 2.
- [x] **Nav icon choice for Strategy** — DECIDED: `Waypoints` from lucide-react.

### Still Open
- [ ] **Multi-hop execution: partial failure recovery** — If openTrove succeeds but the subsequent Morpho supply step fails, user has an open CDP with minted sbUSD in wallet. `useTxPipeline` shows per-step error + retry but no rollback. Accepted for MVP with tooltip warning on multi-hop cards. Phase 2 could add a "revert" helper that closes the trove.
- [ ] **Yield Vault underlying asset matching** — The pathCalculator needs to match user's selected asset to vault's underlying token. Need to verify `VaultData` type exposes the underlying asset address. If not, the vault config in `YIELD.vaults` must be checked for this field.
- [ ] **lstCTC branch gas compensation UX** — For CDP paths with lstCTC collateral, `useTroveActions` requires a separate wCTC approval for `ETH_GAS_COMPENSATION`. The StrategyExecutor must add an extra `approveGasComp` step. Need to decide: show this as a visible step in the pipeline, or silently bundle it? Recommendation: show as visible step labeled "Approve Gas Deposit (wCTC)" for transparency.
