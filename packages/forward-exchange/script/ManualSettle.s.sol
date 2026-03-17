// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {CREOracleAdapter} from "../src/oracle/CREOracleAdapter.sol";
import {IForward} from "../src/interfaces/IForward.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {IPrimitive} from "../src/interfaces/IPrimitive.sol";

/// @notice Update CREOracleAdapter prices + settle all matured positions via Forward.settle()
contract ManualSettle is Script {
    function run() external {
        address creAdapter;
        address forwardAddr;

        if (block.chainid == 84532) {
            creAdapter = 0x248FEd995600bf668C881CEA8f0f6fda411858Fc;
            forwardAddr = 0xEA587236dFB98Db60519e6951bC63f4828559d3B;
        } else if (block.chainid == 998) {
            creAdapter = 0x37450CB5e602E0027D26F87d843C615665f57618;
            forwardAddr = 0x47c4338690a48AB6fB5f5A1663F7ba35B71C792A;
        } else {
            revert("Unsupported chain");
        }

        vm.startBroadcast();

        // 1. Update oracle prices (latest from Frankfurter API)
        CREOracleAdapter adapter = CREOracleAdapter(creAdapter);
        adapter.setPrice(0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3, 1475_790000000000000000); // USD/KRW
        adapter.setPrice(0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52, 157_540000000000000000);  // USD/JPY
        adapter.setPrice(keccak256("EUR/USD"), 1_161800000000000000); // EUR/USD ~1.1618
        console.log("Oracle prices updated");

        // 2. Settle matured positions via Forward.settle() (oracle + collateral + settled flag + NFT burn)
        Forward forward = Forward(forwardAddr);
        bytes[] memory emptyUpdate = new bytes[](0);

        uint256 nextPairId = forward.nextPairId();
        uint256 settled;

        for (uint256 id = 2; id < nextPairId; id += 2) {
            IForward.ForwardPosition memory pos = IForward(forwardAddr).getPosition(id);

            // Skip: empty, settled, no counterparty, not matured
            if (pos.notional == 0 || pos.settled || pos.counterparty == address(0)) continue;
            if (block.timestamp < pos.maturityTime) continue;

            try IPrimitive(forwardAddr).settle(id, emptyUpdate) {
                console.log("Settled position", id);
                settled++;
            } catch Error(string memory reason) {
                console.log("Failed position", id, reason);
            } catch {
                console.log("Failed position (low-level)", id);
            }
        }

        vm.stopBroadcast();

        console.log("\nTotal settled:", settled);
    }
}
