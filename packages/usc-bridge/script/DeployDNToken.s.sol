// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {DNToken} from "../src/DNToken.sol";

contract DeployDNToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        DNToken token = new DNToken(1_000_000 ether);
        
        vm.stopBroadcast();
    }
}
