// Uniswap V3 DEX ABIs
// Sources: @uniswap/v3-core@1.0.1 (Factory, Pool), @uniswap/v3-periphery@1.4.4 (SwapRouter, QuoterV2, NonfungiblePositionManager)

export const UniswapV3FactoryABI = [
  { type: "function", name: "getPool", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ name: "pool", type: "address" }], stateMutability: "view" },
  { type: "function", name: "createPool", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ name: "pool", type: "address" }], stateMutability: "nonpayable" },
] as const;

export const UniswapV3PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "observationIndex", type: "uint16" }, { name: "observationCardinality", type: "uint16" }, { name: "observationCardinalityNext", type: "uint16" }, { name: "feeProtocol", type: "uint8" }, { name: "unlocked", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "fee", inputs: [], outputs: [{ type: "uint24" }], stateMutability: "view" },
  { type: "function", name: "tickSpacing", inputs: [], outputs: [{ type: "int24" }], stateMutability: "view" },
] as const;

export const SwapRouterABI = [
  { type: "function", name: "exactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "exactInput", inputs: [{ name: "params", type: "tuple", components: [{ name: "path", type: "bytes" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "multicall", inputs: [{ name: "data", type: "bytes[]" }], outputs: [{ name: "results", type: "bytes[]" }], stateMutability: "payable" },
] as const;

export const QuoterV2ABI = [
  { type: "function", name: "quoteExactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "fee", type: "uint24" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }, { name: "sqrtPriceX96After", type: "uint160" }, { name: "initializedTicksCrossed", type: "uint32" }, { name: "gasEstimate", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

export const NonfungiblePositionManagerABI = [
  { type: "function", name: "positions", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "nonce", type: "uint96" }, { name: "operator", type: "address" }, { name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "liquidity", type: "uint128" }, { name: "feeGrowthInside0LastX128", type: "uint256" }, { name: "feeGrowthInside1LastX128", type: "uint256" }, { name: "tokensOwed0", type: "uint128" }, { name: "tokensOwed1", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "mint", inputs: [{ name: "params", type: "tuple", components: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "collect", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount0Max", type: "uint128" }, { name: "amount1Max", type: "uint128" }] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "decreaseLiquidity", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "increaseLiquidity", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "burn", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "multicall", inputs: [{ name: "data", type: "bytes[]" }], outputs: [{ name: "results", type: "bytes[]" }], stateMutability: "payable" },
] as const;

export const MockERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;
