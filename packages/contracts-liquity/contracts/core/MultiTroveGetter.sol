// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CollateralRegistry.sol";
import "../interfaces/ITroveManager.sol";
import "../interfaces/ISortedTroves.sol";

/// @title MultiTroveGetter — Batch query multiple troves for frontend
contract MultiTroveGetter {
    struct CombinedTroveData {
        uint256 id;
        uint256 debt;
        uint256 coll;
        uint256 annualInterestRate;
        uint8 status;
    }

    CollateralRegistry public collateralRegistry;

    constructor(address _collateralRegistry) {
        collateralRegistry = CollateralRegistry(_collateralRegistry);
    }

    function getMultipleSortedTroves(
        uint256 _branchIndex,
        int256 _startIdx,
        uint256 _count
    ) external view returns (CombinedTroveData[] memory) {
        address troveManagerAddr = collateralRegistry.getTroveManager(_branchIndex);
        ITroveManager tm = ITroveManager(troveManagerAddr);

        uint256 totalTroves = tm.getTroveIdsCount();
        if (totalTroves == 0 || _count == 0) {
            return new CombinedTroveData[](0);
        }

        uint256 startIdx = _startIdx >= 0 ? uint256(_startIdx) : 0;
        uint256 endIdx = startIdx + _count;
        if (endIdx > totalTroves) endIdx = totalTroves;

        uint256 resultCount = endIdx - startIdx;
        CombinedTroveData[] memory result = new CombinedTroveData[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            uint256 troveId = tm.getTroveFromTroveIdsArray(startIdx + i);
            result[i] = CombinedTroveData({
                id: troveId,
                debt: tm.getTroveDebt(troveId),
                coll: tm.getTroveColl(troveId),
                annualInterestRate: tm.getTroveAnnualInterestRate(troveId),
                status: tm.getTroveStatus(troveId)
            });
        }

        return result;
    }
}
