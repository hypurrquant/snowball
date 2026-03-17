// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RiskManager} from "../src/infrastructure/RiskManager.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @notice Upgrade RiskManager and FXPool implementations via UUPS proxy
contract UpgradeContracts is Script {
    function run() external {
        // --- RiskManager upgrade ---
        address riskManagerProxy = vm.envAddress("RISK_MANAGER");

        vm.startBroadcast();

        // Deploy new RiskManager implementation
        RiskManager newRiskManagerImpl = new RiskManager();
        console.log("New RiskManager impl:", address(newRiskManagerImpl));

        // Upgrade proxy to new implementation
        UUPSUpgradeable(riskManagerProxy).upgradeToAndCall(
            address(newRiskManagerImpl),
            "" // no re-initialization needed
        );
        console.log("RiskManager proxy upgraded");

        vm.stopBroadcast();
    }
}

/// @notice Upgrade FXPool implementations via UUPS proxy
contract UpgradeFXPools is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy new FXPool implementation (one impl shared by all proxies)
        FXPool newFXPoolImpl = new FXPool();
        console.log("New FXPool impl:", address(newFXPoolImpl));

        // Upgrade each FXPool proxy
        // Read pool addresses from env
        address[] memory pools = new address[](5);
        pools[0] = vm.envAddress("FXPOOL_KRW");
        pools[1] = vm.envAddress("FXPOOL_EUR");
        pools[2] = vm.envAddress("FXPOOL_JPY");
        pools[3] = vm.envAddress("FXPOOL_SAMSUNG");
        pools[4] = vm.envAddress("FXPOOL_GOOGLE");

        string[5] memory names = ["KRW", "EUR", "JPY", "SAMSUNG", "GOOGLE"];

        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i] == address(0)) {
                console.log("Skipping pool (zero address):", names[i]);
                continue;
            }
            UUPSUpgradeable(pools[i]).upgradeToAndCall(
                address(newFXPoolImpl),
                "" // no re-initialization needed
            );
            console.log("FXPool upgraded:", names[i]);
        }

        vm.stopBroadcast();
    }
}
