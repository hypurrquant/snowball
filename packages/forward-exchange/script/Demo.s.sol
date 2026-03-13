// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {IForward} from "../src/interfaces/IForward.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Demo
/// @notice E2E demo: deposit → createOffer → acceptOffer → (wait maturity) → settle
/// @dev Uses two accounts: PRIVATE_KEY (Alice) and DEMO_BOB_KEY (Bob)
contract Demo is Script {
    // Deployed contract addresses
    address constant VAULT = 0xc82ED91506a8f07F8af2cD14556Ddf5592568c50;
    address constant FORWARD_ADDR = 0x40E8d1Cc9B99Db573979Bc042A47760dc16572aE;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");

    function run() external {
        uint256 aliceKey = vm.envUint("PRIVATE_KEY");
        uint256 bobKey = vm.envUint("DEMO_BOB_KEY");
        address alice = vm.addr(aliceKey);
        address bob = vm.addr(bobKey);

        Vault vault = Vault(VAULT);
        Forward forward = Forward(FORWARD_ADDR);
        IERC20 usdc = IERC20(USDC);

        uint256 notional = 10e6; // 10 USDC
        int256 forwardRate = 1400e18; // USD/KRW = 1400
        uint256 maturityTime = block.timestamp + 10 minutes;

        console.log("=== Forward Exchange E2E Demo ===");
        console.log("Alice:", alice);
        console.log("Bob:", bob);
        console.log("Notional: 10 USDC");
        console.log("Forward Rate: USD/KRW 1400");
        console.log("Maturity: 10 minutes from now");

        // Step 1: Alice deposits USDC and creates offer
        console.log("\n--- Step 1: Alice deposits + creates Long offer ---");
        vm.startBroadcast(aliceKey);
        usdc.approve(VAULT, type(uint256).max);
        vault.deposit(notional);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET,
            notional,
            forwardRate,
            maturityTime,
            true // Alice is Long
        );
        vm.stopBroadcast();
        console.log("Long Token ID:", longId);
        console.log("Short Token ID:", shortId);
        console.log("Alice free balance:", vault.freeBalance(alice));

        // Step 2: Bob deposits USDC and accepts offer
        console.log("\n--- Step 2: Bob deposits + accepts Short offer ---");
        vm.startBroadcast(bobKey);
        usdc.approve(VAULT, type(uint256).max);
        vault.deposit(notional);
        forward.acceptOffer(shortId);
        vm.stopBroadcast();
        console.log("Bob free balance:", vault.freeBalance(bob));

        // Step 3: Verify position
        console.log("\n--- Step 3: Position created ---");
        IForward.ForwardPosition memory pos = forward.getPosition(longId);
        console.log("Market ID (USD/KRW):", uint256(pos.marketId));
        console.log("Notional:", pos.notional);
        console.log("Forward Rate:", uint256(uint256(pos.forwardRate)));
        console.log("Maturity Time:", pos.maturityTime);
        console.log("Counterparty set:", pos.counterparty != address(0));
        console.log("Long owner:", forward.ownerOf(longId));
        console.log("Short owner:", forward.ownerOf(shortId));

        console.log("\n=== Demo Complete ===");
        console.log("Position is active. Wait 5 minutes for maturity.");
        console.log("Then CRE workflow will auto-settle, or call settle() manually.");
    }
}
