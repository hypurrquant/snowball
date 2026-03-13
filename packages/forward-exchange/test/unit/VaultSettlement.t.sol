// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

/// @title VaultSettlementTest
/// @notice Tests for Vault.settlePosition PnL capping, pairing, and access control
contract VaultSettlementTest is BaseTest {

    // ─── PnL = 0 (no transfer) ───────────────────────────────────────

    function test_SettlePosition_ZeroPnL_BothGetCollateralBack() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D); // same rate → PnL=0

        uint256 aliceFreeBefore = vault.freeBalance(alice);
        uint256 bobFreeBefore = vault.freeBalance(bob);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        // Both get exact collateral back
        assertEq(vault.freeBalance(alice), aliceFreeBefore + NOTIONAL);
        assertEq(vault.freeBalance(bob), bobFreeBefore + NOTIONAL);
        // No collateral left locked
        assertEq(vault.positionCollateral(longId), 0);
        assertEq(vault.positionCollateral(longId + 1), 0);
    }

    // ─── PnL capped at loser's collateral ─────────────────────────────

    function test_SettlePosition_PnLCappedAtLoserCollateral() public {
        // Create position where PnL could exceed collateral
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);
        // Very large move (~7% within oracle deviation)
        _seedOraclePrice(USD_KRW_FEED_ID, 1498e18);

        int256 rawPnl = settlementEngine.calculatePnL(NOTIONAL, KRW_PRICE_18D, 1498e18);
        uint256 absPnl = rawPnl >= 0 ? uint256(rawPnl) : uint256(-rawPnl);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        // Winner receives at most collateral + loser's entire collateral
        uint256 aliceFree = vault.freeBalance(alice);
        uint256 bobFree = vault.freeBalance(bob);

        // Total distributed = total deposited (no USDC created/destroyed)
        assertEq(aliceFree + bobFree, 2 * NOTIONAL);

        // Winner gets collateral + min(pnl, loserCollateral)
        uint256 expectedPnl = absPnl > NOTIONAL ? NOTIONAL : absPnl;
        assertEq(aliceFree, NOTIONAL + expectedPnl);
        assertEq(bobFree, NOTIONAL - expectedPnl);
    }

    // ─── Position collateral cleared after settlement ─────────────────

    function test_SettlePosition_ClearsPositionCollateral() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        assertEq(vault.positionCollateral(longId), NOTIONAL);
        assertEq(vault.positionCollateral(longId + 1), NOTIONAL);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        assertEq(vault.positionCollateral(longId), 0);
        assertEq(vault.positionCollateral(longId + 1), 0);
    }

    // ─── Locked balance cleared after settlement ─────────────────────

    function test_SettlePosition_ClearsLockedBalance() public {
        uint256 matTime = block.timestamp + 30 days;
        _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        assertEq(vault.lockedBalance(alice), NOTIONAL);
        assertEq(vault.lockedBalance(bob), NOTIONAL);

        vm.warp(matTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        vm.prank(alice);
        forward.settle(2, _emptyPriceUpdate());

        assertEq(vault.lockedBalance(alice), 0);
        assertEq(vault.lockedBalance(bob), 0);
    }

    // ─── Vault access control ────────────────────────────────────────

    function test_LockCollateral_RevertsWhen_NotOperator() public {
        _depositToVault(alice, NOTIONAL);

        vm.prank(alice);
        vm.expectRevert();
        vault.lockCollateral(alice, 999, NOTIONAL);
    }

    function test_SettlePosition_RevertsWhen_NotOperator() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.settlePosition(2, alice, bob, 1000e6);
    }

    // ─── Solvency invariant ──────────────────────────────────────────

    function testFuzz_SettlePosition_TotalBalancePreserved(
        uint256 notional,
        int256 rateOffset
    ) public {
        notional = bound(notional, 10_000e6, 500_000e6);
        rateOffset = int256(bound(uint256(rateOffset), 1, 100e18));

        // Settle with rate above forward
        uint256 matTime = block.timestamp + 30 days;

        _fundUser(alice, notional);
        _fundUser(bob, notional);
        (uint256 longId,) = _createAndAcceptForward(notional, KRW_PRICE_18D, matTime);

        uint256 totalBefore = vault.freeBalance(alice) + vault.freeBalance(bob)
            + vault.lockedBalance(alice) + vault.lockedBalance(bob);

        vm.warp(matTime);
        int256 settleRate = KRW_PRICE_18D + rateOffset;
        _seedOraclePrice(USD_KRW_FEED_ID, settleRate);

        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        uint256 totalAfter = vault.freeBalance(alice) + vault.freeBalance(bob)
            + vault.lockedBalance(alice) + vault.lockedBalance(bob);

        assertEq(totalAfter, totalBefore, "Total balance must be preserved");
    }
}
