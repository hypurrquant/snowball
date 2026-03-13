// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";

/// @title Step 1: Deploy large contracts that exceed small block gas limit (3M)
/// @notice Run with big blocks enabled. Only MaturityTokenFactory needs this.
contract DeployHyperEVM_Step1_BigBlock is Script {
    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("MOCK_USDC");
        // OracleGuard will be deployed in Step 2, use placeholder
        // We need EscrowVault first since Factory depends on it
        address oracleGuard = vm.envAddress("ORACLE_GUARD");

        vm.startBroadcast();

        MaturityTokenFactory factory = new MaturityTokenFactory(
            mockUsdc, vm.envAddress("ESCROW_VAULT"), oracleGuard, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        vm.stopBroadcast();
    }
}
