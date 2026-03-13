// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPoolUSDC} from "../src/tokenized/FXPoolUSDC.sol";

/// @title Deploy FXPoolUSDC pools for all markets
/// @notice Deploys constant-product fToken/USDC pools
contract DeployFXPoolUSDC is Script {
    function run() external {
        address usdc = vm.envAddress("MOCK_USDC");
        address feeRecipient = msg.sender;

        // fToken addresses per market (from env)
        address fTokenKrw = vm.envAddress("FTOKEN_KRW");
        address fTokenEur = vm.envAddress("FTOKEN_EUR");
        address fTokenJpy = vm.envAddress("FTOKEN_JPY");
        address fTokenSamsung = vm.envAddress("FTOKEN_SAMSUNG");

        // GOOGLE is optional (may be zero on HyperEVM)
        address fTokenGoogle = vm.envOr("FTOKEN_GOOGLE", address(0));

        vm.startBroadcast();

        FXPoolUSDC poolKrw = new FXPoolUSDC(fTokenKrw, usdc, feeRecipient);
        console.log("FXPoolUSDC KRW:", address(poolKrw));

        FXPoolUSDC poolEur = new FXPoolUSDC(fTokenEur, usdc, feeRecipient);
        console.log("FXPoolUSDC EUR:", address(poolEur));

        FXPoolUSDC poolJpy = new FXPoolUSDC(fTokenJpy, usdc, feeRecipient);
        console.log("FXPoolUSDC JPY:", address(poolJpy));

        FXPoolUSDC poolSamsung = new FXPoolUSDC(fTokenSamsung, usdc, feeRecipient);
        console.log("FXPoolUSDC SAMSUNG:", address(poolSamsung));

        if (fTokenGoogle != address(0)) {
            FXPoolUSDC poolGoogle = new FXPoolUSDC(fTokenGoogle, usdc, feeRecipient);
            console.log("FXPoolUSDC GOOGLE:", address(poolGoogle));
        } else {
            console.log("FXPoolUSDC GOOGLE: skipped (fToken not deployed)");
        }

        vm.stopBroadcast();

        console.log("\n=== FXPoolUSDC Deployment Complete ===");
    }
}
