// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {CREOracleAdapter} from "../src/oracle/CREOracleAdapter.sol";
import {OracleGuard} from "../src/oracle/OracleGuard.sol";

/// @title DeployCREOracle
/// @notice Deploy CREOracleAdapter and wire it as OracleGuard primary on both chains
/// @dev Usage:
///   Base Sepolia: forge script script/DeployCREOracle.s.sol --rpc-url base_sepolia --broadcast
///   HyperEVM:     forge script script/DeployCREOracle.s.sol --rpc-url hyperevm --broadcast
contract DeployCREOracle is Script {
    // CRE feed IDs
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 constant EUR_USD_FEED_ID = keccak256("EUR/USD");

    function run() external {
        address deployer = msg.sender;

        // Load OracleGuard address from env (chain-specific)
        address oracleGuardAddr = vm.envAddress("ORACLE_GUARD");

        vm.startBroadcast();

        // 1. Deploy CREOracleAdapter
        //    maxStaleness: 600s (10 min, 2x the 5-min CRE cron)
        //    maxDeviationBps: 1000 (10% — generous for testnet)
        CREOracleAdapter creAdapter = new CREOracleAdapter(deployer, 600, 1000);
        console.log("CREOracleAdapter:", address(creAdapter));

        // 2. Seed initial prices (so manual settlement works immediately)
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);   // USD/KRW ~1400
        creAdapter.setPrice(USD_JPY_FEED_ID, 150e18);     // USD/JPY ~150
        creAdapter.setPrice(EUR_USD_FEED_ID, 1_080000000000000000); // EUR/USD ~1.08
        console.log("Initial prices seeded");

        // 3. Seed lastKnownPrice for deviation checks
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);
        creAdapter.seedLastKnownPrice(USD_JPY_FEED_ID, 150e18);
        creAdapter.seedLastKnownPrice(EUR_USD_FEED_ID, 1_080000000000000000);

        // 4. Wire CREOracleAdapter as OracleGuard primary
        OracleGuard oracleGuard = OracleGuard(oracleGuardAddr);
        address oldPrimary = address(oracleGuard.primaryAdapter());
        oracleGuard.setPrimaryAdapter(address(creAdapter));
        console.log("OracleGuard primary updated:");
        console.log("  Old:", oldPrimary);
        console.log("  New:", address(creAdapter));

        // 5. Set old StubOracle as fallback
        oracleGuard.setSecondaryAdapter(oldPrimary);
        oracleGuard.setFallbackEnabled(true);
        console.log("Fallback enabled with StubOracleAdapter");

        vm.stopBroadcast();

        console.log("\n=== CRE Oracle Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
    }
}
