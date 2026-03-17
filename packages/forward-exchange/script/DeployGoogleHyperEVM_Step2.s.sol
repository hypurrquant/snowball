// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {FXPoolUSDC} from "../src/tokenized/FXPoolUSDC.sol";

/// @title Deploy Google/USD Step 2: FXPool + FXPoolUSDC
contract DeployGoogleHyperEVM_Step2 is Script {
    uint256 constant T_MAX = 10e16;
    uint256 constant T_MIN = 2e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;

    function run() external {
        address fToken = vm.envAddress("FTOKEN");
        address sfToken = vm.envAddress("SFTOKEN");
        address usdc = vm.envAddress("MOCK_USDC");
        uint256 maturityTime = vm.envUint("MATURITY");

        vm.startBroadcast();

        FXPool pool = FXPoolDeployer.deploy(fToken, sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool GOOGLE:", address(pool));

        FXPoolUSDC usdcPool = new FXPoolUSDC(fToken, usdc, msg.sender);
        console.log("FXPoolUSDC GOOGLE:", address(usdcPool));

        vm.stopBroadcast();
    }
}
