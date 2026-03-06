# 컨트랙트 주소 및 ABI Reference

## Network

- Chain ID: `102031`
- RPC: `https://rpc.cc3-testnet.creditcoin.network`
- Explorer: `https://creditcoin-testnet.blockscout.com`

---

## Tokens (all 18 decimals)

| Symbol | Address | Mock Price |
|--------|---------|------------|
| wCTC | `0xdb5c8e9d0827c474342bea03e0e35a60d621afea` | $2.50 |
| lstCTC | `0x47ad69498520edb2e1e9464fedf5309504e26207` | $2.60 |
| sbUSD | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` | $1.00 |
| USDC | `0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02` | $1.00 |

---

## DEX (Uniswap V3)

| Contract | Address |
|----------|---------|
| Factory | `0x09616b503326dc860b3c3465525b39fe4fcdd049` |
| SwapRouter | `0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154` |
| NonfungiblePositionManager | `0xa28bfaa2e84098de8d654f690e51c265e4ae01c9` |
| QuoterV2 | `0x2383343c2c7ae52984872f541b8b22f8da0b419a` |

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

## Morpho (SnowballLend)

| Contract | Address |
|----------|---------|
| SnowballLend | `0x7d604b31297b36aace73255931f65e891cf289d3` |
| AdaptiveCurveIRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |

### Oracles

| Token | Address |
|-------|---------|
| wCTC | `0x42ca12a83c14e95f567afc940b0118166d8bd852` |
| lstCTC | `0x192f1feb36f319e79b3bba25a17359ee72266a14` |
| sbUSD | `0xc39f222e034f4bd4f3c858e6fde9ce4398400a26` |

### Markets

| ID | Pair | LLTV | Oracle |
|----|------|------|--------|
| `0xfb2641d7...` | wCTC(coll) / sbUSD(loan) | 77% | wCTC oracle |
| `0x35cfd9e9...` | lstCTC(coll) / sbUSD(loan) | 77% | lstCTC oracle |
| `0x3df89a2c...` | sbUSD(coll) / USDC(loan) | 90% | sbUSD oracle |

### MarketParams 구성법

```typescript
// wCTC / sbUSD 마켓 예시
const marketParams = {
  loanToken: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",      // sbUSD
  collateralToken: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea", // wCTC
  oracle: "0x42ca12a83c14e95f567afc940b0118166d8bd852",          // wCTC oracle
  irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",             // AdaptiveCurveIRM
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
