# 컨트랙트 주소 및 ABI Reference

## Network

- Chain ID: `102031`
- RPC: `https://rpc.cc3-testnet.creditcoin.network`
- Explorer: `https://creditcoin-testnet.blockscout.com`

---

## Tokens (all 18 decimals)

| Symbol | Address | Mock Price |
|--------|---------|------------|
| wCTC | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` | $5.00 |
| lstCTC | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` | $5.00 |
| sbUSD | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` | $1.00 |
| USDC | `0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9` | $1.00 |

### Token Minting

- **wCTC / lstCTC**: `faucet(amount)` — 누구나 호출 가능, 1회 100k 제한
- **USDC**: `mint(to, amount)` — 누구나 호출 가능, 제한 없음
- **sbUSD**: Liquity Trove에서만 민팅 (BorrowerOperations.openTrove)

---

## DEX (Uniswap V3)

| Contract | Address |
|----------|---------|
| Factory | `0x09616b503326dc860b3c3465525b39fe4fcdd049` |
| SwapRouter | `0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154` |
| NonfungiblePositionManager | `0xa28bfaa2e84098de8d654f690e51c265e4ae01c9` |
| QuoterV2 | `0x2383343c2c7ae52984872f541b8b22f8da0b419a` |

### Pools

| Pair | Fee | Address |
|------|-----|---------|
| wCTC/USDC | 3000 | `0xb6Db55F3d318B6b0C37777A818C2c195181B94C9` |
| lstCTC/USDC | 3000 | `0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a` |
| wCTC/sbUSD | 3000 | `0x23e6152CC07d4DEBA597c9e975986E2B307E8874` |
| sbUSD/USDC | 500 | `0xe70647BF2baB8282B65f674b0DF8B7f0bb658859` |
| lstCTC/wCTC | 3000 | `0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5` |

### ABI 위치

`apps/web/src/core/abis/dex.ts`

| ABI | 주요 함수 |
|-----|----------|
| UniswapV3FactoryABI | `getPool(tokenA, tokenB, fee)` |
| UniswapV3PoolABI | `slot0()`, `liquidity()`, `token0()`, `token1()`, `fee()` |
| SwapRouterABI | `exactInputSingle(params)`, `exactInput(params)` |
| QuoterV2ABI | `quoteExactInputSingle(params)` |
| NonfungiblePositionManagerABI | `mint`, `collect`, `decreaseLiquidity`, `increaseLiquidity`, `burn`, `positions(tokenId)`, `balanceOf(owner)` |
| MockERC20ABI | `approve`, `balanceOf`, `transfer`, `allowance` |

### Fee Tiers

- 500 (0.05%) — stable pairs
- 3000 (0.3%) — standard
- 10000 (1%) — exotic

---

## Liquity (Borrow / Earn)

### wCTC Branch

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

### lstCTC Branch

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

### Shared

| Contract | Address |
|----------|---------|
| CollateralRegistry | `0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59` |
| HintHelpers | `0x6ee9850b0915763bdc0c7edca8b66189449a447f` |
| MultiTroveGetter | `0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6` |
| RedemptionHelper | `0x8baf58113f968b4dfb2916290b57ce3ae114fb77` |
| DebtInFrontHelper | `0x9fd6116fc1d006fa1d8993746ac1924f16d722bb` |
| AgentVault | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` |

### Liquity Parameters

| Parameter | wCTC | lstCTC |
|-----------|------|--------|
| MCR | 110% | 120% |
| CCR | 150% | 160% |
| ETH_GAS_COMPENSATION | 0.2 CTC | 0.2 CTC |
| MIN_DEBT | 10 sbUSD | 10 sbUSD |

---

## Morpho (SnowballLend)

| Contract | Address |
|----------|---------|
| SnowballLend | `0x190a733eda9ba7d2b52d56764c5921d5cd4752ca` |
| AdaptiveCurveIRM | `0xc4c694089af9bab4c6151663ae8424523fce32a8` |

### Oracles (1e36 scale, CreditcoinOracle)

| Token | Address | Price |
|-------|---------|-------|
| wCTC | `0xbd2c8afda5fa753669c5dd03885a45a3612171af` | $5.00 (5e36) |
| lstCTC | `0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31` | $5.20 (5.2e36) |
| sbUSD | `0xf82396f39e93d77802bfecc33344faafc4df50f2` | $1.00 (1e36) |

### Markets

| ID | Pair | LLTV | Oracle |
|----|------|------|--------|
| `0x5aa4edaf...` | wCTC(coll) / sbUSD(loan) | 77% | wCTC oracle |
| `0x2eea8a6b...` | lstCTC(coll) / sbUSD(loan) | 77% | lstCTC oracle |
| `0x3a94c96e...` | sbUSD(coll) / USDC(loan) | 90% | sbUSD oracle |

### MarketParams 구성법

```typescript
// wCTC / sbUSD 마켓 예시
const marketParams = {
  loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5",      // sbUSD
  collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528", // wCTC
  oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af",          // wCTC oracle
  irm: "0xc4c694089af9bab4c6151663ae8424523fce32a8",             // AdaptiveCurveIRM
  lltv: 770000000000000000n,                                       // 0.77
};
```

### ABI 위치

`apps/web/src/core/abis/lend.ts`

| ABI | 주요 함수 |
|-----|----------|
| SnowballLendABI | `market(id)`, `position(id, user)`, `supply`, `withdraw`, `borrow`, `repay`, `supplyCollateral`, `withdrawCollateral`, `idToMarketParams(id)` |
| MockOracleABI | `price()` |

---

## 공통 ERC20 패턴

```typescript
// approve 패턴
await walletClient.writeContract({
  address: tokenAddress,
  abi: MockERC20ABI,
  functionName: "approve",
  args: [spenderAddress, amount],
});
```
