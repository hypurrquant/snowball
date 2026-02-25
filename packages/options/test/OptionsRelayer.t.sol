// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OptionsClearingHouse} from "../src/OptionsClearingHouse.sol";
import {OptionsVault} from "../src/OptionsVault.sol";
import {SnowballOptions} from "../src/SnowballOptions.sol";
import {OptionsRelayer} from "../src/OptionsRelayer.sol";
import {ISnowballOptions} from "../src/interfaces/ISnowballOptions.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";

contract MockOracleR is IPriceOracle {
    uint256 public mockPrice;
    bool public mockFresh;

    constructor(uint256 _price, bool _fresh) {
        mockPrice = _price;
        mockFresh = _fresh;
    }

    function setPrice(uint256 _price, bool _fresh) external {
        mockPrice = _price;
        mockFresh = _fresh;
    }

    function fetchPrice() external view returns (uint256, bool) {
        return (mockPrice, mockFresh);
    }
}

contract OptionsRelayerTest is Test {
    OptionsClearingHouse ch;
    OptionsVault vault;
    SnowballOptions options;
    OptionsRelayer relayer;
    MockOracleR oracle;

    address admin = address(1);
    address operatorAddr = address(2);

    uint256 user1Key = 0xA11CE;
    uint256 user2Key = 0xB0B;
    address user1;
    address user2;

    uint256 constant BTC_PRICE = 95_000 * 1e18;
    uint256 constant COMMISSION = 500;
    uint256 constant ROUND_DURATION = 300;

    function setUp() public {
        user1 = vm.addr(user1Key);
        user2 = vm.addr(user2Key);

        // Deploy ClearingHouse
        OptionsClearingHouse chImpl = new OptionsClearingHouse();
        ERC1967Proxy chProxy = new ERC1967Proxy(
            address(chImpl),
            abi.encodeCall(OptionsClearingHouse.initialize, (admin))
        );
        ch = OptionsClearingHouse(payable(address(chProxy)));

        // Deploy Vault
        OptionsVault vImpl = new OptionsVault();
        ERC1967Proxy vProxy = new ERC1967Proxy(
            address(vImpl),
            abi.encodeCall(OptionsVault.initialize, (admin))
        );
        vault = OptionsVault(payable(address(vProxy)));

        // Deploy Oracle
        oracle = new MockOracleR(BTC_PRICE, true);

        // Deploy SnowballOptions
        SnowballOptions oImpl = new SnowballOptions();
        ERC1967Proxy oProxy = new ERC1967Proxy(
            address(oImpl),
            abi.encodeCall(SnowballOptions.initialize, (admin, address(ch), address(vault), address(oracle), COMMISSION))
        );
        options = SnowballOptions(payable(address(oProxy)));

        // Deploy Relayer
        OptionsRelayer rImpl = new OptionsRelayer();
        ERC1967Proxy rProxy = new ERC1967Proxy(
            address(rImpl),
            abi.encodeCall(OptionsRelayer.initialize, (admin, address(options), address(ch)))
        );
        relayer = OptionsRelayer(payable(address(rProxy)));

        // Grant roles
        vm.startPrank(admin);
        ch.grantRole(ch.PRODUCT_ROLE(), address(options));
        vault.grantRole(vault.ENGINE_ROLE(), address(options));
        options.grantRole(options.RELAYER_ROLE(), address(relayer));
        options.grantRole(options.OPERATOR_ROLE(), operatorAddr);
        relayer.grantRole(relayer.OPERATOR_ROLE(), operatorAddr);
        vm.stopPrank();

        // Fund users
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);

        vm.prank(user1);
        ch.deposit{value: 50 ether}();
        vm.prank(user2);
        ch.deposit{value: 50 ether}();

        // Start a round
        vm.prank(operatorAddr);
        options.startRound(ROUND_DURATION);
    }

    function _signOrder(
        uint256 privateKey,
        address user,
        uint8 direction,
        uint256 amount,
        uint256 roundId,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = relayer.getDigest(user, direction, amount, roundId, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_submitSignedOrders() public {
        uint256 amount = 5 ether;
        uint256 deadline = block.timestamp + 600;

        bytes memory sig1 = _signOrder(user1Key, user1, 0, amount, 1, 0, deadline);
        bytes memory sig2 = _signOrder(user2Key, user2, 1, amount, 1, 0, deadline);

        OptionsRelayer.SignedOrder[] memory overs = new OptionsRelayer.SignedOrder[](1);
        OptionsRelayer.SignedOrder[] memory unders = new OptionsRelayer.SignedOrder[](1);

        overs[0] = OptionsRelayer.SignedOrder({
            user: user1,
            direction: 0,
            amount: amount,
            roundId: 1,
            nonce: 0,
            deadline: deadline,
            signature: sig1
        });
        unders[0] = OptionsRelayer.SignedOrder({
            user: user2,
            direction: 1,
            amount: amount,
            roundId: 1,
            nonce: 0,
            deadline: deadline,
            signature: sig2
        });

        vm.prank(operatorAddr);
        relayer.submitSignedOrders(overs, unders);

        // Verify order was submitted
        ISnowballOptions.FilledOrder memory order = options.getOrder(1, 0);
        assertEq(order.overUser, user1);
        assertEq(order.underUser, user2);
        assertEq(order.amount, amount);

        // Check nonces incremented
        assertEq(relayer.nonces(user1), 1);
        assertEq(relayer.nonces(user2), 1);
    }

    function test_replayProtection() public {
        uint256 amount = 5 ether;
        uint256 deadline = block.timestamp + 600;

        bytes memory sig1 = _signOrder(user1Key, user1, 0, amount, 1, 0, deadline);
        bytes memory sig2 = _signOrder(user2Key, user2, 1, amount, 1, 0, deadline);

        OptionsRelayer.SignedOrder[] memory overs = new OptionsRelayer.SignedOrder[](1);
        OptionsRelayer.SignedOrder[] memory unders = new OptionsRelayer.SignedOrder[](1);

        overs[0] = OptionsRelayer.SignedOrder({
            user: user1, direction: 0, amount: amount, roundId: 1, nonce: 0, deadline: deadline, signature: sig1
        });
        unders[0] = OptionsRelayer.SignedOrder({
            user: user2, direction: 1, amount: amount, roundId: 1, nonce: 0, deadline: deadline, signature: sig2
        });

        // First submission succeeds
        vm.prank(operatorAddr);
        relayer.submitSignedOrders(overs, unders);

        // Second submission with same nonces — signatures invalid (nonce already consumed)
        // Should skip the invalid pairs, resulting in no orders
        vm.prank(operatorAddr);
        relayer.submitSignedOrders(overs, unders);

        // Only 1 order should exist
        ISnowballOptions.Round memory round = options.getRound(1);
        assertEq(round.orderCount, 1);
    }

    function test_expiredOrderSkipped() public {
        uint256 amount = 5 ether;
        uint256 deadline = block.timestamp - 1; // already expired

        bytes memory sig1 = _signOrder(user1Key, user1, 0, amount, 1, 0, deadline);
        bytes memory sig2 = _signOrder(user2Key, user2, 1, amount, 1, 0, deadline);

        OptionsRelayer.SignedOrder[] memory overs = new OptionsRelayer.SignedOrder[](1);
        OptionsRelayer.SignedOrder[] memory unders = new OptionsRelayer.SignedOrder[](1);

        overs[0] = OptionsRelayer.SignedOrder({
            user: user1, direction: 0, amount: amount, roundId: 1, nonce: 0, deadline: deadline, signature: sig1
        });
        unders[0] = OptionsRelayer.SignedOrder({
            user: user2, direction: 1, amount: amount, roundId: 1, nonce: 0, deadline: deadline, signature: sig2
        });

        // Should not revert, just skip
        vm.prank(operatorAddr);
        relayer.submitSignedOrders(overs, unders);

        // No orders submitted
        ISnowballOptions.Round memory round = options.getRound(1);
        assertEq(round.orderCount, 0);
    }

    function test_unauthorized() public {
        OptionsRelayer.SignedOrder[] memory overs = new OptionsRelayer.SignedOrder[](0);
        OptionsRelayer.SignedOrder[] memory unders = new OptionsRelayer.SignedOrder[](0);

        vm.prank(user1);
        vm.expectRevert("Relayer: unauthorized");
        relayer.submitSignedOrders(overs, unders);
    }
}
