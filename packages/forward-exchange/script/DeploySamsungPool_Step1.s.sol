// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title Deploy Samsung/USD - Step 1: Create Series (HyperEVM gas-limit safe)
contract DeploySamsungPool_Step1 is Script {
    bytes32 constant SAMSUNG_USD_MARKET = keccak256("SAMSUNG/USD");
    int256 constant FORWARD_RATE = 127e18;

    function run() external {
        address factory = vm.envAddress("FACTORY");
        uint256 maturityTime = vm.envUint("MATURITY");

        vm.startBroadcast();

        bytes32 seriesId = IMaturityTokenFactory(factory).createSeries(
            SAMSUNG_USD_MARKET, maturityTime, FORWARD_RATE
        );
        console.log("Series created, ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = IMaturityTokenFactory(factory).getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        vm.stopBroadcast();
    }
}
