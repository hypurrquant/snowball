// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

contract OracleGuardTest is BaseTest {
    function test_GetPrice_Success() public {
        // Seed price in CRE adapter
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);

        bytes[] memory updateData = _emptyPriceUpdate();

        (int256 price, uint256 timestamp) = creAdapter.getPrice(USD_KRW_FEED_ID, updateData);

        assertEq(price, 1400e18);
        assertEq(timestamp, block.timestamp);
    }

    function test_GetPrice_RevertsWhen_PriceNotSet() public {
        // Try to read a feed that was never set
        bytes32 unknownFeed = keccak256("UNKNOWN");
        bytes[] memory updateData = _emptyPriceUpdate();

        vm.expectRevert();
        creAdapter.getPrice(unknownFeed, updateData);
    }

    function test_GetPrice_RevertsWhen_StalePrice() public {
        // Seed price
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);

        // Warp beyond staleness window
        vm.warp(block.timestamp + MAX_STALENESS + 1);

        bytes[] memory updateData = _emptyPriceUpdate();
        vm.expectRevert();
        creAdapter.getPrice(USD_KRW_FEED_ID, updateData);
    }

    function test_GetPrice_ExcessiveDeviation() public {
        // Seed initial price
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);

        // Try to set a 20% deviated price (exceeds 10% max deviation)
        int256 deviatedPrice = KRW_PRICE_18D * 120 / 100;

        vm.prank(admin);
        vm.expectRevert();
        creAdapter.setPrice(USD_KRW_FEED_ID, deviatedPrice);
    }

    function test_OracleGuard_Fallback() public {
        // Deploy a second CREOracleAdapter as "fallback"
        vm.startPrank(admin);
        CREOracleAdapter fallbackAdapter = new CREOracleAdapter(
            admin, MAX_STALENESS, MAX_DEVIATION_BPS
        );
        fallbackAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);
        fallbackAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);

        oracleGuard.setSecondaryAdapter(address(fallbackAdapter));
        oracleGuard.setFallbackEnabled(true);
        vm.stopPrank();

        // OracleGuard should be able to get price through primary
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);
        bytes[] memory updateData = _emptyPriceUpdate();

        (int256 price,) = oracleGuard.getPrice(USD_KRW_FEED_ID, updateData);
        assertEq(price, 1400e18);
    }

    function test_OracleGuard_Pause() public {
        vm.prank(admin);
        oracleGuard.pause();

        bytes[] memory updateData = _emptyPriceUpdate();
        vm.expectRevert();
        oracleGuard.getPrice(USD_KRW_FEED_ID, updateData);
    }

    function test_CREAdapter_SetMaxStaleness() public {
        vm.prank(admin);
        creAdapter.setMaxStaleness(120);
        assertEq(creAdapter.maxStaleness(), 120);
    }

    function test_CREAdapter_SetMaxStaleness_RevertsWhen_Zero() public {
        vm.prank(admin);
        vm.expectRevert(CREOracleAdapter.InvalidParameter.selector);
        creAdapter.setMaxStaleness(0);
    }

    function test_CREAdapter_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        creAdapter.setMaxStaleness(120);
    }
}
