// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {TokenizedSettlementConsumer} from "../src/cre/TokenizedSettlementConsumer.sol";
import {CollateralSwap} from "../src/tokenized/CollateralSwap.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title Step 3 (Small Block): Wire Factory, create series, deploy pools, router, aUSDC
contract DeployHyperEVM_Step3 is Script {
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant EUR_USD_FEED_ID = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant EUR_USD_MARKET = keccak256("EUR/USD");

    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE_KRW = 1400e18;
    int256 constant FORWARD_RATE_EUR = 1_08e16;

    // State for cross-function access
    MaturityTokenFactory public factory;
    uint256 public maturityTime;

    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("MOCK_USDC");
        address keystoneForwarder = vm.envAddress("KEYSTONE_FORWARDER");
        factory = MaturityTokenFactory(vm.envAddress("FACTORY"));
        EscrowVault escrow = EscrowVault(vm.envAddress("ESCROW_VAULT"));

        vm.startBroadcast();

        // Wire Factory <> EscrowVault
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);
        factory.setMarketFeedId(EUR_USD_MARKET, EUR_USD_FEED_ID);

        maturityTime = block.timestamp + POOL_LIFETIME;

        _deployKRW(deployer);
        _deployEUR(deployer);
        _deployRouterAndConsumer(deployer, mockUsdc, keystoneForwarder);
        _deployAUSDC(deployer, mockUsdc);

        vm.stopBroadcast();
    }

    function _deployKRW(address deployer) internal {
        bytes32 seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE_KRW);
        console.log("KRW Series ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("KRW fToken:", s.fToken);
        console.log("KRW sfToken:", s.sfToken);

        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool KRW:", address(pool));
    }

    function _deployEUR(address deployer) internal {
        bytes32 seriesId = factory.createSeries(EUR_USD_MARKET, maturityTime, FORWARD_RATE_EUR);
        console.log("EUR Series ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("EUR fToken:", s.fToken);
        console.log("EUR sfToken:", s.sfToken);

        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(pool));
    }

    function _deployRouterAndConsumer(address deployer, address mockUsdc, address keystoneForwarder) internal {
        Router router = new Router(address(factory), mockUsdc);
        console.log("Router:", address(router));

        TokenizedSettlementConsumer tConsumer = new TokenizedSettlementConsumer(
            address(factory), keystoneForwarder, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(tConsumer));
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(tConsumer));
    }

    function _deployAUSDC(address deployer, address mockUsdc) internal {
        ERC20Mock aUsdc = new ERC20Mock("Aave USDC", "aUSDC", 6);
        aUsdc.mint(deployer, 1_000_000_000e6);
        console.log("MockAaveUSDC (aUSDC):", address(aUsdc));

        CollateralSwap swap = new CollateralSwap(deployer);
        swap.approvePair(mockUsdc, address(aUsdc));
        console.log("CollateralSwap:", address(swap));

        ERC20Mock(mockUsdc).mint(address(swap), 100_000_000e6);
        console.log("CollateralSwap funded with 100M mUSDC");
    }
}
