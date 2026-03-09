import { MIN_DEBT } from "./constants";

const WAD = 10n ** 18n;
const DAYS_7 = 7n;
const DAYS_365 = 365n;

/**
 * Collateral Ratio = (coll * price) / debt * 100
 */
export function computeCR(coll: bigint, debt: bigint, price: bigint): number {
  if (debt === 0n) return Infinity;
  // Returns percentage: e.g. 1228 means 1228% CR
  // (coll * price / WAD) = collateral value, / debt * 100 = percentage
  return Number((coll * price * 100n) / (debt * WAD));
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

// ---------------------------------------------------------------------------
// Position preview (pure computation)
// ---------------------------------------------------------------------------

export interface PositionPreviewInput {
  coll: bigint;
  debt: bigint;
  rate: bigint;   // 18 decimals (5% = 5e16)
  price: bigint;
  mcr: bigint;
  ccr: bigint;
}

export interface PositionPreviewResult {
  cr: number;
  liquidationPrice: bigint;
  upfrontFee: bigint;
  annualCost: bigint;
  maxBorrow: bigint;
  isAboveMCR: boolean;
  isAboveCCR: boolean;
}

export function computePositionPreview(input: PositionPreviewInput): PositionPreviewResult {
  const { coll, debt, rate, price, mcr, ccr } = input;

  const cr = debt > 0n ? computeCR(coll, debt, price) : 0;
  const liqPrice = liquidationPrice(coll, debt, mcr);

  // upfrontFee = debt * rate * 7 / 365 (all 18-decimal math)
  const upfrontFee =
    debt > 0n && rate > 0n
      ? (debt * rate * DAYS_7) / (DAYS_365 * WAD)
      : 0n;

  // annualCost = debt * rate / 1e18
  const annualCost =
    debt > 0n && rate > 0n ? (debt * rate) / WAD : 0n;

  // maxBorrow = coll * price / mcr
  const maxBorrow =
    coll > 0n && price > 0n && mcr > 0n
      ? (coll * price) / mcr
      : 0n;

  // MCR is 18 decimals (e.g. 1.1e18 = 110%)
  const mcrPct = Number(mcr) / 1e16;
  const ccrPct = Number(ccr) / 1e16;
  const isAboveMCR = cr >= mcrPct;
  const isAboveCCR = cr >= ccrPct;

  return {
    cr,
    liquidationPrice: liqPrice,
    upfrontFee,
    annualCost,
    maxBorrow,
    isAboveMCR,
    isAboveCCR,
  };
}

// ---------------------------------------------------------------------------
// Market rate statistics (pure computation)
// ---------------------------------------------------------------------------

export interface RateStats {
  median: number; // %
  mean: number;   // %
  min: number;    // %
  max: number;    // %
  count: number;
}

export function computeRateStats(rates: number[]): RateStats | null {
  if (rates.length === 0) return null;

  const sorted = [...rates].sort((a, b) => a - b);

  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const mid = Math.floor(count / 2);
  const median =
    count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return {
    median,
    mean,
    min: sorted[0],
    max: sorted[count - 1],
    count,
  };
}

// ---------------------------------------------------------------------------
// Open Trove validation (pure computation)
// ---------------------------------------------------------------------------

export interface ValidateOpenTroveInput {
  collAmount: string;
  debtAmount: string;
  debtNum: number;
  cr: number;
  isAboveMCR: boolean;
  mcrPct: number;
  insufficientBalance: boolean;
  isPending: boolean;
}

export interface ValidateOpenTroveResult {
  errors: string[];
  canOpen: boolean;
  buttonText: string | null;
}

export function validateOpenTrove(input: ValidateOpenTroveInput): ValidateOpenTroveResult {
  const { collAmount, debtAmount, debtNum, cr, isAboveMCR, mcrPct, insufficientBalance, isPending } = input;

  const errors: string[] = [];
  if (debtNum > 0 && debtNum < MIN_DEBT) errors.push(`Minimum debt is ${MIN_DEBT} sbUSD.`);
  if (cr > 0 && !isAboveMCR) errors.push(`CR (${cr.toFixed(0)}%) is below MCR (${mcrPct.toFixed(0)}%). Increase collateral or reduce debt.`);

  const canOpen = !!collAmount && !!debtAmount && debtNum >= MIN_DEBT && isAboveMCR && !insufficientBalance;

  // Button text
  let buttonText: string | null;
  if (isPending) {
    buttonText = null; // spinner shown separately
  } else if (!collAmount) {
    buttonText = "Enter deposit amount";
  } else if (!debtAmount) {
    buttonText = "Enter borrow amount";
  } else if (debtNum > 0 && debtNum < MIN_DEBT) {
    buttonText = `Min debt: ${MIN_DEBT} sbUSD`;
  } else if (insufficientBalance) {
    buttonText = "Insufficient Balance";
  } else if (cr > 0 && !isAboveMCR) {
    buttonText = `CR too low (min ${mcrPct.toFixed(0)}%)`;
  } else {
    buttonText = "Open Trove";
  }

  return { errors, canOpen, buttonText };
}
