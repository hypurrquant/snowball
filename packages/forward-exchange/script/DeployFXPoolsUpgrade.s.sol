// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";

/// @title Redeploy all FXPools as UUPS proxies on Base Sepolia
contract DeployFXPoolsUpgrade is Script {
    // Pool parameters
    uint256 constant T_MAX = 10e16;  // 0.10 (lowered from 0.25 for less slippage)
    uint256 constant T_MIN = 2e16;   // 0.02 (lowered from 0.05)
    uint256 constant FEE_MAX = 3e15; // 0.3%
    uint256 constant POOL_LIFETIME = 90 days;

    // Base Sepolia token addresses
    // KRW
    address constant FTOKEN_KRW  = 0xCf88f84FC2e119C42C9c48fc945b35c523E509D7;
    address constant SFTOKEN_KRW = 0x565E0E4c30e13399E59f012B36156e0639C6D3DD;
    uint256 constant MATURITY_KRW = 1780572428;

    // EUR
    address constant FTOKEN_EUR  = 0xa9f3052093AFbC0540e9C760B268A068BfbBAA7f;
    address constant SFTOKEN_EUR = 0xD31028Bf9ed03d6481fE673668B10F8498EefbFb;
    uint256 constant MATURITY_EUR = 1780572428;

    // JPY
    address constant FTOKEN_JPY  = 0x0E106287a5511AE866Faa7dDd92b51A3A36A0272;
    address constant SFTOKEN_JPY = 0xeE3aBF409695Da032c56a70Cc63F14162fa7ed60;
    uint256 constant MATURITY_JPY = 1780572428;

    // SAMSUNG
    address constant FTOKEN_SAM  = 0x8e0431C11864896f559927b0d8FCF5d318964909;
    address constant SFTOKEN_SAM = 0xD472d33aeF0B91335F935DbbAf3bD1D611561bC7;
    uint256 constant MATURITY_SAM = 1780572428;

    function run() external {
        vm.startBroadcast();

        FXPool poolKrw = FXPoolDeployer.deploy(
            FTOKEN_KRW, SFTOKEN_KRW, MATURITY_KRW, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX
        );
        console.log("FXPool KRW:", address(poolKrw));

        FXPool poolEur = FXPoolDeployer.deploy(
            FTOKEN_EUR, SFTOKEN_EUR, MATURITY_EUR, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX
        );
        console.log("FXPool EUR:", address(poolEur));

        FXPool poolJpy = FXPoolDeployer.deploy(
            FTOKEN_JPY, SFTOKEN_JPY, MATURITY_JPY, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX
        );
        console.log("FXPool JPY:", address(poolJpy));

        FXPool poolSam = FXPoolDeployer.deploy(
            FTOKEN_SAM, SFTOKEN_SAM, MATURITY_SAM, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX
        );
        console.log("FXPool SAMSUNG:", address(poolSam));

        vm.stopBroadcast();

        console.log("\n=== All FXPools redeployed as UUPS proxies ===");
        console.log("t_max: 0.10, t_min: 0.02, feeMax: 0.3%");
    }
}
