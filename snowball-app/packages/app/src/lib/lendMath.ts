import { formatUnits } from "viem";

const VIRTUAL_SHARES = 1_000_000n; // 1e6
const VIRTUAL_ASSETS = 1n;

export function toAssetsDown(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
    return (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
}

export function toSharesDown(assets: bigint, totalAssets: bigint, totalShares: bigint): bigint {
    return (assets * (totalShares + VIRTUAL_SHARES)) / (totalAssets + VIRTUAL_ASSETS);
}

const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;

export function borrowRateToAPR(ratePerSecond: bigint): number {
    return Number(ratePerSecond * SECONDS_PER_YEAR) / 1e18 * 100;
}

export function utilization(totalBorrow: bigint, totalSupply: bigint): number {
    if (totalSupply === 0n) return 0;
    return Number(totalBorrow * 10000n / totalSupply) / 100; // Returns percentage like 65.3
}

export function supplyAPY(borrowAPR: number, utilizationPercent: number, fee: number = 0): number {
    // utilization is a percentage 0-100, we need it as ratio 0-1
    return borrowAPR * (utilizationPercent / 100) * (1 - fee);
}

export function calculateHealthFactor(
    collateral: bigint,
    borrowedAssets: bigint,
    oraclePrice: bigint,
    lltv: bigint,
    collateralDecimals: number,
    borrowDecimals: number
): number | null {
    if (borrowedAssets === 0n) return null; // Safe or Infinity

    const coll = Number(formatUnits(collateral, collateralDecimals));
    const borrow = Number(formatUnits(borrowedAssets, borrowDecimals));
    const price = Number(formatUnits(oraclePrice, 36));
    const lltvNum = Number(formatUnits(lltv, 18));

    // healthFactor = (collateral × oraclePrice / 1e36 × lltv / 1e18) / borrowedAssets
    return (coll * price * lltvNum) / borrow;
}

export function calculateLiquidationPrice(
    collateral: bigint,
    borrowedAssets: bigint,
    lltv: bigint,
    collateralDecimals: number,
    borrowDecimals: number
): number | null {
    if (collateral === 0n || borrowedAssets === 0n) return null;
    const collNum = Number(formatUnits(collateral, collateralDecimals));
    const borrowNum = Number(formatUnits(borrowedAssets, borrowDecimals));
    const lltvNum = Number(formatUnits(lltv, 18));

    // liqPrice = borrowedAssets / (collateral × LLTV)
    return borrowNum / (collNum * lltvNum);
}
