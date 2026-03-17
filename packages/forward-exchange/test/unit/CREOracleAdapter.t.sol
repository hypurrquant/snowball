// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";

contract CREOracleAdapterTest is Test {
    CREOracleAdapter public adapter;

    address public admin = makeAddr("admin");
    address public nonAdmin = makeAddr("nonAdmin");

    bytes32 public constant KRW_FEED = keccak256("USD/KRW");
    bytes32 public constant JPY_FEED = keccak256("USD/JPY");

    uint256 public constant MAX_STALENESS = 60;
    uint256 public constant MAX_DEVIATION_BPS = 1000; // 10%

    function setUp() public {
        vm.prank(admin);
        adapter = new CREOracleAdapter(admin, MAX_STALENESS, MAX_DEVIATION_BPS);
    }

    // ─── Constructor ─────────────────────────────────────────────────

    function test_Constructor_SetsParams() public view {
        assertEq(adapter.maxStaleness(), MAX_STALENESS);
        assertEq(adapter.maxDeviationBps(), MAX_DEVIATION_BPS);
    }

    function test_Constructor_RevertsWhen_ZeroOwner() public {
        vm.expectRevert();
        new CREOracleAdapter(address(0), MAX_STALENESS, MAX_DEVIATION_BPS);
    }

    function test_Constructor_RevertsWhen_ZeroStaleness() public {
        vm.expectRevert();
        new CREOracleAdapter(admin, 0, MAX_DEVIATION_BPS);
    }

    function test_Constructor_RevertsWhen_ZeroDeviation() public {
        vm.expectRevert();
        new CREOracleAdapter(admin, MAX_STALENESS, 0);
    }

    // ─── setPrice ────────────────────────────────────────────────────

    function test_SetPrice_Success() public {
        vm.prank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);

        vm.prank(admin);
        adapter.setPrice(KRW_FEED, 1400e18);

        (int256 price, uint256 ts) = adapter.latestPrices(KRW_FEED);
        assertEq(price, 1400e18);
        assertEq(ts, block.timestamp);
    }

    function test_SetPrice_RevertsWhen_NotOwner() public {
        vm.prank(nonAdmin);
        vm.expectRevert();
        adapter.setPrice(KRW_FEED, 1400e18);
    }

    function test_SetPrice_RevertsWhen_ZeroPrice() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.setPrice(KRW_FEED, 0);
    }

    function test_SetPrice_RevertsWhen_NegativePrice() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.setPrice(KRW_FEED, -100e18);
    }

    // ─── Deviation Check ─────────────────────────────────────────────

    function test_SetPrice_RevertsWhen_ExcessiveDeviation() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);

        // 11% deviation should revert (max 10%)
        vm.expectRevert();
        adapter.setPrice(KRW_FEED, 1554e18); // 1400 * 1.11 = 1554
        vm.stopPrank();
    }

    function test_SetPrice_AcceptsWithinDeviation() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);

        // 9% deviation should pass
        adapter.setPrice(KRW_FEED, 1526e18); // 1400 * 1.09 = 1526
        vm.stopPrank();

        (int256 price,) = adapter.latestPrices(KRW_FEED);
        assertEq(price, 1526e18);
    }

    function test_SetPrice_UpdatesLastKnownPrice() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.setPrice(KRW_FEED, 1450e18);
        vm.stopPrank();

        assertEq(adapter.lastKnownPrice(KRW_FEED), 1450e18);
    }

    function test_SetPrice_NoDeviationCheckWhenNoLastKnown() public {
        // Without seeding, any price should be accepted
        vm.prank(admin);
        adapter.setPrice(KRW_FEED, 1400e18);

        (int256 price,) = adapter.latestPrices(KRW_FEED);
        assertEq(price, 1400e18);
    }

    // ─── seedLastKnownPrice ──────────────────────────────────────────

    function test_SeedLastKnownPrice_Success() public {
        vm.prank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);

        assertEq(adapter.lastKnownPrice(KRW_FEED), 1400e18);
    }

    function test_SeedLastKnownPrice_RevertsWhen_ZeroPrice() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.seedLastKnownPrice(KRW_FEED, 0);
    }

    function test_SeedLastKnownPrice_RevertsWhen_NegativePrice() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.seedLastKnownPrice(KRW_FEED, -1);
    }

    // ─── getPrice (staleness) ────────────────────────────────────────

    function test_GetPrice_Success() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.setPrice(KRW_FEED, 1400e18);
        vm.stopPrank();

        (int256 price, uint256 ts) = adapter.getPrice(KRW_FEED, new bytes[](0));
        assertEq(price, 1400e18);
        assertEq(ts, block.timestamp);
    }

    function test_GetPrice_RevertsWhen_StalePrice() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.setPrice(KRW_FEED, 1400e18);
        vm.stopPrank();

        vm.warp(block.timestamp + MAX_STALENESS + 1);

        vm.expectRevert();
        adapter.getPrice(KRW_FEED, new bytes[](0));
    }

    function test_GetPrice_RevertsWhen_NoPriceSet() public {
        vm.expectRevert();
        adapter.getPrice(KRW_FEED, new bytes[](0));
    }

    function test_GetPrice_JustBeforeStale() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.setPrice(KRW_FEED, 1400e18);
        vm.stopPrank();

        // Exactly at staleness boundary — should still work
        vm.warp(block.timestamp + MAX_STALENESS);

        (int256 price,) = adapter.getPrice(KRW_FEED, new bytes[](0));
        assertEq(price, 1400e18);
    }

    // ─── getSettlementPrice ──────────────────────────────────────────

    function test_GetSettlementPrice_SameAsGetPrice() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.setPrice(KRW_FEED, 1400e18);
        vm.stopPrank();

        (int256 price1,) = adapter.getPrice(KRW_FEED, new bytes[](0));
        (int256 price2,) = adapter.getSettlementPrice(KRW_FEED, new bytes[](0), uint64(block.timestamp));
        assertEq(price1, price2);
    }

    // ─── getUpdateFee ────────────────────────────────────────────────

    function test_GetUpdateFee_AlwaysZero() public view {
        assertEq(adapter.getUpdateFee(new bytes[](0)), 0);
    }

    // ─── Admin: setMaxStaleness ──────────────────────────────────────

    function test_SetMaxStaleness_Success() public {
        vm.prank(admin);
        adapter.setMaxStaleness(120);

        assertEq(adapter.maxStaleness(), 120);
    }

    function test_SetMaxStaleness_RevertsWhen_Zero() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.setMaxStaleness(0);
    }

    function test_SetMaxStaleness_RevertsWhen_NotOwner() public {
        vm.prank(nonAdmin);
        vm.expectRevert();
        adapter.setMaxStaleness(120);
    }

    // ─── Admin: setMaxDeviationBps ───────────────────────────────────

    function test_SetMaxDeviationBps_Success() public {
        vm.prank(admin);
        adapter.setMaxDeviationBps(500);

        assertEq(adapter.maxDeviationBps(), 500);
    }

    function test_SetMaxDeviationBps_RevertsWhen_Zero() public {
        vm.prank(admin);
        vm.expectRevert();
        adapter.setMaxDeviationBps(0);
    }

    // ─── Admin: setFallbackOracle ────────────────────────────────────

    function test_SetFallbackOracle_Success() public {
        address fallback_ = makeAddr("fallback");
        vm.prank(admin);
        adapter.setFallbackOracle(fallback_);

        assertEq(address(adapter.fallbackOracle()), fallback_);
    }

    function test_SetFallbackOracle_CanSetToZero() public {
        vm.prank(admin);
        adapter.setFallbackOracle(address(0));

        assertEq(address(adapter.fallbackOracle()), address(0));
    }

    // ─── Multiple Feeds ──────────────────────────────────────────────

    function test_MultipleFeedsIndependent() public {
        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, 1400e18);
        adapter.seedLastKnownPrice(JPY_FEED, 150e18);

        adapter.setPrice(KRW_FEED, 1400e18);
        adapter.setPrice(JPY_FEED, 150e18);
        vm.stopPrank();

        (int256 krwPrice,) = adapter.getPrice(KRW_FEED, new bytes[](0));
        (int256 jpyPrice,) = adapter.getPrice(JPY_FEED, new bytes[](0));

        assertEq(krwPrice, 1400e18);
        assertEq(jpyPrice, 150e18);
    }

    // ─── Fuzz: Deviation ─────────────────────────────────────────────

    function testFuzz_DeviationWithinBounds(uint256 deviationBps) public {
        deviationBps = bound(deviationBps, 1, MAX_DEVIATION_BPS - 1);

        int256 basePrice = 1000e18;
        int256 deviation = int256(deviationBps) * basePrice / 10_000;
        int256 newPrice = basePrice + deviation;

        vm.startPrank(admin);
        adapter.seedLastKnownPrice(KRW_FEED, basePrice);
        adapter.setPrice(KRW_FEED, newPrice);
        vm.stopPrank();

        (int256 price,) = adapter.latestPrices(KRW_FEED);
        assertEq(price, newPrice);
    }
}
