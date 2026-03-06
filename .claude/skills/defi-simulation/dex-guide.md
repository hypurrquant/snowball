# DEX (Uniswap V3) 시뮬레이션 가이드

## Swap 상세

### exactInputSingle

```typescript
// 1. approve
await walletClient.writeContract({
  address: tokenIn,
  abi: MockERC20ABI,
  functionName: "approve",
  args: [DEX.swapRouter, amountIn],
});

// 2. swap
const hash = await walletClient.writeContract({
  address: DEX.swapRouter,
  abi: SwapRouterABI,
  functionName: "exactInputSingle",
  args: [{
    tokenIn,
    tokenOut,
    fee: 3000,           // 0.3%
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
    amountIn,
    amountOutMinimum: 0n, // 시뮬레이션이므로 slippage 무시
    sqrtPriceLimitX96: 0n,
  }],
});
await publicClient.waitForTransactionReceipt({ hash });
```

### Quote (가격 조회, 상태 변경 없음)

```typescript
const [amountOut] = await publicClient.simulateContract({
  address: DEX.quoterV2,
  abi: QuoterV2ABI,
  functionName: "quoteExactInputSingle",
  args: [{ tokenIn, tokenOut, amountIn, fee: 3000, sqrtPriceLimitX96: 0n }],
});
```

---

## LP (유동성 공급) 상세

### Tick 계산

```typescript
// Uniswap V3 tick math
// tick spacing for fee 3000 = 60
// Full range: tickLower = -887220, tickUpper = 887220
// Safe range: 현재 tick ± 60000

// 현재 tick 조회
const poolAddr = await publicClient.readContract({
  address: DEX.factory,
  abi: UniswapV3FactoryABI,
  functionName: "getPool",
  args: [token0, token1, 3000],
});

const [sqrtPriceX96, tick] = await publicClient.readContract({
  address: poolAddr,
  abi: UniswapV3PoolABI,
  functionName: "slot0",
});

// tick을 tickSpacing 배수로 정렬
const tickSpacing = 60;
const tickLower = Math.floor((Number(tick) - 60000) / tickSpacing) * tickSpacing;
const tickUpper = Math.ceil((Number(tick) + 60000) / tickSpacing) * tickSpacing;
```

### Mint (LP 생성)

```typescript
// token0 < token1 (주소 정렬 필수)
const [t0, t1] = tokenA.toLowerCase() < tokenB.toLowerCase()
  ? [tokenA, tokenB] : [tokenB, tokenA];
const [amt0, amt1] = tokenA.toLowerCase() < tokenB.toLowerCase()
  ? [amountA, amountB] : [amountB, amountA];

// 1. approve token0 → NPM
// 2. approve token1 → NPM
// 3. mint
await walletClient.writeContract({
  address: DEX.nonfungiblePositionManager,
  abi: NonfungiblePositionManagerABI,
  functionName: "mint",
  args: [{
    token0: t0, token1: t1, fee: 3000,
    tickLower, tickUpper,
    amount0Desired: amt0,
    amount1Desired: amt1,
    amount0Min: 0n, amount1Min: 0n,
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  }],
});
```

### Collect Fees

```typescript
await walletClient.writeContract({
  address: DEX.nonfungiblePositionManager,
  abi: NonfungiblePositionManagerABI,
  functionName: "collect",
  args: [{
    tokenId,
    recipient: account.address,
    amount0Max: BigInt("0xffffffffffffffffffffffffffffffff"),
    amount1Max: BigInt("0xffffffffffffffffffffffffffffffff"),
  }],
});
```

---

## Pool 존재 여부 확인

풀이 없으면 address(0) 반환. 스왑/LP 전에 반드시 확인.

```typescript
const pool = await publicClient.readContract({
  address: DEX.factory,
  abi: UniswapV3FactoryABI,
  functionName: "getPool",
  args: [tokenA, tokenB, fee],
});
if (pool === "0x0000000000000000000000000000000000000000") {
  console.log("Pool does not exist");
}
```
