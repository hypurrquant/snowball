import { TOKENS } from "@/core/config/addresses";
import type { Address } from "viem";

export type PriceDataPoint = {
  date: string;
  price: number;
};

function getPairKey(a: Address, b: Address): string {
  return a.toLowerCase() < b.toLowerCase() ? `${a}-${b}` : `${b}-${a}`;
}

// Seeded PRNG for deterministic data (avoids hydration mismatch)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePriceData(
  basePrice: number,
  trend: number,
  volatility: number,
  seed: number,
): PriceDataPoint[] {
  const rand = seededRandom(seed);
  const points: PriceDataPoint[] = [];
  let price = basePrice;

  // Use fixed start date to avoid date-based hydration issues
  const startDate = new Date("2026-02-04");

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

    const noise = (rand() - 0.5) * 2 * volatility * price;
    price = price * (1 + trend / 30) + noise;
    if (price < basePrice * 0.3) price = basePrice * 0.3;

    points.push({ date: label, price: Number(price.toFixed(6)) });
  }
  return points;
}

const PAIR_DATA: Record<string, PriceDataPoint[]> = {
  [getPairKey(TOKENS.wCTC, TOKENS.sbUSD)]: generatePriceData(2450, 0.08, 0.02, 1001),
  [getPairKey(TOKENS.wCTC, TOKENS.USDC)]: generatePriceData(2430, 0.06, 0.025, 2002),
  [getPairKey(TOKENS.wCTC, TOKENS.lstCTC)]: generatePriceData(0.95, -0.02, 0.01, 3003),
  [getPairKey(TOKENS.lstCTC, TOKENS.sbUSD)]: generatePriceData(2320, 0.1, 0.02, 4004),
  [getPairKey(TOKENS.lstCTC, TOKENS.USDC)]: generatePriceData(2300, 0.07, 0.025, 5005),
  [getPairKey(TOKENS.sbUSD, TOKENS.USDC)]: generatePriceData(1.0, 0.0, 0.003, 6006),
};

export function getPriceData(
  tokenIn: Address,
  tokenOut: Address,
): PriceDataPoint[] {
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return [];

  const key = getPairKey(tokenIn, tokenOut);
  const data = PAIR_DATA[key];
  if (!data) return [];

  // Data is stored as "units of sorted-first per 1 sorted-second".
  // Invert when tokenIn is the sorted-first (smaller address).
  const isReversed = tokenIn.toLowerCase() < tokenOut.toLowerCase();
  if (isReversed) {
    return data.map((p) => ({
      date: p.date,
      price: Number((1 / p.price).toFixed(6)),
    }));
  }
  return data;
}
