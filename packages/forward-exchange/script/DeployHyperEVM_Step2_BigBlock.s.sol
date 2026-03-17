// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";

/// @title Step 2 (Big Block): Deploy MaturityTokenFactory only (~3.1M gas)
/// @notice Enable big blocks before running this script
contract DeployHyperEVM_Step2_BigBlock is Script {
    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("MOCK_USDC");
        address escrowVault = vm.envAddress("ESCROW_VAULT");
        address oracleGuard = vm.envAddress("ORACLE_GUARD");

        vm.startBroadcast();

        MaturityTokenFactory factory = new MaturityTokenFactory(
            mockUsdc, escrowVault, oracleGuard, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        vm.stopBroadcast();
    }
}
