// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {RiskManager} from "../src/infrastructure/RiskManager.sol";
import {IRiskManager} from "../src/interfaces/IRiskManager.sol";
import {StubOracleAdapter} from "../src/oracle/StubOracleAdapter.sol";
import {OracleGuard} from "../src/oracle/OracleGuard.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {SettlementEngine} from "../src/infrastructure/SettlementEngine.sol";
import {ForwardSettlementConsumer} from "../src/cre/ForwardSettlementConsumer.sol";
import {Marketplace} from "../src/infrastructure/Marketplace.sol";

/// @title Deploy
/// @notice Full deployment script for Base Sepolia (UUPS proxy pattern)
contract Deploy is Script {
    // Base Sepolia USDC (Circle)
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // CRE feed IDs (used as market identifiers)
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant USD_JPY_MARKET = keccak256("USD/JPY");

    function run() external {
        address deployer = msg.sender;
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");

        vm.startBroadcast();

        // 1. Deploy Vault (UUPS proxy)
        Vault vault = Vault(address(new ERC1967Proxy(
            address(new Vault()),
            abi.encodeCall(Vault.initialize, (USDC, deployer))
        )));
        console.log("Vault:", address(vault));

        // 2. Deploy RiskManager (UUPS proxy)
        RiskManager riskManager = RiskManager(address(new ERC1967Proxy(
            address(new RiskManager()),
            abi.encodeCall(RiskManager.initialize, (deployer))
        )));
        console.log("RiskManager:", address(riskManager));

        // 3. Deploy StubOracleAdapter (simple admin-set oracle for demo)
        StubOracleAdapter stubOracle = new StubOracleAdapter(deployer);
        stubOracle.setPrice(USD_KRW_FEED_ID, 1400e18); // USD/KRW ~1400
        stubOracle.setPrice(USD_JPY_FEED_ID, 150e18);   // USD/JPY ~150
        console.log("StubOracleAdapter:", address(stubOracle));

        // 4. Deploy OracleGuard
        OracleGuard oracleGuard = new OracleGuard(address(stubOracle), deployer);
        console.log("OracleGuard:", address(oracleGuard));

        // 5. Deploy Forward (UUPS proxy)
        Forward forward = Forward(address(new ERC1967Proxy(
            address(new Forward()),
            abi.encodeCall(Forward.initialize, (address(vault), address(riskManager), address(oracleGuard), deployer))
        )));
        console.log("Forward:", address(forward));

        // 6. Deploy SettlementEngine (UUPS proxy)
        SettlementEngine settlementEngine = SettlementEngine(address(new ERC1967Proxy(
            address(new SettlementEngine()),
            abi.encodeCall(SettlementEngine.initialize, (
                address(forward), address(oracleGuard), address(vault),
                address(riskManager), deployer, 1 hours
            ))
        )));
        console.log("SettlementEngine:", address(settlementEngine));

        // 7. Deploy ForwardSettlementConsumer (UUPS proxy)
        ForwardSettlementConsumer consumer = ForwardSettlementConsumer(address(new ERC1967Proxy(
            address(new ForwardSettlementConsumer()),
            abi.encodeCall(ForwardSettlementConsumer.initialize, (
                address(forward), address(vault), address(riskManager), keystoneForwarder, deployer
            ))
        )));
        console.log("ForwardSettlementConsumer:", address(consumer));

        // 8. Deploy Marketplace (UUPS proxy)
        Marketplace marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (address(forward), address(vault), deployer))
        )));
        console.log("Marketplace:", address(marketplace));

        // 9. Wire up roles
        bytes32 opRole = vault.OPERATOR_ROLE();
        vault.grantRole(opRole, address(forward));
        vault.grantRole(opRole, address(settlementEngine));
        vault.grantRole(opRole, address(consumer));
        vault.grantRole(vault.MARKETPLACE_ROLE(), address(marketplace));

        forward.setSettlementEngine(address(settlementEngine));
        forward.grantRole(forward.CRE_CONSUMER_ROLE(), address(consumer));

        // RiskManager operators
        riskManager.setOperator(address(forward), true);
        riskManager.setOperator(address(settlementEngine), true);
        riskManager.setOperator(address(consumer), true);

        // 10. Configure markets
        riskManager.addMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 10_000,
            minMaturity: 5 minutes,
            maxMaturity: 365 days,
            active: true
        }));

        riskManager.addMarket(USD_JPY_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_JPY_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 10_000,
            minMaturity: 5 minutes,
            maxMaturity: 365 days,
            active: true
        }));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Chain: Base Sepolia (84532)");
    }
}
