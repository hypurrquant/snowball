// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPoolUSDC} from "../src/tokenized/FXPoolUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title Seed a single FXPoolUSDC (HyperEVM gas-safe)
contract SeedOnePoolUSDC is Script {
    function run() external {
        IMaturityTokenFactory factory = IMaturityTokenFactory(vm.envAddress("FACTORY"));
        address usdc = vm.envAddress("MOCK_USDC");
        bytes32 seriesId = vm.envBytes32("SERIES_ID");
        address pool = vm.envAddress("POOL");
        uint256 mintAmt = vm.envOr("MINT_AMOUNT", uint256(5_000e18));
        uint256 usdcLiq = vm.envOr("USDC_LIQ", uint256(5_000e6));

        vm.startBroadcast();

        // Mint USDC + approve
        ERC20Mock(usdc).mint(msg.sender, 20_000e6);
        IERC20(usdc).approve(address(factory), 20_000e6);

        // Mint token pair
        factory.mint(seriesId, mintAmt);

        // Get fToken
        address fToken = factory.getSeries(seriesId).fToken;

        // Approve pool
        IERC20(fToken).approve(pool, mintAmt);
        IERC20(usdc).approve(pool, usdcLiq);

        // Add liquidity
        FXPoolUSDC(pool).addLiquidity(mintAmt, usdcLiq, 0);

        vm.stopBroadcast();
        console.log("Pool seeded:", pool);
    }
}
