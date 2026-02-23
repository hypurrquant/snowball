// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITroveManager {
    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

    struct Trove {
        uint256 debt;
        uint256 coll;
        uint256 stake;
        Status status;
        uint64 arrayIndex;
        uint64 lastDebtUpdateTime;
        uint64 lastInterestRateAdjTime;
        uint256 annualInterestRate;
    }

    function getTroveStatus(uint256 _troveId) external view returns (uint8);
    function getTroveDebt(uint256 _troveId) external view returns (uint256);
    function getTroveColl(uint256 _troveId) external view returns (uint256);
    function getTroveAnnualInterestRate(uint256 _troveId) external view returns (uint256);
    function getCurrentICR(uint256 _troveId, uint256 _price) external view returns (uint256);
    function getTroveLastDebtUpdateTime(uint256 _troveId) external view returns (uint256);
    function getTroveIdsCount() external view returns (uint256);
    function getTroveFromTroveIdsArray(uint256 _index) external view returns (uint256);

    function setAddressesRegistry(address _addressesRegistry) external;
    function openTrove(
        address _owner,
        uint256 _troveId,
        uint256 _collAmount,
        uint256 _debtAmount,
        uint256 _annualInterestRate
    ) external;
    function closeTrove(uint256 _troveId) external;
    function adjustTrove(
        uint256 _troveId,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) external;
    function liquidate(uint256 _troveId) external;

    function adjustTroveInterestRate(
        uint256 _troveId,
        uint256 _newAnnualInterestRate
    ) external;

    function redeemCollateral(
        address _redeemer,
        uint256 _boldAmount,
        uint256 _price,
        uint256 _maxIterations
    ) external returns (uint256 collDrawn);

    function batchLiquidateTroves(uint256[] calldata _troveIds) external;

    function getLatestTroveData(uint256 _troveId) external view returns (
        uint256 debt,
        uint256 coll,
        uint256 stake,
        uint256 annualInterestRate,
        uint256 lastDebtUpdateTime
    );

    function getEntireDebtAndColl(uint256 _troveId) external view returns (
        uint256 debt,
        uint256 coll
    );
}
