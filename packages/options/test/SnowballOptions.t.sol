// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OptionsClearingHouse} from "../src/OptionsClearingHouse.sol";
import {OptionsVault} from "../src/OptionsVault.sol";
import {SnowballOptions} from "../src/SnowballOptions.sol";
import {ISnowballOptions} from "../src/interfaces/ISnowballOptions.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";

contract MockOracle is IPriceOracle {
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

contract SnowballOptionsTest is Test {
    OptionsClearingHouse ch;
    OptionsVault vault;
    SnowballOptions options;
    MockOracle oracle;

    address admin = address(1);
    address relayer = address(2);
    address operator = address(3);
    address user1;
    address user2;

    uint256 constant BTC_PRICE = 95_000 * 1e18;
    uint256 constant COMMISSION = 500; // 5%
    uint256 constant ROUND_DURATION = 300; // 5 minutes

    function setUp() public {
        user1 = address(10);
        user2 = address(11);

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
        oracle = new MockOracle(BTC_PRICE, true);

        // Deploy SnowballOptions
        SnowballOptions oImpl = new SnowballOptions();
        ERC1967Proxy oProxy = new ERC1967Proxy(
            address(oImpl),
            abi.encodeCall(SnowballOptions.initialize, (admin, address(ch), address(vault), address(oracle), COMMISSION))
        );
        options = SnowballOptions(payable(address(oProxy)));

        // Grant roles
        vm.startPrank(admin);
        ch.grantRole(ch.PRODUCT_ROLE(), address(options));
        vault.grantRole(vault.ENGINE_ROLE(), address(options));
        options.grantRole(options.RELAYER_ROLE(), relayer);
        options.grantRole(options.OPERATOR_ROLE(), operator);
        vm.stopPrank();

        // Fund users
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);

        // Users deposit to ClearingHouse
        vm.prank(user1);
        ch.deposit{value: 50 ether}();
        vm.prank(user2);
        ch.deposit{value: 50 ether}();
    }

    // ─── Round Management ───

    function test_startRound() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        assertEq(options.currentRoundId(), 1);
        ISnowballOptions.Round memory round = options.getRound(1);
        assertEq(round.lockPrice, BTC_PRICE);
        assertEq(uint8(round.status), uint8(ISnowballOptions.RoundStatus.Open));
    }

    function test_startRound_staleOracle() public {
        oracle.setPrice(BTC_PRICE, false);

        vm.prank(operator);
        vm.expectRevert("Options: stale oracle price");
        options.startRound(ROUND_DURATION);
    }

    // ─── Order Submission ───

    function test_submitFilledOrders() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        address[] memory overs = new address[](1);
        address[] memory unders = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        overs[0] = user1;
        unders[0] = user2;
        amounts[0] = 5 ether;

        vm.prank(relayer);
        options.submitFilledOrders(1, overs, unders, amounts);

        ISnowballOptions.FilledOrder memory order = options.getOrder(1, 0);
        assertEq(order.overUser, user1);
        assertEq(order.underUser, user2);
        assertEq(order.amount, 5 ether);

        // Check escrow
        assertEq(ch.escrowOf(user1), 5 ether);
        assertEq(ch.escrowOf(user2), 5 ether);
        assertEq(ch.balanceOf(user1), 45 ether);
        assertEq(ch.balanceOf(user2), 45 ether);
    }

    function test_submitFilledOrders_unauthorized() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        address[] memory o = new address[](0);
        address[] memory u = new address[](0);
        uint256[] memory a = new uint256[](0);

        vm.prank(user1);
        vm.expectRevert("Options: unauthorized");
        options.submitFilledOrders(1, o, u, a);
    }

    // ─── Full Settlement (Over wins) ───

    function test_fullSettlement_overWins() public {
        // 1. Start round
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        // 2. Submit orders
        address[] memory overs = new address[](1);
        address[] memory unders = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        overs[0] = user1;
        unders[0] = user2;
        amounts[0] = 10 ether;

        vm.prank(relayer);
        options.submitFilledOrders(1, overs, unders, amounts);

        // 3. Warp + execute with higher price (Over wins)
        vm.warp(block.timestamp + ROUND_DURATION);
        oracle.setPrice(BTC_PRICE + 1000 * 1e18, true);

        vm.prank(operator);
        options.executeRound(1);

        // 4. Settle
        vm.prank(operator);
        options.settleOrders(1, 10);

        // 5. Check results
        // user1 (Over) wins: gets their 10 ether back + 9.5 ether (10 - 5% fee)
        // user2 (Under) loses escrow
        // Fee = 10 * 500 / 10000 = 0.5 ether
        assertEq(ch.balanceOf(user1), 40 ether + 10 ether + 10 ether - 0.5 ether); // 59.5 ether
        assertEq(ch.balanceOf(user2), 40 ether);
        assertEq(ch.accumulatedFees(), 0.5 ether);

        // Round should be settled
        ISnowballOptions.Round memory round = options.getRound(1);
        assertEq(uint8(round.status), uint8(ISnowballOptions.RoundStatus.Settled));
    }

    // ─── Full Settlement (Under wins) ───

    function test_fullSettlement_underWins() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        address[] memory overs = new address[](1);
        address[] memory unders = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        overs[0] = user1;
        unders[0] = user2;
        amounts[0] = 10 ether;

        vm.prank(relayer);
        options.submitFilledOrders(1, overs, unders, amounts);

        vm.warp(block.timestamp + ROUND_DURATION);
        oracle.setPrice(BTC_PRICE - 1000 * 1e18, true); // Under wins

        vm.prank(operator);
        options.executeRound(1);

        vm.prank(operator);
        options.settleOrders(1, 10);

        // user2 (Under) wins
        assertEq(ch.balanceOf(user2), 40 ether + 10 ether + 10 ether - 0.5 ether); // 59.5
        assertEq(ch.balanceOf(user1), 40 ether);
    }

    // ─── Draw (refund both) ───

    function test_fullSettlement_draw() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        address[] memory overs = new address[](1);
        address[] memory unders = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        overs[0] = user1;
        unders[0] = user2;
        amounts[0] = 10 ether;

        vm.prank(relayer);
        options.submitFilledOrders(1, overs, unders, amounts);

        vm.warp(block.timestamp + ROUND_DURATION);
        oracle.setPrice(BTC_PRICE, true); // Same price

        vm.prank(operator);
        options.executeRound(1);

        vm.prank(operator);
        options.settleOrders(1, 10);

        // Both get refunded
        assertEq(ch.balanceOf(user1), 50 ether);
        assertEq(ch.balanceOf(user2), 50 ether);
        assertEq(ch.accumulatedFees(), 0);
    }

    // ─── executeRound requires expiry ───

    function test_executeRound_tooEarly() public {
        vm.prank(operator);
        options.startRound(ROUND_DURATION);

        vm.prank(operator);
        vm.expectRevert("Options: round not expired");
        options.executeRound(1);
    }

    // ─── Commission fee ───

    function test_setCommissionFee() public {
        vm.prank(admin);
        options.setCommissionFee(1000); // 10%
        assertEq(options.commissionFee(), 1000);
    }

    function test_setCommissionFee_tooHigh() public {
        vm.prank(admin);
        vm.expectRevert("Options: fee too high");
        options.setCommissionFee(2001);
    }
}
