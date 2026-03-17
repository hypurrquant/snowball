// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPoolUSDC} from "../src/tokenized/FXPoolUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title Seed FXPoolUSDC with initial liquidity
contract SeedFXPoolUSDCLiquidity is Script {
    uint256 constant MINT_AMOUNT = 5_000e18;
    uint256 constant USDC_LIQ = 5_000e6;

    function run() external {
        IMaturityTokenFactory factory = IMaturityTokenFactory(vm.envAddress("FACTORY"));
        address usdc = vm.envAddress("MOCK_USDC");

        vm.startBroadcast();

        // Mint USDC if needed
        ERC20Mock(usdc).mint(msg.sender, 100_000e6);
        IERC20(usdc).approve(address(factory), 100_000e6);

        _seed(factory, vm.envBytes32("SID_KRW"), vm.envAddress("POOL_KRW"), usdc);
        console.log("KRW seeded");

        _seed(factory, vm.envBytes32("SID_EUR"), vm.envAddress("POOL_EUR"), usdc);
        console.log("EUR seeded");

        _seed(factory, vm.envBytes32("SID_JPY"), vm.envAddress("POOL_JPY"), usdc);
        console.log("JPY seeded");

        _seed(factory, vm.envBytes32("SID_SAMSUNG"), vm.envAddress("POOL_SAMSUNG"), usdc);
        console.log("SAMSUNG seeded");

        _seed(factory, vm.envBytes32("SID_GOOGLE"), vm.envAddress("POOL_GOOGLE"), usdc);
        console.log("GOOGLE seeded");

        vm.stopBroadcast();
    }

    function _seed(
        IMaturityTokenFactory factory,
        bytes32 seriesId,
        address pool,
        address usdc
    ) internal {
        factory.mint(seriesId, MINT_AMOUNT);
        address fToken = factory.getSeries(seriesId).fToken;
        IERC20(fToken).approve(pool, MINT_AMOUNT);
        IERC20(usdc).approve(pool, USDC_LIQ);
        FXPoolUSDC(pool).addLiquidity(MINT_AMOUNT, USDC_LIQ, 0);
    }
}
