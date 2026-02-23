// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./CollateralRegistry.sol";
import "../interfaces/ITroveManager.sol";

/// @title HintHelpers — Off-chain hint computation for sorted troves insertion
contract HintHelpers {
    CollateralRegistry public collateralRegistry;

    constructor(address _collateralRegistry) {
        collateralRegistry = CollateralRegistry(_collateralRegistry);
    }

    /// @dev Get approximate insert position hint
    function getApproxHint(
        uint256 _branchIndex,
        uint256 _annualInterestRate,
        uint256 _numTrials,
        uint256 _seed
    ) external view returns (uint256 hintId, uint256 diff, uint256 latestRandomSeed) {
        address tmAddr = collateralRegistry.getTroveManager(_branchIndex);
        ITroveManager tm = ITroveManager(tmAddr);

        uint256 totalTroves = tm.getTroveIdsCount();
        if (totalTroves == 0) return (0, type(uint256).max, _seed);

        hintId = 0;
        diff = type(uint256).max;
        latestRandomSeed = _seed;

        uint256 trials = _numTrials > totalTroves ? totalTroves : _numTrials;

        for (uint256 i = 0; i < trials; i++) {
            uint256 troveId = tm.getTroveFromTroveIdsArray(i);
            uint256 rate = tm.getTroveAnnualInterestRate(troveId);
            uint256 currentDiff = _absDiff(rate, _annualInterestRate);

            if (currentDiff < diff) {
                diff = currentDiff;
                hintId = troveId;
            }
        }
    }

    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
