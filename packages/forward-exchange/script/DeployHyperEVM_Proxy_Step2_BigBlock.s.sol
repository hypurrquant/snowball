// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";

/// @title HyperEVM Step 2 (Big Block): Deploy Forward + MaturityTokenFactory (>3M gas each)
/// @notice Requires big blocks enabled on HyperEVM
contract DeployHyperEVM_Proxy_Step2_BigBlock is Script {
    function run() external {
        address deployer = msg.sender;
        address vaultAddr = vm.envAddress("HYPEREVM_VAULT_NEW");
        address riskManagerAddr = vm.envAddress("HYPEREVM_RISKMANAGER_NEW");
        address oracleGuardAddr = vm.envAddress("HYPEREVM_ORACLEGUARD_NEW");
        address mockUsdc = vm.envAddress("HYPEREVM_MOCK_USDC");
        address escrowAddr = vm.envAddress("HYPEREVM_ESCROW_NEW");

        vm.startBroadcast();

        // Forward (UUPS proxy) — implementation is ~4.2M gas
        Forward forward = Forward(address(new ERC1967Proxy(
            address(new Forward()),
            abi.encodeCall(Forward.initialize, (vaultAddr, riskManagerAddr, oracleGuardAddr, deployer))
        )));
        console.log("Forward:", address(forward));

        // MaturityTokenFactory — also large
        MaturityTokenFactory factory = new MaturityTokenFactory(
            mockUsdc, escrowAddr, oracleGuardAddr, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        vm.stopBroadcast();

        console.log("\n=== Step 2 (Big Block) Complete ===");
        console.log("Next: Disable big blocks, run Step 3");
        console.log("HYPEREVM_FORWARD_NEW=", address(forward));
        console.log("HYPEREVM_FACTORY_NEW=", address(factory));
    }
}
