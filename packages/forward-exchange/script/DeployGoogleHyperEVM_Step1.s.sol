// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title Deploy Google/USD Step 1: Create Series
contract DeployGoogleHyperEVM_Step1 is Script {
    bytes32 constant GOOGLE_USD_MARKET = keccak256("GOOGLE/USD");
    int256 constant FORWARD_RATE = 175e18;

    function run() external {
        address factory = vm.envAddress("FACTORY");
        uint256 maturityTime = vm.envUint("MATURITY");

        vm.startBroadcast();

        bytes32 seriesId = IMaturityTokenFactory(factory).createSeries(
            GOOGLE_USD_MARKET, maturityTime, FORWARD_RATE
        );

        vm.stopBroadcast();

        IMaturityTokenFactory.Series memory s = IMaturityTokenFactory(factory).getSeries(seriesId);
        console.log("Series ID:");
        console.logBytes32(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);
    }
}
