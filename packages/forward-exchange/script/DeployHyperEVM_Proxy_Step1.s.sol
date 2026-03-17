// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {RiskManager} from "../src/infrastructure/RiskManager.sol";
import {IRiskManager} from "../src/interfaces/IRiskManager.sol";
import {StubOracleAdapter} from "../src/oracle/StubOracleAdapter.sol";
import {OracleGuard} from "../src/oracle/OracleGuard.sol";
import {SettlementEngine} from "../src/infrastructure/SettlementEngine.sol";
import {ForwardSettlementConsumer} from "../src/cre/ForwardSettlementConsumer.sol";
import {Marketplace} from "../src/infrastructure/Marketplace.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";

/// @title HyperEVM Step 1 (Small Block): Deploy everything EXCEPT Forward (>3M gas)
/// @notice Outputs addresses needed for Step 2 (big block Forward deploy)
contract DeployHyperEVM_Proxy_Step1 is Script {
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 constant EUR_USD_FEED_ID = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;

    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("HYPEREVM_MOCK_USDC");

        vm.startBroadcast();

        // Vault
        Vault vault = Vault(address(new ERC1967Proxy(
            address(new Vault()),
            abi.encodeCall(Vault.initialize, (mockUsdc, deployer))
        )));
        console.log("Vault:", address(vault));

        // RiskManager
        RiskManager riskManager = RiskManager(address(new ERC1967Proxy(
            address(new RiskManager()),
            abi.encodeCall(RiskManager.initialize, (deployer))
        )));
        console.log("RiskManager:", address(riskManager));

        // StubOracle + OracleGuard
        StubOracleAdapter stubOracle = new StubOracleAdapter(deployer);
        stubOracle.setPrice(USD_KRW_FEED_ID, 1400e18);
        stubOracle.setPrice(USD_JPY_FEED_ID, 150e18);
        stubOracle.setPrice(EUR_USD_FEED_ID, 1_08e16);
        console.log("StubOracleAdapter:", address(stubOracle));

        OracleGuard oracleGuard = new OracleGuard(address(stubOracle), deployer);
        console.log("OracleGuard:", address(oracleGuard));

        // EscrowVault
        EscrowVault escrow = new EscrowVault(mockUsdc, deployer);
        console.log("EscrowVault:", address(escrow));

        vm.stopBroadcast();

        console.log("\n=== Step 1 Complete ===");
        console.log("Next: Enable big blocks, run Step 2 with these env vars:");
        console.log("HYPEREVM_VAULT_NEW=", address(vault));
        console.log("HYPEREVM_RISKMANAGER_NEW=", address(riskManager));
        console.log("HYPEREVM_ORACLEGUARD_NEW=", address(oracleGuard));
        console.log("HYPEREVM_ESCROW_NEW=", address(escrow));
    }
}
