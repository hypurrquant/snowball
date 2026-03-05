const WAD = 10n ** 18n;
const YEAR_SECONDS = 365n * 24n * 3600n;

export function toAssetsDown(
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint {
  if (totalShares === 0n) return shares;
  return (shares * totalAssets) / totalShares;
}

export function toSharesDown(
  assets: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint {
  if (totalAssets === 0n) return assets;
  return (assets * totalShares) / totalAssets;
}

export function borrowRateToAPR(ratePerSecond: bigint): number {
  return Number((ratePerSecond * YEAR_SECONDS * 10000n) / WAD) / 100;
}

export function utilization(totalBorrow: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number((totalBorrow * 10000n) / totalSupply) / 100;
}

export function supplyAPY(
  borrowAPR: number,
  utilizationPercent: number,
  feeBps = 0
): number {
  const feeMultiplier = 1 - feeBps / 10000;
  return borrowAPR * (utilizationPercent / 100) * feeMultiplier;
}

export function calculateHealthFactor(
  collateralValue: bigint,
  borrowedValue: bigint,
  lltv: bigint
): number {
  if (borrowedValue === 0n) return Infinity;
  const maxBorrow = (collateralValue * lltv) / WAD;
  return Number((maxBorrow * WAD) / borrowedValue) / 1e18;
}

export function calculateLiquidationPrice(
  collateralAmount: bigint,
  borrowedAmount: bigint,
  lltv: bigint
): bigint {
  if (collateralAmount === 0n) return 0n;
  // liquidationPrice = borrowed * WAD / (collateral * lltv / WAD)
  return (borrowedAmount * WAD * WAD) / (collateralAmount * lltv);
}
