// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {IForward} from "../../src/interfaces/IForward.sol";

contract ForwardLifecycleTest is BaseTest {
    /// @dev Full lifecycle: Create → Accept → Settle (Long wins)
    function test_FullLifecycle_LongWins() public {
        uint256 maturityTime = block.timestamp + 30 days;
        int256 forwardRate = 1400e18; // 1400 KRW/USD

        // 1. Create and accept
        (uint256 longId, uint256 shortId) = _createAndAcceptForward(NOTIONAL, forwardRate, maturityTime);

        assertEq(forward.ownerOf(longId), alice);
        assertEq(forward.ownerOf(shortId), bob);

        // 2. Warp to maturity
        vm.warp(maturityTime);

        // 3. Settlement rate: 1450 (KRW weakened, Long wins)
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        // 4. Record balances before settlement
        uint256 aliceFreeBefore = vault.freeBalance(alice);
        uint256 bobFreeBefore = vault.freeBalance(bob);

        // 5. Settle
        forward.settle(longId, priceUpdate);

        // 6. Verify settlement
        assertTrue(forward.isSettled(longId));

        // PnL = 100_000e6 * (1450e18 - 1400e18) / 1450e18
        int256 expectedPnl = int256(NOTIONAL) * (1450e18 - forwardRate) / 1450e18;
        assertTrue(expectedPnl > 0);

        // Alice (Long) should gain
        assertGt(vault.freeBalance(alice), aliceFreeBefore);
        // Both NFTs should be burned
        vm.expectRevert();
        forward.ownerOf(longId);
        vm.expectRevert();
        forward.ownerOf(shortId);
    }

    /// @dev Full lifecycle: Create → Accept → Settle (Short wins)
    function test_FullLifecycle_ShortWins() public {
        uint256 maturityTime = block.timestamp + 30 days;
        int256 forwardRate = 1400e18;

        (uint256 longId, uint256 shortId) = _createAndAcceptForward(NOTIONAL, forwardRate, maturityTime);

        vm.warp(maturityTime);

        // Settlement rate: 1350 (KRW strengthened, Short wins)
        _seedOraclePrice(USD_KRW_FEED_ID, 1350e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        forward.settle(longId, priceUpdate);

        assertTrue(forward.isSettled(longId));
    }

    /// @dev Create → Transfer → Settle (position transferred before maturity)
    function test_Lifecycle_TransferThenSettle() public {
        uint256 maturityTime = block.timestamp + 30 days;
        int256 forwardRate = 1400e18;

        (uint256 longId, uint256 shortId) = _createAndAcceptForward(NOTIONAL, forwardRate, maturityTime);

        // Alice transfers Long position to Carol
        vm.prank(alice);
        forward.transferFrom(alice, carol, longId);
        assertEq(forward.ownerOf(longId), carol);

        // Transfer the vault locked collateral from alice to carol to reflect NFT ownership change.
        // The settlement engine uses current NFT owners to determine winner/loser locked balances.
        vm.startPrank(admin);
        vault.grantRole(vault.OPERATOR_ROLE(), admin);
        vault.unlockCollateral(alice, longId, NOTIONAL);
        vm.stopPrank();
        // Fund carol with NOTIONAL so she can lock the position collateral
        _fundUser(carol, NOTIONAL);
        _depositToVault(carol, NOTIONAL);
        vm.prank(admin);
        vault.lockCollateral(carol, longId, NOTIONAL);

        // Settle at maturity
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        forward.settle(longId, priceUpdate);
        assertTrue(forward.isSettled(longId));
    }

    /// @dev Create → Lock → Transfer fails → Unlock → Transfer succeeds
    function test_Lifecycle_LockUnlockTransfer() public {
        uint256 maturityTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        // Grant structured product role to keeper
        bytes32 spRole = forward.STRUCTURED_PRODUCT_ROLE();
        vm.prank(admin);
        forward.grantRole(spRole, keeper);

        // Lock
        vm.prank(keeper);
        forward.lock(longId);

        // Transfer should fail
        vm.prank(alice);
        vm.expectRevert(IForward.TransferWhileLocked.selector);
        forward.transferFrom(alice, carol, longId);

        // Unlock
        vm.prank(keeper);
        forward.unlock(longId);

        // Transfer should succeed
        vm.prank(alice);
        forward.transferFrom(alice, carol, longId);
        assertEq(forward.ownerOf(longId), carol);
    }

    /// @dev Create → Cancel (unmatched offer)
    function test_Lifecycle_CreateAndCancel() public {
        _depositToVault(alice, NOTIONAL);
        uint256 aliceBalBefore = vault.freeBalance(alice);
        assertEq(aliceBalBefore, NOTIONAL);

        vm.prank(alice);
        (uint256 longId,) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, block.timestamp + 30 days, true
        );

        assertEq(vault.freeBalance(alice), 0);

        vm.prank(alice);
        forward.cancelOffer(longId);

        assertEq(vault.freeBalance(alice), NOTIONAL); // Fully returned
    }

    /// @dev Invalid oracle price should revert settlement
    function test_Settlement_RevertsWhen_StaleOracle() public {
        uint256 maturityTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        vm.warp(maturityTime);

        // Seed price far in the past (stale) — set price then warp beyond staleness
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);
        vm.warp(maturityTime + MAX_STALENESS + 1);

        bytes[] memory priceUpdate = _emptyPriceUpdate();

        vm.expectRevert();
        forward.settle(longId, priceUpdate);
    }

    /// @dev Settlement before maturity should revert
    function test_Settlement_RevertsWhen_BeforeMaturity() public {
        uint256 maturityTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        // Don't warp - try to settle immediately
        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        vm.expectRevert(IForward.MaturityNotReached.selector);
        forward.settle(longId, priceUpdate);
    }

    /// @dev Multiple concurrent forward positions with different users
    function test_MultipleConcurrentPositions() public {
        uint256 maturityTime = block.timestamp + 30 days;

        _depositToVault(alice, NOTIONAL);
        _depositToVault(bob, NOTIONAL);

        // Position 1: Alice (long) vs Bob (short) on USD/KRW
        vm.prank(alice);
        (uint256 longId1, uint256 shortId1) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(bob);
        forward.acceptOffer(shortId1);

        // Position 2: Carol (long) vs Bob on USD/JPY (different market - no concentration issue)
        _fundUser(carol, NOTIONAL);
        _fundUser(bob, NOTIONAL);
        _depositToVault(carol, NOTIONAL);
        _depositToVault(bob, NOTIONAL);

        vm.prank(carol);
        (uint256 longId2, uint256 shortId2) = forward.createOffer(
            USD_JPY_MARKET, NOTIONAL, 150e18, maturityTime, true
        );

        vm.prank(bob);
        forward.acceptOffer(shortId2);

        assertEq(forward.ownerOf(longId1), alice);
        assertEq(forward.ownerOf(longId2), carol);
        assertEq(vault.lockedBalance(alice), NOTIONAL);
        assertEq(vault.lockedBalance(carol), NOTIONAL);
        assertEq(vault.lockedBalance(bob), NOTIONAL * 2);
    }
}
