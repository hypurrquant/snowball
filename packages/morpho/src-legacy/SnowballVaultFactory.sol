// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

// Snowball Vault Factory -- MetaMorpho factory fork on Creditcoin
// Original: https://github.com/morpho-org/metamorpho (GPL-2.0)

import {SnowballVault} from "./SnowballVault.sol";

/**
 * @title SnowballVaultFactory
 * @notice Factory for deploying SnowballVault (MetaMorpho fork) instances.
 */
contract SnowballVaultFactory {
    address public immutable snowballLend;

    event CreateVault(
        address indexed vault,
        address indexed initialOwner,
        uint256 initialTimelock,
        address indexed asset,
        string name,
        string symbol
    );

    constructor(address _snowballLend) {
        snowballLend = _snowballLend;
    }

    function createVault(
        address initialOwner,
        uint256 initialTimelock,
        address asset,
        string memory name,
        string memory symbol,
        bytes32 salt
    ) external returns (SnowballVault vault) {
        vault = new SnowballVault{salt: salt}(
            snowballLend,
            initialOwner,
            initialTimelock,
            asset,
            name,
            symbol
        );
        emit CreateVault(address(vault), initialOwner, initialTimelock, asset, name, symbol);
    }
}
