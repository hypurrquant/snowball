# SSOT — Snowball DEX (Algebra V4 Fork)

> Single Source of Truth for contract addresses, tokens, pools, and integration config.
> Creditcoin Testnet deployment.
> Version: v1.0.0 | Status: Active
> [INDEX](INDEX.md)

---

## Network

| Key | Value |
|-----|-------|
| Name | Creditcoin Testnet |
| Chain ID | `102031` |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Native Token | CTC (tCTC on testnet, 18 decimals) |

---

## Core Contracts

| Contract | Address | Role |
|----------|---------|------|
| SnowballFactory | `0x04dca03a979b2ad38ee964e8d32c9d36c1301040` | Pool 생성, 관리, 권한 |
| SnowballPoolDeployer | `0x71f39dc01dce21358e0733a9981f4b5010312dbb` | CREATE2 풀 배포 |
| SnowballRouter | `0x151211ea233c72d466e7c159bf07673771164e4e` | Swap 라우팅 (exactInput/exactOutput) |
| NonfungiblePositionManager | `0x16534c66e4249ac8cd39a8c91cc80d3f0389a71f` | LP 포지션 NFT (ERC-721) |
| QuoterV2 | `0x36bab7a5dcfb2c4e980dc5bf86009e61a3c35c77` | 스왑 견적 조회 (off-chain) |
| DynamicFeePlugin | `0x962267ce45eeef519212243fe8d954b951e31f2c` | 동적 수수료 플러그인 |
| SnowballCommunityVault | `0x3e60d645fab4d8eb2274266206f597c5a88500d3` | 커뮤니티 수수료 금고 |
| SnowballVaultFactoryStub | `0xe035ab6a08497ae90540ddada4c59bf2d9443839` | Vault 팩토리 스텁 |
| NonfungibleTokenPositionDescriptor | `0x139750b713a2b2e8609c405209e0dedf5acd0e31` | NFT tokenURI (minimal stub) |

---

## Tokens

| Symbol | Name | Decimals | Address |
|--------|------|----------|---------|
| CTC | Creditcoin (native) | 18 | — (native, wrap via wCTC) |
| wCTC | Wrapped CTC | 18 | `0x1aced2a3e477c5813d9d0d82135d142dd4d9146e` |
| USDC | USD Coin | 6 | `0xcdce6a74a3e5a33ddb689da0ce1e2b6caaa38235` |
| sbUSD | Snowball USD | 18 | `0x0d8b839133d2a2ce7956ea69d48f0e68bd915d9c` |
| lstCTC | Liquid Staked CTC | 18 | `0x13e6d846c3846c496764990a3ae2561a96fc87bf` |

> 모든 토큰은 MockERC20 (테스트넷 전용). `mint(address to, uint256 amount)` 호출로 발행 가능.

---

## Pools

| Pair | Pool Address | Fee Type | Min Fee | Max Fee | Category |
|------|-------------|----------|---------|---------|----------|
| sbUSD / USDC | `0xC197E3A598Cb286b4692e6D697cE8946c9D6EFCF` | Dynamic | 100 (0.01%) | 1000 (0.1%) | Stablecoin |
| wCTC / sbUSD | `0xcE3fCa9fC56261fa24b62Cc427d5a60Ffa9CC63c` | Dynamic | 500 (0.05%) | 10000 (1.0%) | Major |
| wCTC / USDC | `0x2E8DC10483831C04B04F27976984eFa7e3731697` | Dynamic | 500 (0.05%) | 10000 (1.0%) | Major |
| lstCTC / wCTC | `0x1340bB786892f49846Bd5C49532C31168714bA8F` | Dynamic | 100 (0.01%) | 1000 (0.1%) | Correlated |

> Fee 단위: 1/100 of a bip (0.0001%). 예: 500 = 0.05%, 3000 = 0.3%.
> 모든 풀은 초기화 완료 (sqrtPriceX96 = 2^96, 1:1 비율).

---

## Build & Compile

| Key | Value |
|-----|-------|
| Solidity | `0.8.20` |
| EVM Target | `paris` |
| Optimizer | enabled, 200 runs |
| via_ir | disabled |
| OpenZeppelin | v4.9.3 |
| POOL_INIT_CODE_HASH | `0x4335ed47a2e7434d195d27a0c2a7841e443d1d05653306594df277abef9101b8` |

---

## Key Function Signatures

### Swap (SnowballRouter)

```solidity
// 단일 풀 정확한 입력 스왑
function exactInputSingle(ExactInputSingleParams calldata params)
    external payable returns (uint256 amountOut);

struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 limitSqrtPrice;   // 0 = no limit
}

// 멀티홉 스왑
function exactInput(ExactInputParams calldata params)
    external payable returns (uint256 amountOut);

struct ExactInputParams {
    bytes path;               // abi.encodePacked(tokenA, tokenB, tokenC)
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
}
```

### Quote (QuoterV2)

```solidity
function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
    external returns (uint256 amountOut, uint16 fee);

struct QuoteExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint160 limitSqrtPrice;   // 0 = no limit
}
```

### LP Positions (NonfungiblePositionManager)

```solidity
function mint(MintParams calldata params)
    external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

function increaseLiquidity(IncreaseLiquidityParams calldata params)
    external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);

function decreaseLiquidity(DecreaseLiquidityParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);

function collect(CollectParams calldata params)
    external payable returns (uint256 amount0, uint256 amount1);

function positions(uint256 tokenId) external view returns (
    uint88 nonce, address operator, address token0, address token1,
    int24 tickLower, int24 tickUpper, uint128 liquidity,
    uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128,
    uint128 tokensOwed0, uint128 tokensOwed1
);
```

### Pool State (IAlgebraPool)

```solidity
function globalState() external view returns (
    uint160 price,          // sqrtPriceX96
    int24 tick,             // current tick
    uint16 lastFee,         // last swap fee
    uint8 pluginConfig,     // plugin bitmask
    uint16 communityFee,
    bool unlocked
);

function liquidity() external view returns (uint128);

// Pool lookup
// Factory.poolByPair(tokenA, tokenB) → pool address
```

### Dynamic Fee (DynamicFeePlugin)

```solidity
function getFee(address pool) external view returns (uint16);

function poolConfig(address pool) external view returns (
    uint16 minFee,
    uint16 maxFee,
    uint32 volatilityWindow,
    bool registered
);
```

---

## ABIs

소스: `packages/shared/src/abis/index.ts`

```typescript
import {
  SnowballFactoryABI,
  SnowballPoolABI,
  SnowballRouterABI,
  SnowballPoolDeployerABI,
  NonfungiblePositionManagerABI,
  QuoterV2ABI,
  DynamicFeePluginABI,
  MockERC20ABI,
} from '@snowball/shared/abis';
```

---

## Deploy Order (재배포 시)

```
1. SnowballFactory(predictedPoolDeployerAddr)    ← nonce 예측 필요
2. SnowballPoolDeployer(factory)
3. SnowballCommunityVault(factory, admin)
4. SnowballVaultFactoryStub(vault) → factory.setVaultFactory(stub)
5. DynamicFeePlugin(factory) → factory.setDefaultPluginFactory(plugin)
6. SnowballRouter(factory, wCTC, poolDeployer)
7. NonfungibleTokenPositionDescriptor()
8. NonfungiblePositionManager(factory, wCTC, descriptor, poolDeployer)
9. QuoterV2(factory, wCTC, poolDeployer)
```

---

## License

BUSL-1.1 (Algebra V4 Integral).
메인넷 배포 시 Algebra Labs 상용 라이선스 필요: https://algebra.finance/form
