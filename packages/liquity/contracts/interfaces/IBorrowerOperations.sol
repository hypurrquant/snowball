// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBorrowerOperations {
    function setAddressesRegistry(address _addressesRegistry) external;
    function setCollateralRegistry(address _collateralRegistry) external;

    function openTrove(
        address _owner,
        uint256 _ownerIndex,
        uint256 _collAmount,
        uint256 _boldAmount,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _annualInterestRate,
        uint256 _maxUpfrontFee
    ) external returns (uint256 troveId);

    function closeTrove(uint256 _troveId) external;

    function adjustTrove(
        uint256 _troveId,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _boldChange,
        bool _isDebtIncrease,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee
    ) external;

    function addColl(uint256 _troveId, uint256 _collAmount) external;
    function withdrawColl(uint256 _troveId, uint256 _collAmount) external;
    function withdrawBold(uint256 _troveId, uint256 _boldAmount, uint256 _maxUpfrontFee) external;
    function repayBold(uint256 _troveId, uint256 _boldAmount) external;

    function adjustTroveInterestRate(
        uint256 _troveId,
        uint256 _newAnnualInterestRate,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee
    ) external;

    function claimCollateral() external;
}
