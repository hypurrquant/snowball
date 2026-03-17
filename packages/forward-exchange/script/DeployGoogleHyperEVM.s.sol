// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {FXPoolUSDC} from "../src/tokenized/FXPoolUSDC.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title Deploy Google/USD pool on HyperEVM (series + FXPool + FXPoolUSDC)
contract DeployGoogleHyperEVM is Script {
    bytes32 constant GOOGLE_USD_MARKET = keccak256("GOOGLE/USD");
    int256 constant FORWARD_RATE = 175e18; // ~$175 USD

    uint256 constant T_MAX = 10e16;  // 0.10
    uint256 constant T_MIN = 2e16;   // 0.02
    uint256 constant FEE_MAX = 3e15; // 0.3%
    uint256 constant POOL_LIFETIME = 90 days;

    function run() external {
        address factory = vm.envAddress("FACTORY");
        address usdc = vm.envAddress("MOCK_USDC");
        uint256 maturityTime = vm.envUint("MATURITY");

        vm.startBroadcast();

        // 1. Create series
        bytes32 seriesId = IMaturityTokenFactory(factory).createSeries(
            GOOGLE_USD_MARKET, maturityTime, FORWARD_RATE
        );
        console.log("Series ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = IMaturityTokenFactory(factory).getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        // 2. Deploy Yield Space FXPool (UUPS proxy)
        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool GOOGLE:", address(pool));

        // 3. Deploy FXPoolUSDC (constant product)
        FXPoolUSDC usdcPool = new FXPoolUSDC(s.fToken, usdc, msg.sender);
        console.log("FXPoolUSDC GOOGLE:", address(usdcPool));

        vm.stopBroadcast();

        console.log("\n=== Google/USD HyperEVM Deployment Complete ===");
    }
}
