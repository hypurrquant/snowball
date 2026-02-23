// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISmartAccountFactory {
    event AccountCreated(address indexed owner, address indexed account);

    function createAccount(address owner) external returns (address);
    function getAccountAddress(address owner) external view returns (address);
    function hasAccount(address owner) external view returns (bool);
    function accounts(address owner) external view returns (address);
}
