# Deployment History

> 멀티체인 배포 이력 (CC Testnet, Sepolia, USC Testnet)

## Deployer

- Address: `0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6`
- Key source: `scripts/simulation-accounts.json` → deployer

---

## v2 — Full Redeploy (2026-03-07)

### Morpho (SnowballLend) — 신규 배포

| Contract | Address |
|----------|---------|
| SnowballLend (Morpho) | `0x190a733eda9ba7d2b52d56764c5921d5cd4752ca` |
| AdaptiveCurveIRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |

#### Oracles (CreditcoinOracle, 1e36 scale)

| Token | Address | Price |
|-------|---------|-------|
| wCTC | `0xbd2c8afda5fa753669c5dd03885a45a3612171af` | $5.00 (5e36) |
| lstCTC | `0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31` | $5.20 (5.2e36) |
| sbUSD | `0xf82396f39e93d77802bfecc33344faafc4df50f2` | $1.00 (1e36) |

#### Markets

| Pair | LLTV | Market ID |
|------|------|-----------|
| wCTC/sbUSD | 77% | `0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752` |
| lstCTC/sbUSD | 77% | `0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e` |
| sbUSD/USDC | 90% | `0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c` |

배포 스크립트: `scripts/deploy/deploy-morpho-fresh.ts`

### Tokens

| Symbol | Address | Decimals |
|--------|---------|----------|
| wCTC | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` | 18 |
| lstCTC | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` | 18 |
| sbUSD | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` | 18 |
| USDC | `0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9` | 18 |

### Liquity

#### wCTC Branch

| Contract | Address |
|----------|---------|
| AddressesRegistry | `0x7cfed108ed84194cf37f93d47268fbdd14da73d2` |
| BorrowerOperations | `0xb637f375cbbd278ace5fdba53ad868ae7cb186ea` |
| TroveManager | `0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e` |
| StabilityPool | `0xf1654541efb7a3c34a9255464ebb2294fa1a43f3` |
| ActivePool | `0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5` |
| DefaultPool | `0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404` |
| GasPool | `0x4aa86795705a604e3dac4cfe45c375976eca3189` |
| CollSurplusPool | `0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111` |
| SortedTroves | `0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f` |
| TroveNFT | `0x72e383eff50893e2b2edeb711a81c3a812dcd2f9` |
| PriceFeed | `0xca9341894230b84fdff429ff43e83cc8f8990342` |

#### lstCTC Branch

| Contract | Address |
|----------|---------|
| AddressesRegistry | `0x0afe1c58a76c49d62bd7331f309aa14731efb1fc` |
| BorrowerOperations | `0x8700ed43989e2f935ab8477dd8b2822cae7f60ca` |
| TroveManager | `0x83715c7e9873b0b8208adbbf8e07f31e83b94aed` |
| StabilityPool | `0xec700d805b5de3bf988401af44b1b384b136c41b` |
| ActivePool | `0xa57cca34198bf262a278da3b2b7a8a5f032cb835` |
| DefaultPool | `0x6ed045c0cadc55755dc09f1bfee0f964baf1f859` |
| GasPool | `0x31d560b7a74b179dce8a8017a1de707c32dd67da` |
| CollSurplusPool | `0xa287db89e552698a118c89d8bbee25bf51a0ec33` |
| SortedTroves | `0x25aa78c7b0dbc736ae23a316ab44579467ba9507` |
| TroveNFT | `0x51a90151e0dd1348e77ee6bcc30278ee311f29a8` |
| PriceFeed | `0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08` |

#### Shared

| Contract | Address |
|----------|---------|
| CollateralRegistry | `0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59` |
| HintHelpers | `0x6ee9850b0915763bdc0c7edca8b66189449a447f` |
| MultiTroveGetter | `0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6` |
| RedemptionHelper | `0x8baf58113f968b4dfb2916290b57ce3ae114fb77` |
| DebtInFrontHelper | `0x9fd6116fc1d006fa1d8993746ac1924f16d722bb` |
| AgentVault | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` |

#### AgentVault Provenance

