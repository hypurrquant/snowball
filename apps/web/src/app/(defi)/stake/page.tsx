"use client";

import { useAccount } from "wagmi";
import { STAKER } from "@snowball/core/src/config/addresses";

export default function StakePage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-6">
      {/* Staker Info */}
      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-semibold">SnowballStaker</h2>
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          Stake your Uniswap V3 LP NFTs to earn incentive rewards while
          continuing to earn swap fees.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Contract: </span>
            <code className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
              {STAKER.snowballStaker}
            </code>
          </div>
        </div>
      </section>

      {/* Connection Gate */}
      {!isConnected ? (
        <section className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">
            Connect your wallet to view deposited positions, available
            incentives, and pending rewards.
          </p>
        </section>
      ) : (
        <>
          {/* Deposited Positions */}
          <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold">Deposited Positions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              LP NFTs deposited in the staker. Transfer your Uniswap V3 positions
              here to start earning rewards.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400 dark:bg-gray-800">
              No positions deposited yet
            </div>
          </section>

          {/* Available Incentives */}
          <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold">Available Incentives</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active reward programs for LP positions. Stake into an incentive to
              earn rewards proportional to your liquidity and time in range.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400 dark:bg-gray-800">
              No active incentives
            </div>
          </section>

          {/* Pending Rewards */}
          <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold">Pending Rewards</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unclaimed rewards from staking. Unstake a position to accrue
              rewards, then claim them.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400 dark:bg-gray-800">
              No pending rewards
            </div>
          </section>
        </>
      )}
    </div>
  );
}
