// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {TokenizedSettlementConsumer} from "../src/cre/TokenizedSettlementConsumer.sol";
import {CollateralSwap} from "../src/tokenized/CollateralSwap.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title HyperEVM Step 4: Deploy tokenized AMM (after Step 3 partial failure)
/// @notice Deploys: createSeries x2, FXPool x2, Router, TokenizedSettlementConsumer, aUSDC, CollateralSwap
contract DeployHyperEVM_Proxy_Step4_AMM is Script {
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 constant EUR_USD_MARKET = keccak256("EUR/USD");

    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE_KRW = 1400e18;
    int256 constant FORWARD_RATE_EUR = 1_08e16;

    function run() external {
        address deployer = msg.sender;
        address mockUsdc = vm.envAddress("HYPEREVM_MOCK_USDC");
        address keystoneForwarder = vm.envAddress("HYPEREVM_KEYSTONE_FORWARDER");
        MaturityTokenFactory factory = MaturityTokenFactory(vm.envAddress("HYPEREVM_FACTORY_NEW"));

        vm.startBroadcast();

        uint256 maturityTime = block.timestamp + POOL_LIFETIME;

        // Create KRW series + pool
        bytes32 seriesIdKRW = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE_KRW);
        IMaturityTokenFactory.Series memory sKRW = factory.getSeries(seriesIdKRW);
        console.log("KRW fToken:", sKRW.fToken);
        console.log("KRW sfToken:", sKRW.sfToken);

        FXPool poolKRW = FXPoolDeployer.deploy(sKRW.fToken, sKRW.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool KRW:", address(poolKRW));

        // Create EUR series + pool
        bytes32 seriesIdEUR = factory.createSeries(EUR_USD_MARKET, maturityTime, FORWARD_RATE_EUR);
        IMaturityTokenFactory.Series memory sEUR = factory.getSeries(seriesIdEUR);
        console.log("EUR fToken:", sEUR.fToken);
        console.log("EUR sfToken:", sEUR.sfToken);

        FXPool poolEUR = FXPoolDeployer.deploy(sEUR.fToken, sEUR.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(poolEUR));

        // Router
        Router router = new Router(address(factory), mockUsdc);
        console.log("Router:", address(router));

        // TokenizedSettlementConsumer
        TokenizedSettlementConsumer tConsumer = new TokenizedSettlementConsumer(
            address(factory), keystoneForwarder, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(tConsumer));
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(tConsumer));

        // aUSDC + CollateralSwap
        ERC20Mock aUsdc = new ERC20Mock("Aave USDC", "aUSDC", 6);
        aUsdc.mint(deployer, 1_000_000_000e6);
        console.log("aUSDC:", address(aUsdc));

        CollateralSwap swap = new CollateralSwap(deployer);
        swap.approvePair(mockUsdc, address(aUsdc));
        ERC20Mock(mockUsdc).mint(address(swap), 100_000_000e6);
        console.log("CollateralSwap:", address(swap));

        vm.stopBroadcast();

        console.log("\n=== Step 4 (Tokenized AMM) Complete ===");
        console.logBytes32(seriesIdKRW);
        console.logBytes32(seriesIdEUR);
    }
}
