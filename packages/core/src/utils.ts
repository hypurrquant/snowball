// Pure utility functions shared across web, server, and scripts

export function sortTokens(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`
): [`0x${string}`, `0x${string}`] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

export function parseTokenAmount(value: string, decimals: number = 18): bigint {
  const [intPart, fracPart = ""] = value.split(".");
  const paddedFrac = fracPart.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(intPart + paddedFrac);
}

/**
 * Pure ERC-20 approval check: returns true if a new approve TX is needed.
 */
export function needsApproval(amount: bigint | undefined, allowance: bigint | undefined): boolean {
  return !!amount && amount > 0n && allowance !== undefined && allowance < amount;
}
