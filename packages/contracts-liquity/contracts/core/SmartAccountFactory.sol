// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ISmartAccountFactory.sol";
import "./SmartAccount.sol";

/**
 * @title SmartAccountFactory
 * @notice Deploys SmartAccount instances using CREATE2 for deterministic addresses.
 *         Each owner can only have one SmartAccount.
 */
contract SmartAccountFactory is ISmartAccountFactory {
    mapping(address => address) public override accounts;

    function createAccount(address owner) external override returns (address) {
        require(owner != address(0), "SmartAccountFactory: zero owner");
        require(accounts[owner] == address(0), "SmartAccountFactory: already exists");

        bytes32 salt = bytes32(uint256(uint160(owner)));
        SmartAccount account = new SmartAccount{salt: salt}(owner);
        address accountAddr = address(account);

        accounts[owner] = accountAddr;
        emit AccountCreated(owner, accountAddr);
        return accountAddr;
    }

    function getAccountAddress(address owner) external view override returns (address) {
        if (accounts[owner] != address(0)) {
            return accounts[owner];
        }

        bytes32 salt = bytes32(uint256(uint160(owner)));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(type(SmartAccount).creationCode, abi.encode(owner)))
            )
        );
        return address(uint160(uint256(hash)));
    }

    function hasAccount(address owner) external view override returns (bool) {
        return accounts[owner] != address(0);
    }
}
