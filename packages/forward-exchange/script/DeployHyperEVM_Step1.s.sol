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
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";

/// @title Step 1 (Small Block): OTC system + EscrowVault
contract DeployHyperEVM_Step1 is Script {
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 constant EUR_USD_FEED_ID = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant USD_JPY_MARKET = keccak256("USD/JPY");
    bytes32 constant EUR_USD_MARKET = keccak256("EUR/USD");

    // Store addresses across internal functions
    address public vaultAddr;
    address public oracleGuardAddr;
    address public forwardAddr;
    address public riskManagerAddr;

    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("MOCK_USDC");
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");

        vm.startBroadcast();

        _deployCore(deployer, mockUsdc);
        _deploySettlement(deployer, keystoneForwarder);
        _configureMarkets();
        _deployEscrow(deployer, mockUsdc);

        vm.stopBroadcast();
    }

    function _deployCore(address deployer, address mockUsdc) internal {
        Vault vault = Vault(address(new ERC1967Proxy(
            address(new Vault()),
            abi.encodeCall(Vault.initialize, (mockUsdc, deployer))
        )));
        vaultAddr = address(vault);
        console.log("Vault:", vaultAddr);

        RiskManager rm = RiskManager(address(new ERC1967Proxy(
            address(new RiskManager()),
            abi.encodeCall(RiskManager.initialize, (deployer))
        )));
        riskManagerAddr = address(rm);
        console.log("RiskManager:", riskManagerAddr);

        StubOracleAdapter stubOracle = new StubOracleAdapter(deployer);
        stubOracle.setPrice(USD_KRW_FEED_ID, 1400e18);
        stubOracle.setPrice(USD_JPY_FEED_ID, 150e18);
        stubOracle.setPrice(EUR_USD_FEED_ID, 1_08e16);
        console.log("StubOracleAdapter:", address(stubOracle));

        OracleGuard og = new OracleGuard(address(stubOracle), deployer);
        oracleGuardAddr = address(og);
        console.log("OracleGuard:", oracleGuardAddr);

        Forward fwd = Forward(address(new ERC1967Proxy(
            address(new Forward()),
            abi.encodeCall(Forward.initialize, (vaultAddr, riskManagerAddr, oracleGuardAddr, deployer))
        )));
        forwardAddr = address(fwd);
        console.log("Forward:", forwardAddr);
    }

    function _deploySettlement(address deployer, address keystoneForwarder) internal {
        SettlementEngine se = SettlementEngine(address(new ERC1967Proxy(
            address(new SettlementEngine()),
            abi.encodeCall(SettlementEngine.initialize, (
                forwardAddr, oracleGuardAddr, vaultAddr, riskManagerAddr, deployer, 1 hours
            ))
        )));
        console.log("SettlementEngine:", address(se));

        ForwardSettlementConsumer consumer = ForwardSettlementConsumer(address(new ERC1967Proxy(
            address(new ForwardSettlementConsumer()),
            abi.encodeCall(ForwardSettlementConsumer.initialize, (
                forwardAddr, vaultAddr, riskManagerAddr, keystoneForwarder, deployer
            ))
        )));
        console.log("ForwardSettlementConsumer:", address(consumer));

        Marketplace marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (forwardAddr, vaultAddr, deployer))
        )));
        console.log("Marketplace:", address(marketplace));

        // Wire roles
        Vault v = Vault(vaultAddr);
        bytes32 opRole = v.OPERATOR_ROLE();
        v.grantRole(opRole, forwardAddr);
        v.grantRole(opRole, address(se));
        v.grantRole(opRole, address(consumer));
        v.grantRole(v.MARKETPLACE_ROLE(), address(marketplace));

        Forward fwd = Forward(forwardAddr);
        fwd.setSettlementEngine(address(se));
        fwd.grantRole(fwd.CRE_CONSUMER_ROLE(), address(consumer));

        // RiskManager operators
        RiskManager rm = RiskManager(riskManagerAddr);
        rm.setOperator(forwardAddr, true);
        rm.setOperator(address(se), true);
        rm.setOperator(address(consumer), true);
    }

    function _configureMarkets() internal {
        RiskManager rm = RiskManager(riskManagerAddr);
        IRiskManager.MarketConfig memory cfg = IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID, maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6, maxConcentrationBps: 10_000,
            minMaturity: 5 minutes, maxMaturity: 365 days, active: true
        });
        rm.addMarket(USD_KRW_MARKET, cfg);

        cfg.priceFeedId = USD_JPY_FEED_ID;
        rm.addMarket(USD_JPY_MARKET, cfg);

        cfg.priceFeedId = EUR_USD_FEED_ID;
        rm.addMarket(EUR_USD_MARKET, cfg);
    }

    function _deployEscrow(address deployer, address mockUsdc) internal {
        EscrowVault escrow = new EscrowVault(mockUsdc, deployer);
        console.log("EscrowVault:", address(escrow));
        console.log("ORACLE_GUARD:", oracleGuardAddr);
    }
}
