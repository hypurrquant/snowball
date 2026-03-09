/** Liquity branch indices matching on-chain deployment order */
export const BRANCH_INDEX: Record<string, bigint> = { wCTC: 0n, lstCTC: 1n };

/** Gas compensation deposited to GasPool on openTrove, returned on closeTrove (0.2 wCTC) */
export const ETH_GAS_COMPENSATION = 2n * 10n ** 17n;

/** Matches on-chain Constants.sol MIN_DEBT = 10e18 */
export const MIN_DEBT = 10;

/** Minimum interest rate: 0.5% (18 decimals) */
export const MIN_INTEREST_RATE = 5n * 10n ** 15n;

/** Maximum interest rate: 15% (18 decimals) */
export const MAX_INTEREST_RATE = 15n * 10n ** 16n;

/** Default permission expiry in days */
export const PERMISSION_EXPIRY_DAYS = 30;
