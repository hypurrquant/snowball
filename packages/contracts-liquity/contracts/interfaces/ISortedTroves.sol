// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISortedTroves {
    function setAddressesRegistry(address _addressesRegistry) external;
    function insert(uint256 _id, uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) external;
    function remove(uint256 _id) external;
    function reInsert(uint256 _id, uint256 _newAnnualInterestRate, uint256 _prevId, uint256 _nextId) external;
    function contains(uint256 _id) external view returns (bool);
    function isEmpty() external view returns (bool);
    function getSize() external view returns (uint256);
    function getFirst() external view returns (uint256);
    function getLast() external view returns (uint256);
    function getNext(uint256 _id) external view returns (uint256);
    function getPrev(uint256 _id) external view returns (uint256);
    function findInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) external view returns (uint256, uint256);
}
