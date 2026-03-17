// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {RiskManager} from "../src/infrastructure/RiskManager.sol";
import {IRiskManager} from "../src/interfaces/IRiskManager.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {SettlementEngine} from "../src/infrastructure/SettlementEngine.sol";
import {ForwardSettlementConsumer} from "../src/cre/ForwardSettlementConsumer.sol";
import {Marketplace} from "../src/infrastructure/Marketplace.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {TokenizedSettlementConsumer} from "../src/cre/TokenizedSettlementConsumer.sol";
import {CollateralSwap} from "../src/tokenized/CollateralSwap.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title HyperEVM Step 3 (Small Block): Deploy remaining contracts + wire roles + tokenized AMM
contract DeployHyperEVM_Proxy_Step3 is Script {
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 constant EUR_USD_FEED_ID = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant USD_JPY_MARKET = keccak256("USD/JPY");
    bytes32 constant EUR_USD_MARKET = keccak256("EUR/USD");

    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE_KRW = 1400e18;
    int256 constant FORWARD_RATE_EUR = 1_08e16;

    // State vars to pass between internal functions
    Vault public vault;
    RiskManager public riskManager;
    Forward public forward;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;
    SettlementEngine public se;
    ForwardSettlementConsumer public consumer;
    Marketplace public marketplace;
    address public deployer;
    address public mockUsdc;
    address public keystoneForwarder;
    address public oracleGuardAddr;

    function run() external {
        deployer = msg.sender;
        mockUsdc = vm.envAddress("HYPEREVM_MOCK_USDC");
        keystoneForwarder = vm.envAddress("HYPEREVM_KEYSTONE_FORWARDER");
        vault = Vault(vm.envAddress("HYPEREVM_VAULT_NEW"));
        riskManager = RiskManager(vm.envAddress("HYPEREVM_RISKMANAGER_NEW"));
        oracleGuardAddr = vm.envAddress("HYPEREVM_ORACLEGUARD_NEW");
        forward = Forward(vm.envAddress("HYPEREVM_FORWARD_NEW"));
        escrow = EscrowVault(vm.envAddress("HYPEREVM_ESCROW_NEW"));
        factory = MaturityTokenFactory(vm.envAddress("HYPEREVM_FACTORY_NEW"));

        vm.startBroadcast();

        _deployOTCInfra();
        _wireRoles();
        _configureMarkets();
        _deployTokenizedAMM();
        _deployAUSDC();

        vm.stopBroadcast();

        console.log("\n=== HyperEVM Full Deployment Complete ===");
    }

    function _deployOTCInfra() internal {
        se = SettlementEngine(address(new ERC1967Proxy(
            address(new SettlementEngine()),
            abi.encodeCall(SettlementEngine.initialize, (
                address(forward), oracleGuardAddr, address(vault), address(riskManager), deployer, 30 days
            ))
        )));
        console.log("SettlementEngine:", address(se));

        consumer = ForwardSettlementConsumer(address(new ERC1967Proxy(
            address(new ForwardSettlementConsumer()),
            abi.encodeCall(ForwardSettlementConsumer.initialize, (
                address(forward), address(vault), address(riskManager), keystoneForwarder, deployer
            ))
        )));
        console.log("ForwardSettlementConsumer:", address(consumer));

        marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (address(forward), address(vault), deployer))
        )));
        console.log("Marketplace:", address(marketplace));
    }

    function _wireRoles() internal {
        bytes32 opRole = vault.OPERATOR_ROLE();
        vault.grantRole(opRole, address(forward));
        vault.grantRole(opRole, address(se));
        vault.grantRole(opRole, address(consumer));
        vault.grantRole(vault.MARKETPLACE_ROLE(), address(marketplace));

        forward.setSettlementEngine(address(se));
        forward.grantRole(forward.CRE_CONSUMER_ROLE(), address(consumer));

        riskManager.setOperator(address(forward), true);
        riskManager.setOperator(address(se), true);
        riskManager.setOperator(address(consumer), true);
    }

    function _configureMarkets() internal {
        IRiskManager.MarketConfig memory cfg = IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID, maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6, maxConcentrationBps: 10_000,
            minMaturity: 5 minutes, maxMaturity: 365 days, active: true
        });
        riskManager.addMarket(USD_KRW_MARKET, cfg);
        cfg.priceFeedId = USD_JPY_FEED_ID;
        riskManager.addMarket(USD_JPY_MARKET, cfg);
        cfg.priceFeedId = EUR_USD_FEED_ID;
        riskManager.addMarket(EUR_USD_MARKET, cfg);
    }

    function _deployTokenizedAMM() internal {
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);
        factory.setMarketFeedId(EUR_USD_MARKET, EUR_USD_FEED_ID);

        uint256 maturityTime = block.timestamp + POOL_LIFETIME;

        bytes32 seriesIdKRW = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE_KRW);
        IMaturityTokenFactory.Series memory sKRW = factory.getSeries(seriesIdKRW);
        console.log("KRW fToken:", sKRW.fToken);
        console.log("KRW sfToken:", sKRW.sfToken);

        FXPool poolKRW = FXPoolDeployer.deploy(sKRW.fToken, sKRW.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool KRW:", address(poolKRW));

        bytes32 seriesIdEUR = factory.createSeries(EUR_USD_MARKET, maturityTime, FORWARD_RATE_EUR);
        IMaturityTokenFactory.Series memory sEUR = factory.getSeries(seriesIdEUR);
        console.log("EUR fToken:", sEUR.fToken);
        console.log("EUR sfToken:", sEUR.sfToken);

        FXPool poolEUR = FXPoolDeployer.deploy(sEUR.fToken, sEUR.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(poolEUR));

        Router router = new Router(address(factory), mockUsdc);
        console.log("Router:", address(router));

        TokenizedSettlementConsumer tConsumer = new TokenizedSettlementConsumer(
            address(factory), keystoneForwarder, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(tConsumer));
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(tConsumer));

        console.logBytes32(seriesIdKRW);
        console.logBytes32(seriesIdEUR);
    }

    function _deployAUSDC() internal {
        ERC20Mock aUsdc = new ERC20Mock("Aave USDC", "aUSDC", 6);
        aUsdc.mint(deployer, 1_000_000_000e6);
        console.log("aUSDC:", address(aUsdc));

        CollateralSwap swap = new CollateralSwap(deployer);
        swap.approvePair(mockUsdc, address(aUsdc));
        ERC20Mock(mockUsdc).mint(address(swap), 100_000_000e6);
        console.log("CollateralSwap:", address(swap));
    }
}
