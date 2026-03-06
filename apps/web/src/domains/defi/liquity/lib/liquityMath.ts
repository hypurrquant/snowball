const WAD = 10n ** 18n;

/**
 * Collateral Ratio = (coll * price) / debt * 100
 */
export function computeCR(coll: bigint, debt: bigint, price: bigint): number {
  if (debt === 0n) return Infinity;
  return Number(((coll * price) / debt) * 100n / WAD) / 100;
}

/**
 * Liquidation price = (debt * MCR) / (coll * 1e18)
 * MCR is 18-decimal (e.g. 1.1e18 = 110%)
 */
export function liquidationPrice(
  coll: bigint,
  debt: bigint,
  mcr: bigint,
): bigint {
  if (coll === 0n) return 0n;
  return (debt * mcr) / (coll * WAD / WAD);
}

/**
 * Attempt to compute insert position hints via on-chain calls.
 * Returns (upperHint, lowerHint) or falls back to (0n, 0n) on any error.
 */
export async function getInsertPosition(
  readContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => Promise<unknown>,
  hintHelpersAddress: `0x${string}`,
  sortedTrovesAddress: `0x${string}`,
  hintHelpersABI: readonly unknown[],
  sortedTrovesABI: readonly unknown[],
  branchIdx: bigint,
  interestRate: bigint,
): Promise<[bigint, bigint]> {
  try {
    const approxResult = await readContract({
      address: hintHelpersAddress,
      abi: hintHelpersABI,
      functionName: "getApproxHint",
      args: [branchIdx, interestRate, 10n, 42n],
    });
    const hint = (approxResult as [bigint, bigint, bigint])[0];

    const insertResult = await readContract({
      address: sortedTrovesAddress,
      abi: sortedTrovesABI,
      functionName: "findInsertPosition",
      args: [interestRate, hint, hint],
    });
    const [upper, lower] = insertResult as [bigint, bigint];
    return [upper, lower];
  } catch {
    return [0n, 0n];
  }
}
