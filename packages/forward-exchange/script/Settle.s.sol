// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {IForward} from "../src/interfaces/IForward.sol";
import {SettlementEngine} from "../src/infrastructure/SettlementEngine.sol";
import {StubOracleAdapter} from "../src/oracle/StubOracleAdapter.sol";

/// @title Settle
/// @notice Manually settle a matured position using StubOracle price
contract Settle is Script {
    address constant VAULT = 0xc82ED91506a8f07F8af2cD14556Ddf5592568c50;
    address constant FORWARD_ADDR = 0x40E8d1Cc9B99Db573979Bc042A47760dc16572aE;
    address constant SETTLEMENT_ENGINE = 0x159F9F2386a57bFe6B3Ab7a9CcFF6E4fd18525a0;
    address constant STUB_ORACLE = 0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380;

    // USD/KRW feed ID
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        Vault vault = Vault(VAULT);
        Forward forward = Forward(FORWARD_ADDR);
        StubOracleAdapter oracle = StubOracleAdapter(STUB_ORACLE);

        uint256 longTokenId = 2;
        address alice = 0xf00F6cB5D43f9A38B10FA0B8e1B26cDB34D20d9d;
        address bob = 0xfA28a37614d095E9f448B1eC5bc937f4475566e7;

        console.log("=== Manual Settlement ===");

        // Check maturity
        IForward.ForwardPosition memory pos = forward.getPosition(longTokenId);
        console.log("Maturity time:", pos.maturityTime);
        console.log("Current time:", block.timestamp);
        console.log("Matured:", block.timestamp >= pos.maturityTime);

        if (block.timestamp < pos.maturityTime) {
            console.log("NOT YET MATURED. Wait more.");
            return;
        }

        vm.startBroadcast(deployerKey);

        // Update oracle price to simulate market movement: USD/KRW 1450 (KRW weakened)
        int256 settlementPrice = 1450e18;
        oracle.setPrice(USD_KRW_FEED_ID, settlementPrice);
        console.log("Oracle price set to 1450 (USD/KRW)");

        // Settle via Forward.settle() → SettlementEngine
        bytes[] memory emptyUpdate = new bytes[](0);
        forward.settle(longTokenId, emptyUpdate);

        vm.stopBroadcast();

        console.log("\n--- Settlement Result ---");
        console.log("Position settled:", forward.isSettled(longTokenId));
        console.log("Alice free balance:", vault.freeBalance(alice));
        console.log("Bob free balance:", vault.freeBalance(bob));

        // PnL: 10e6 * (1450 - 1400) / 1450 = 344827 (~0.344 USDC)
        // Alice (Long) wins: gets 10 + 0.344 = 10.344 USDC
        // Bob (Short) loses: gets 10 - 0.344 = 9.655 USDC
        console.log("Expected: Alice ~10.344 USDC, Bob ~9.655 USDC");
    }
}
