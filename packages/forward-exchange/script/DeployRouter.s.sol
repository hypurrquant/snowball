// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Router} from "../src/tokenized/Router.sol";

/// @notice Redeploy Router only (factory + usdc from env)
contract DeployRouter is Script {
    function run() external {
        address factory = vm.envAddress("FACTORY");
        address usdc = vm.envAddress("MOCK_USDC");

        vm.startBroadcast();
        Router router = new Router(factory, usdc);
        console.log("Router:", address(router));
        vm.stopBroadcast();
    }
}
