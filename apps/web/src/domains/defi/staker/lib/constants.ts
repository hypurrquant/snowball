import { STAKER } from "@snowball/core/src/config/addresses";

/** Maximum lead time before an incentive can start (30 days in seconds) */
export const MAX_INCENTIVE_START_LEAD_TIME = STAKER.maxIncentiveStartLeadTime;

/** Maximum duration for an incentive (~2 years in seconds) */
export const MAX_INCENTIVE_DURATION = STAKER.maxIncentiveDuration;

/** SnowballStaker contract address */
export const STAKER_ADDRESS = STAKER.snowballStaker;
