// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title Deploy Samsung/USD pool on existing MaturityTokenFactory
/// @notice Step 1: createSeries, Step 2: deploy FXPool
contract DeploySamsungPool is Script {
    bytes32 constant SAMSUNG_USD_MARKET = keccak256("SAMSUNG/USD");
    int256 constant FORWARD_RATE = 127e18; // ~$127 USD

    uint256 constant T_MAX = 25e16;  // 0.25
    uint256 constant T_MIN = 5e16;   // 0.05
    uint256 constant FEE_MAX = 3e15; // 0.3%
    uint256 constant POOL_LIFETIME = 90 days;

    function run() external {
        address factory = vm.envAddress("FACTORY");
        uint256 maturityTime = vm.envUint("MATURITY");

        vm.startBroadcast();

        // 1. Create series
        bytes32 seriesId = IMaturityTokenFactory(factory).createSeries(
            SAMSUNG_USD_MARKET, maturityTime, FORWARD_RATE
        );
        console.log("Series created, ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = IMaturityTokenFactory(factory).getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        // 2. Deploy FXPool
        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool SAMSUNG:", address(pool));

        vm.stopBroadcast();

        console.log("\n=== Samsung/USD Pool Deployment Complete ===");
        console.log("Maturity:", maturityTime);
        console.log("Forward Rate: 127 USD");
    }
}
