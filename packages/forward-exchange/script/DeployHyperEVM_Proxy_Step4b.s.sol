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

/// @title HyperEVM Step 4b (Small Block): FXPool x2 + Router + aUSDC + CollateralSwap
contract DeployHyperEVM_Proxy_Step4b is Script {
    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;

    MaturityTokenFactory public factory;
    address public deployer;
    address public mockUsdc;

    function run() external {
        deployer = msg.sender;
        mockUsdc = vm.envAddress("HYPEREVM_MOCK_USDC");
        factory = MaturityTokenFactory(vm.envAddress("HYPEREVM_FACTORY_NEW"));

        bytes32 seriesIdKRW = vm.envBytes32("HYPEREVM_SERIES_KRW");
        bytes32 seriesIdEUR = vm.envBytes32("HYPEREVM_SERIES_EUR");

        vm.startBroadcast();

        _deployPools(seriesIdKRW, seriesIdEUR);
        _deployRouter();
        _deployConsumer();
        _deployAUSDC();

        vm.stopBroadcast();
        console.log("\n=== Step 4b Complete ===");
    }

    function _deployPools(bytes32 seriesIdKRW, bytes32 seriesIdEUR) internal {
        IMaturityTokenFactory.Series memory sKRW = factory.getSeries(seriesIdKRW);
        uint256 maturityTime = sKRW.maturityTime;

        FXPool poolKRW = FXPoolDeployer.deploy(sKRW.fToken, sKRW.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool KRW:", address(poolKRW));

        IMaturityTokenFactory.Series memory sEUR = factory.getSeries(seriesIdEUR);
        FXPool poolEUR = FXPoolDeployer.deploy(sEUR.fToken, sEUR.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(poolEUR));
    }

    function _deployRouter() internal {
        Router router = new Router(address(factory), mockUsdc);
        console.log("Router:", address(router));
    }

    function _deployConsumer() internal {
        address keystoneForwarder = vm.envAddress("HYPEREVM_KEYSTONE_FORWARDER");
        TokenizedSettlementConsumer tConsumer = new TokenizedSettlementConsumer(
            address(factory), keystoneForwarder, deployer
        );
        console.log("TokenizedSettlementConsumer:", address(tConsumer));
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(tConsumer));
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
