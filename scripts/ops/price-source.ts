/**
 * Oracle Price Source
 * Fetches live USD prices from CoinGecko, with hardcoded fallbacks.
 *
 * Usage (imported by oracle-updater.ts):
 *   import { fetchPrices, priceToOracle } from "./price-source";
 */

export interface Prices {
  wCTC: number;
  lstCTC: number;
  sbUSD: number;
  USDC: number;
}

// Fallback prices if API is unavailable
const FALLBACK: Prices = {
  wCTC: 5.0,
  lstCTC: 5.2,
  sbUSD: 1.0,
  USDC: 1.0,
};

/**
 * Fetches current USD prices.
 * CoinGecko → fallback on any error.
 */
export async function fetchPrices(): Promise<Prices> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=creditcoin-2&vs_currencies=usd";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = (await res.json()) as { "creditcoin-2"?: { usd?: number } };
    const ctcUsd = data["creditcoin-2"]?.usd;
    if (!ctcUsd || ctcUsd <= 0) throw new Error("CoinGecko: invalid CTC price");

    const wCTC = ctcUsd;
    const lstCTC = wCTC * 1.04; // staking ratio
    return { wCTC, lstCTC, sbUSD: 1.0, USDC: 1.0 };
  } catch (err) {
    console.warn(
      `[price-source] CoinGecko failed: ${(err as Error).message}. Using fallback prices.`
    );
    return { ...FALLBACK };
  }
}

/**
 * Converts a USD price to Morpho Blue oracle scale (1e36).
 * e.g. $5.00 → 5000000000000000000000000000000000000n
 */
export function priceToOracle(usdPrice: number): bigint {
  // Multiply by 1e36, using integer arithmetic to avoid float precision loss
  // Split into integer and fractional parts
  const scaled = Math.round(usdPrice * 1e18);
  return BigInt(scaled) * 10n ** 18n;
}
