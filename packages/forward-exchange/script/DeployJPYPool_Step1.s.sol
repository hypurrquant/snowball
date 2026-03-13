// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @notice Step 1: createSeries only (needs big block on HyperEVM, ~3.5M gas)
contract DeployJPYPool_Step1 is Script {
    function run() external {
        MaturityTokenFactory factory = MaturityTokenFactory(0xD7966b295a130C33377dE1e8a9D33487098847eD);

        vm.startBroadcast();
        bytes32 seriesId = factory.createSeries(
            keccak256("USD/JPY"),
            1780575178,  // same maturity as KRW/EUR
            150e18       // USD/JPY ~150
        );
        vm.stopBroadcast();

        console.log("Series ID:");
        console.logBytes32(seriesId);
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);
    }
}
