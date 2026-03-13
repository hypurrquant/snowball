// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ForwardViewHelper} from "../src/cre/ForwardViewHelper.sol";

contract DeployViewHelper is Script {
    function run() external {
        vm.startBroadcast();
        ForwardViewHelper helper = new ForwardViewHelper();
        console.log("ForwardViewHelper:", address(helper));
        vm.stopBroadcast();
    }
}
