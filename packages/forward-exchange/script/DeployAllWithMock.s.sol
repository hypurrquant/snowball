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
import {TokenizedSettlementConsumer} from "../src/cre/TokenizedSettlementConsumer.sol";
import {Marketplace} from "../src/infrastructure/Marketplace.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {CollateralSwap} from "../src/tokenized/CollateralSwap.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title DeployAllWithMock
/// @notice Redeploys ALL systems (P2P OTC + Tokenized AMM) using already-deployed MockUSDC
contract DeployAllWithMock is Script {
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
    int256 constant FORWARD_RATE_EUR = 1_08e16; // 1.08 EUR/USD

    // Store deployed addresses
    address public vault;
    address public oracleGuard;

    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("MOCK_USDC");
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");

        vm.startBroadcast();

        _deployOTC(deployer, mockUsdc, keystoneForwarder);
        _deployTokenizedAMM(deployer, mockUsdc);

        vm.stopBroadcast();

        console.log("\n=== Full Deployment Complete (All MockUSDC) ===");
    }

    address public keystoneForwarderAddr;

    function _deployOTC(address deployer, address mockUsdc, address keystoneForwarder) internal {
        keystoneForwarderAddr = keystoneForwarder;
        console.log("=== P2P OTC System ===");

        Vault v = Vault(address(new ERC1967Proxy(
            address(new Vault()),
            abi.encodeCall(Vault.initialize, (mockUsdc, deployer))
        )));
        vault = address(v);
        console.log("Vault:", vault);

        RiskManager riskManager = RiskManager(address(new ERC1967Proxy(
            address(new RiskManager()),
            abi.encodeCall(RiskManager.initialize, (deployer))
        )));
        console.log("RiskManager:", address(riskManager));

        StubOracleAdapter stubOracle = new StubOracleAdapter(deployer);
        stubOracle.setPrice(USD_KRW_FEED_ID, 1400e18);
        stubOracle.setPrice(USD_JPY_FEED_ID, 150e18);
        stubOracle.setPrice(EUR_USD_FEED_ID, 1_08e16); // 1.08
        console.log("StubOracleAdapter:", address(stubOracle));

        OracleGuard og = new OracleGuard(address(stubOracle), deployer);
        oracleGuard = address(og);
        console.log("OracleGuard:", oracleGuard);

        Forward forward = Forward(address(new ERC1967Proxy(
            address(new Forward()),
            abi.encodeCall(Forward.initialize, (vault, address(riskManager), oracleGuard, deployer))
        )));
        console.log("Forward:", address(forward));

        SettlementEngine se = SettlementEngine(address(new ERC1967Proxy(
            address(new SettlementEngine()),
            abi.encodeCall(SettlementEngine.initialize, (
                address(forward), oracleGuard, vault, address(riskManager), deployer, 1 hours
            ))
        )));
        console.log("SettlementEngine:", address(se));

        ForwardSettlementConsumer consumer = ForwardSettlementConsumer(address(new ERC1967Proxy(
            address(new ForwardSettlementConsumer()),
            abi.encodeCall(ForwardSettlementConsumer.initialize, (
                address(forward), vault, address(riskManager), keystoneForwarder, deployer
            ))
        )));
        console.log("ForwardSettlementConsumer:", address(consumer));

        Marketplace marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (address(forward), vault, deployer))
        )));
        console.log("Marketplace:", address(marketplace));

        // Wire roles
        bytes32 opRole = v.OPERATOR_ROLE();
        v.grantRole(opRole, address(forward));
        v.grantRole(opRole, address(se));
        v.grantRole(opRole, address(consumer));
        v.grantRole(v.MARKETPLACE_ROLE(), address(marketplace));
        forward.setSettlementEngine(address(se));
        forward.grantRole(forward.CRE_CONSUMER_ROLE(), address(consumer));

        // RiskManager operators
        riskManager.setOperator(address(forward), true);
        riskManager.setOperator(address(se), true);
        riskManager.setOperator(address(consumer), true);

        // Configure markets
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
        riskManager.addMarket(EUR_USD_MARKET, IRiskManager.MarketConfig({
            priceFeedId: EUR_USD_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 10_000,
            minMaturity: 5 minutes,
            maxMaturity: 365 days,
            active: true
        }));
    }

    function _deployTokenizedAMM(address deployer, address mockUsdc) internal {
        console.log("\n=== Tokenized AMM System ===");

        EscrowVault escrow = new EscrowVault(mockUsdc, deployer);
        console.log("EscrowVault:", address(escrow));

        MaturityTokenFactory factory = new MaturityTokenFactory(
            mockUsdc, address(escrow), oracleGuard, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);
        factory.setMarketFeedId(EUR_USD_MARKET, EUR_USD_FEED_ID);

        uint256 maturityTime = block.timestamp + POOL_LIFETIME;

        // ── USD/KRW Series + Pool ──
        bytes32 seriesIdKRW = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE_KRW);
        console.log("KRW Series ID:");
        console.logBytes32(seriesIdKRW);

        IMaturityTokenFactory.Series memory sKRW = factory.getSeries(seriesIdKRW);
        console.log("KRW fToken:", sKRW.fToken);
        console.log("KRW sfToken:", sKRW.sfToken);

        FXPool poolKRW = FXPoolDeployer.deploy(sKRW.fToken, sKRW.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool KRW:", address(poolKRW));

        // ── EUR/USD Series + Pool ──
        bytes32 seriesIdEUR = factory.createSeries(EUR_USD_MARKET, maturityTime, FORWARD_RATE_EUR);
        console.log("EUR Series ID:");
        console.logBytes32(seriesIdEUR);

        IMaturityTokenFactory.Series memory sEUR = factory.getSeries(seriesIdEUR);
        console.log("EUR fToken:", sEUR.fToken);
        console.log("EUR sfToken:", sEUR.sfToken);

        FXPool poolEUR = FXPoolDeployer.deploy(sEUR.fToken, sEUR.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(poolEUR));

        Router router = new Router(address(factory), mockUsdc);
        console.log("Router:", address(router));

        // Deploy TokenizedSettlementConsumer
        TokenizedSettlementConsumer tConsumer = new TokenizedSettlementConsumer(
            address(factory), keystoneForwarderAddr, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(tConsumer));
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(tConsumer));
        console.log("CRE_CONSUMER_ROLE granted to TokenizedSettlementConsumer");

        // ── Mock Aave USDC (aUSDC) + CollateralSwap ──
        console.log("\n=== Aave USDC Mock + CollateralSwap ===");

        ERC20Mock aUsdc = new ERC20Mock("Aave USDC", "aUSDC", 6);
        aUsdc.mint(deployer, 1_000_000_000e6); // 1B aUSDC
        console.log("MockAaveUSDC (aUSDC):", address(aUsdc));

        CollateralSwap collateralSwap = new CollateralSwap(deployer);
        collateralSwap.approvePair(mockUsdc, address(aUsdc));
        console.log("CollateralSwap:", address(collateralSwap));

        // Fund CollateralSwap with mUSDC so aUSDC→mUSDC swaps work
        ERC20Mock(mockUsdc).mint(address(collateralSwap), 100_000_000e6); // 100M mUSDC liquidity
        console.log("CollateralSwap funded with 100M mUSDC");
    }
}
