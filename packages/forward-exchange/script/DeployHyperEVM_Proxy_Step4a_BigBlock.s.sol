// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title HyperEVM Step 4a (Big Block): createSeries x2 (>3M gas each)
contract DeployHyperEVM_Proxy_Step4a_BigBlock is Script {
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant EUR_USD_MARKET = keccak256("EUR/USD");
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE_KRW = 1400e18;
    int256 constant FORWARD_RATE_EUR = 1_08e16;

    function run() external {
        MaturityTokenFactory factory = MaturityTokenFactory(vm.envAddress("HYPEREVM_FACTORY_NEW"));

        vm.startBroadcast();

        uint256 maturityTime = block.timestamp + POOL_LIFETIME;

        bytes32 seriesIdKRW = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE_KRW);
        IMaturityTokenFactory.Series memory sKRW = factory.getSeries(seriesIdKRW);
        console.log("KRW fToken:", sKRW.fToken);
        console.log("KRW sfToken:", sKRW.sfToken);

        bytes32 seriesIdEUR = factory.createSeries(EUR_USD_MARKET, maturityTime, FORWARD_RATE_EUR);
        IMaturityTokenFactory.Series memory sEUR = factory.getSeries(seriesIdEUR);
        console.log("EUR fToken:", sEUR.fToken);
        console.log("EUR sfToken:", sEUR.sfToken);

        vm.stopBroadcast();

        console.log("\n=== Step 4a (Big Block) Complete ===");
        console.log("maturityTime:", maturityTime);
        console.logBytes32(seriesIdKRW);
        console.logBytes32(seriesIdEUR);
    }
}
