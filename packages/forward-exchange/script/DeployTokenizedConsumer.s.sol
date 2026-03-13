// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {TokenizedSettlementConsumer} from "../src/cre/TokenizedSettlementConsumer.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";

/// @title DeployTokenizedConsumer
/// @notice Deployment script for the Tokenized CRE Settlement Consumer
contract DeployTokenizedConsumer is Script {
    function run() external {
        address deployer = msg.sender;
        address factory = vm.envAddress("MATURITY_TOKEN_FACTORY");
        address forwarder = vm.envAddress("KEYSTONE_FORWARDER");

        vm.startBroadcast();

        // 1. Deploy TokenizedSettlementConsumer
        TokenizedSettlementConsumer consumer = new TokenizedSettlementConsumer(
            factory, forwarder, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(consumer));

        // 2. Grant CRE_CONSUMER_ROLE on Factory to Consumer
        MaturityTokenFactory factoryContract = MaturityTokenFactory(factory);
        factoryContract.grantRole(factoryContract.CRE_CONSUMER_ROLE(), address(consumer));
        console.log("CRE_CONSUMER_ROLE granted to consumer");

        vm.stopBroadcast();

        console.log("\n=== Tokenized Consumer Deployment Complete ===");
        console.log("Factory:", factory);
        console.log("Forwarder:", forwarder);
    }
}
