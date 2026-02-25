// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BTCMockOracle} from "../src/BTCMockOracle.sol";
import {IBTCMockOracle} from "../src/interfaces/IBTCMockOracle.sol";

contract BTCMockOracleTest is Test {
    BTCMockOracle oracle;
    address admin = address(1);
    address operator = address(2);
    address stranger = address(3);

    uint256 constant BTC_PRICE = 95_000 * 1e18; // $95,000

    function setUp() public {
        vm.startPrank(admin);
        oracle = new BTCMockOracle(admin);
        oracle.grantRole(oracle.OPERATOR_ROLE(), operator);
        vm.stopPrank();
    }

    // ─── updatePrice ───

    function test_updatePrice_success() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        assertEq(oracle.price(), BTC_PRICE);
        assertEq(oracle.lastUpdated(), block.timestamp);
    }

    function test_updatePrice_emitsEvent() public {
        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit IBTCMockOracle.PriceUpdated(BTC_PRICE, block.timestamp);
        oracle.updatePrice(BTC_PRICE);
    }

    function test_updatePrice_revertUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert();
        oracle.updatePrice(BTC_PRICE);
    }

    function test_updatePrice_revertZeroPrice() public {
        vm.prank(operator);
        vm.expectRevert("BTCMockOracle: zero price");
        oracle.updatePrice(0);
    }

    // ─── fetchPrice ───

    function test_fetchPrice_fresh() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        (uint256 p, bool isFresh) = oracle.fetchPrice();
        assertEq(p, BTC_PRICE);
        assertTrue(isFresh);
    }

    function test_fetchPrice_stale() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        vm.warp(block.timestamp + 121); // > MAX_PRICE_AGE

        (uint256 p, bool isFresh) = oracle.fetchPrice();
        assertEq(p, BTC_PRICE);
        assertFalse(isFresh);
    }

    function test_fetchPrice_returns1e18Scale() public {
        uint256 priceInput = 95_000 * 1e18;
        vm.prank(operator);
        oracle.updatePrice(priceInput);

        (uint256 p, ) = oracle.fetchPrice();
        assertEq(p, priceInput);
    }

    // ─── getPrice ───

    function test_getPrice_returns1e36Scale() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        uint256 morphoPrice = oracle.getPrice();
        assertEq(morphoPrice, BTC_PRICE * 1e18);
    }

    function test_getPrice_revertStale() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        vm.warp(block.timestamp + 121);

        vm.expectRevert("BTCMockOracle: stale price");
        oracle.getPrice();
    }

    function test_getPrice_revertNeverUpdated() public {
        vm.expectRevert("BTCMockOracle: stale price");
        oracle.getPrice();
    }

    // ─── verifyAndGetPrice ───

    function test_verifyAndGetPrice_returns1e18() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        uint256 p = oracle.verifyAndGetPrice("", 0);
        assertEq(p, BTC_PRICE);
    }

    function test_verifyAndGetPrice_revertStale() public {
        vm.prank(operator);
        oracle.updatePrice(BTC_PRICE);

        vm.warp(block.timestamp + 121);

        vm.expectRevert("BTCMockOracle: stale price");
        oracle.verifyAndGetPrice("", 0);
    }

    // ─── Access Control ───

    function test_adminCanGrantOperator() public {
        address newOp = address(4);
        bytes32 operatorRole = oracle.OPERATOR_ROLE();
        vm.prank(admin);
        oracle.grantRole(operatorRole, newOp);

        vm.prank(newOp);
        oracle.updatePrice(BTC_PRICE);
        assertEq(oracle.price(), BTC_PRICE);
    }

    function test_maxPriceAge() public {
        assertEq(oracle.MAX_PRICE_AGE(), 120);
    }
}