| Field | Value |
|-------|-------|
| Contract Address | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` |
| Deploy Tx Hash | `0x967780ad89bbad8117f23e21a1200e9a02b807b832a7c1481afdcaa37cad3ede` |
| Block Number | `4382959` |
| Confirmed At | 2026-03-07 02:16:30 KST (2026-03-06T17:16:30Z) |
| ABI Version | V3 (getDelegatedUsers + getPermNonce 포함) |
| Deploy Script | `scripts/deploy/deploy-agent-vault-v2.ts` |

> Tx hash/block은 `eth_getCode` 바이너리 서치로 확보. 재검증: `scripts/deploy/verify-agent-vault.ts`

### DEX (Uniswap V3)

| Contract | Address |
|----------|---------|
| Factory | `0x09616b503326dc860b3c3465525b39fe4fcdd049` |
| SwapRouter | `0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154` |
| NonfungiblePositionManager | `0xa28bfaa2e84098de8d654f690e51c265e4ae01c9` |
| QuoterV2 | `0x2383343c2c7ae52984872f541b8b22f8da0b419a` |

#### Pools

| Pair | Fee | Address |
|------|-----|---------|
| wCTC/USDC | 3000 | `0xb6Db55F3d318B6b0C37777A818C2c195181B94C9` |
| lstCTC/USDC | 3000 | `0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a` |
| wCTC/sbUSD | 3000 | `0x23e6152CC07d4DEBA597c9e975986E2B307E8874` |
| sbUSD/USDC | 500 | `0xe70647BF2baB8282B65f674b0DF8B7f0bb658859` |
| lstCTC/wCTC | 3000 | `0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5` |

배포 스크립트: `scripts/deploy/deploy-full.ts`

### Yield Vaults (Beefy V7 Fork)

| Vault | Want | Vault Address | Strategy Address |
|-------|------|---------------|------------------|
| Stability Pool | sbUSD | `0x40a8b5b8a6c1e4236da10da2731944e59444c179` | `0x342c8a3385341b07111bbf1a73aac48cdda32917` |
| Morpho sbUSD | sbUSD | `0x384ebff116bb8458628b62624ab9535a4636a397` | `0x9176910f4c9dc7a868d5e6261fd651f98d7cc0c3` |
| Morpho wCTC | wCTC | `0x766c8bf45d7a7356f63e830c134c07911b662757` | `0x241f5661d6db304434dfc48dab75f1c5be63404a` |
| Morpho USDC | USDC | `0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7` | `0xcdb7a9fb0040d2631f4cd212601838d195e8d08b` |

추가 Oracle: `0x13c355b49b53c3bdfcba742fd015fe30a39896ca` (sbUSD/wCTC, 0.2e36 — wCTC loan market용)

배포 스크립트: `scripts/deploy/deploy-yield.ts`

---

## Bridge (DN Crosschain) — v0.17.0 (2026-03-07)

> 3개 체인에 걸친 크로스체인 브릿지. USDC(CC) → DN(Sepolia) → DN(USC)

### v2 (현재)

| Contract | Chain | Chain ID | Address |
|----------|-------|----------|---------|
| BridgeVault | CC Testnet | 102031 | `0x06961ab735f87486c538d840d0f54d3f6518cd78` |
| DN Token v2 | Sepolia | 11155111 | `0xa6722586d0f1cfb2a66725717ed3b99f609cb39b` |
| EvmV1Decoder | USC Testnet | 102036 | `0xa6722586d0f1cFB2a66725717ed3b99F609cb39B` |
| DNBridgeUSC v2 | USC Testnet | 102036 | `0x4fE881D69fB10b8bcd2009D1BC9684a609B29270` |

배포 스크립트: `scripts/deploy/deploy-dn-bridge.ts`
배포 기록: `deployments/bridge-deploy.json`
E2E 테스트: `scripts/sim/simulate-dn-bridge.ts`

### v1 (deprecated)

> v0.11.1-usc-worker에서 배포. v2에서 destinationChainKey 검증 + EvmV1Decoder 분리로 대체됨.

| Contract | Chain | Address | 상태 |
|----------|-------|---------|------|
| DN Token v1 | Sepolia | `0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380` | **DEPRECATED** |
| DNBridgeUSC v1 | USC Testnet | `0x23E741a87ad9567Dff27eb34FaABa1444154D458` | **DEPRECATED** |
