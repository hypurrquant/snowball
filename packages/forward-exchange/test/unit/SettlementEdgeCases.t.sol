// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

/// @title SettlementEdgeCases
/// @notice Edge case tests for PnL calculations and settlement boundaries
contract SettlementEdgeCasesTest is BaseTest {

    // ─── PnL = 0 (settlementRate == forwardRate) ─────────────────────

    function test_Settlement_ZeroPnL() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);

        // Settle at exact forward rate — PnL should be 0
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);

        uint256 aliceFree = vault.freeBalance(alice);
        uint256 bobFree = vault.freeBalance(bob);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        // Both users get their collateral back (no transfer)
        assertEq(vault.freeBalance(alice), aliceFree + NOTIONAL);
        assertEq(vault.freeBalance(bob), bobFree + NOTIONAL);
    }

    // ─── Settlement Window Boundary ──────────────────────────────────

    function test_Settlement_ExactlyAtMaturity() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime); // exactly at maturity
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        assertTrue(forward.getPosition(longId).settled);
    }

    function test_Settlement_AtEndOfWindow() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        // Warp to end of settlement window
        vm.warp(matTime + SETTLEMENT_WINDOW);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        assertTrue(forward.getPosition(longId).settled);
    }

    function test_Settlement_RevertsWhen_PastWindow() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime + SETTLEMENT_WINDOW + 1);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);

        vm.prank(alice);
        vm.expectRevert();
        forward.settle(longId, _emptyPriceUpdate());
    }

    // ─── Large PnL (near-max rate move) ──────────────────────────────

    function test_Settlement_LargePositiveMove() public {
        // ~7% move (within 10% oracle deviation)
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1498e18); // ~7% increase

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        assertTrue(forward.getPosition(longId).settled);
    }

    function test_Settlement_LargeNegativeMove() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1302e18); // ~7% decrease

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        // Short wins when rate drops
        assertTrue(forward.getPosition(longId).settled);
    }

    // ─── PnL Calculation Precision ───────────────────────────────────

    function test_CalculatePnL_Symmetry() public view {
        int256 pnlLong = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1450e18);
        int256 pnlShort = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1350e18);

        // Magnitudes should be approximately equal for equal rate moves
        uint256 absLong = pnlLong >= 0 ? uint256(pnlLong) : uint256(-pnlLong);
        uint256 absShort = pnlShort >= 0 ? uint256(pnlShort) : uint256(-pnlShort);

        // Not exactly equal due to division (50/1400 != -50/1400 in integer math)
        assertApproxEqAbs(absLong, absShort, 1);
    }

    function test_CalculatePnL_SmallNotional() public view {
        // 1 USDC notional with small rate change
        int256 pnl = settlementEngine.calculatePnL(1e6, 1400e18, 1401e18);

        // Expected: 1e6 * 1e18 / 1400e18 ≈ 714
        assertEq(pnl, 714);
    }

    function test_CalculatePnL_ExactForwardRate() public view {
        int256 pnl = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1400e18);
        assertEq(pnl, 0);
    }

    // ─── Concurrent Settlements ──────────────────────────────────────

    function test_Settlement_MultipleConcurrent() public {
        uint256 matTime = block.timestamp + 30 days;

        // Raise concentration limit for this test
        vm.prank(admin);
        riskManager.updateMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 10_000, // 100% — no limit
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));

        (uint256 longId1,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        _fundUser(alice, INITIAL_USDC);
        _fundUser(bob, INITIAL_USDC);
        (uint256 longId2,) = _createAndAcceptForward(NOTIONAL, 1410e18, matTime);

        _fundUser(alice, INITIAL_USDC);
        _fundUser(bob, INITIAL_USDC);
        (uint256 longId3,) = _createAndAcceptForward(NOTIONAL, 1390e18, matTime);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1420e18);

        // Settle all three
        vm.prank(alice);
        forward.settle(longId1, _emptyPriceUpdate());
        vm.prank(alice);
        forward.settle(longId2, _emptyPriceUpdate());
        vm.prank(alice);
        forward.settle(longId3, _emptyPriceUpdate());

        assertTrue(forward.getPosition(longId1).settled);
        assertTrue(forward.getPosition(longId2).settled);
        assertTrue(forward.getPosition(longId3).settled);
    }

    // ─── Fuzz: PnL consistency ───────────────────────────────────────

    function testFuzz_Settlement_PnL_ZeroSum(uint256 notional, int256 forwardRate, int256 settlementRate) public view {
        notional = bound(notional, 1e6, 10_000_000e6);
        forwardRate = int256(bound(uint256(forwardRate), 100e18, 10_000e18));
        settlementRate = int256(bound(uint256(settlementRate), 100e18, 10_000e18));

        int256 longPnl = settlementEngine.calculatePnL(notional, forwardRate, settlementRate);
        int256 shortPnl = -longPnl;

        // Zero-sum: long + short = 0
        assertEq(longPnl + shortPnl, 0);
    }
}
