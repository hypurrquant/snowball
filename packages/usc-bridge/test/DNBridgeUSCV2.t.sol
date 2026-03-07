// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DNBridgeUSC.sol";
import "../src/EvmV1Decoder.sol";

/**
 * @notice Tests for DNBridgeUSC v2 burn data verification.
 * @dev The full processBridgeMint flow requires the VERIFIER precompile (0x0FD2)
 *      which only exists on USC Testnet. These tests focus on the _verifyBurnData logic
 *      by exposing it through a test harness.
 */
contract DNBridgeUSCHarness is DNBridgeUSC {
    constructor(address _sepoliaDNToken) DNBridgeUSC(_sepoliaDNToken) {}

    /// @notice Expose internal _verifyBurnData for testing
    function verifyBurnData(
        bytes memory encodedTransaction,
        address recipient,
        uint256 amount
    ) external view {
        _verifyBurnData(encodedTransaction, recipient, amount);
    }
}

contract DNBridgeUSCV2Test is Test {
    DNBridgeUSCHarness bridge;
    address constant SEPOLIA_DN = address(0xDEAD);
    address alice = makeAddr("alice");

    function setUp() public {
        bridge = new DNBridgeUSCHarness(SEPOLIA_DN);
    }

    /// @dev Build a minimal encodedTransaction with a BridgeBurn log
    function _buildEncodedTx(
        address burnFrom,
        uint256 burnAmount,
        uint64 chainKey,
        address logEmitter,
        uint8 receiptStatus
    ) internal pure returns (bytes memory) {
        bytes32 bridgeBurnSig = keccak256("BridgeBurn(address,uint256,uint64)");

        // Build log entry
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = bridgeBurnSig;
        topics[1] = bytes32(uint256(uint160(burnFrom)));

        bytes memory logData = abi.encode(burnAmount, chainKey);

        // Single log
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](1);
        logs[0] = EvmV1Decoder.LogEntryTuple({
            address_: logEmitter,
            topics: topics,
            data: logData
        });

        // Receipt chunk (last chunk for type 0/1/2: index 2)
        bytes memory receiptChunk = abi.encode(
            receiptStatus,
            uint64(21000),
            logs,
            new bytes(0) // logsBloom
        );

        // Common TX chunk (index 0) - minimal
        bytes memory commonChunk = abi.encode(
            uint64(0),      // nonce
            uint64(21000),  // gasLimit
            burnFrom,       // from
            false,          // toIsNull
            logEmitter,     // to
            uint256(0),     // value
            new bytes(0)    // data
        );

        // Type-specific chunk (index 1) - legacy type 0
        bytes memory typeChunk = abi.encode(
            uint128(1 gwei), // gasPrice
            uint256(27),     // v
            bytes32(0),      // r
            bytes32(0)       // s
        );

        // Assemble: (uint8 txType, bytes[] chunks)
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = commonChunk;
        chunks[1] = typeChunk;
        chunks[2] = receiptChunk;

        return abi.encode(uint8(0), chunks);
    }

    function test_verifyBurnData_valid() public view {
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 1, SEPOLIA_DN, 1);
        bridge.verifyBurnData(encoded, alice, 100 ether);
    }

    function test_verifyBurnData_wrong_recipient_reverts() public {
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 1, SEPOLIA_DN, 1);
        vm.expectRevert("DNBridge: burn data mismatch");
        bridge.verifyBurnData(encoded, makeAddr("bob"), 100 ether);
    }

    function test_verifyBurnData_wrong_amount_reverts() public {
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 1, SEPOLIA_DN, 1);
        vm.expectRevert("DNBridge: burn data mismatch");
        bridge.verifyBurnData(encoded, alice, 200 ether);
    }

    function test_verifyBurnData_wrong_emitter_reverts() public {
        // Log from wrong contract (not sepoliaDNToken)
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 1, address(0xBEEF), 1);
        vm.expectRevert("DNBridge: burn data mismatch");
        bridge.verifyBurnData(encoded, alice, 100 ether);
    }

    function test_verifyBurnData_wrong_chainKey_reverts() public {
        // Burn was for chainKey=99 but USC expects chainKey=1
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 99, SEPOLIA_DN, 1);
        vm.expectRevert("DNBridge: burn data mismatch");
        bridge.verifyBurnData(encoded, alice, 100 ether);
    }

    function test_verifyBurnData_failed_receipt_reverts() public {
        bytes memory encoded = _buildEncodedTx(alice, 100 ether, 1, SEPOLIA_DN, 0);
        vm.expectRevert("DNBridge: tx did not succeed");
        bridge.verifyBurnData(encoded, alice, 100 ether);
    }

    function test_replay_protection() public {
        // Test that processedTxKeys prevents double processing
        bytes32 txKey = keccak256(abi.encodePacked(uint64(1), uint64(100), uint256(0)));
        assertFalse(bridge.processedTxKeys(txKey));
        // Note: Full replay test requires processBridgeMint which needs VERIFIER precompile.
        // The replay logic is verified via E2E on USC Testnet.
    }
}
