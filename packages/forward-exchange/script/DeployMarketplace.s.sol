// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Marketplace} from "../src/infrastructure/Marketplace.sol";
import {Vault} from "../src/infrastructure/Vault.sol";

/// @title DeployMarketplace
/// @notice Deploy only the Marketplace contract and wire it to existing Vault
contract DeployMarketplace is Script {
    // Existing Base Sepolia deployments
    address constant FORWARD = 0x40E8d1Cc9B99Db573979Bc042A47760dc16572aE;
    address constant VAULT = 0xc82ED91506a8f07F8af2cD14556Ddf5592568c50;

    function run() external {
        address deployer = msg.sender;

        vm.startBroadcast();

        // Deploy Marketplace (UUPS proxy)
        Marketplace marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (FORWARD, VAULT, deployer))
        )));
        console.log("Marketplace:", address(marketplace));

        // Grant MARKETPLACE_ROLE on Vault
        Vault vault = Vault(VAULT);
        vault.grantRole(vault.MARKETPLACE_ROLE(), address(marketplace));
        console.log("MARKETPLACE_ROLE granted");

        vm.stopBroadcast();
    }
}
