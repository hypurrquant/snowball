// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {IForward} from "../../src/interfaces/IForward.sol";

contract ForwardTest is BaseTest {
    uint256 internal maturityTime;

    function setUp() public override {
        super.setUp();
        maturityTime = block.timestamp + 30 days;
    }

    // ─── createOffer ─────────────────────────────────────────────────────

    function test_CreateOffer_Long() public {
        _depositToVault(alice, NOTIONAL);

        vm.prank(alice);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        assertEq(longId, 2);
        assertEq(shortId, 3);
        assertEq(forward.ownerOf(longId), alice); // Alice holds long
        assertEq(vault.freeBalance(alice), 0);     // All locked
        assertEq(vault.lockedBalance(alice), NOTIONAL);

        IForward.ForwardPosition memory pos = forward.getPosition(longId);
        assertEq(pos.marketId, USD_KRW_MARKET);
        assertEq(pos.notional, NOTIONAL);
        assertEq(pos.forwardRate, 1400e18);
        assertEq(pos.maturityTime, maturityTime);
        assertFalse(pos.settled);
        assertEq(pos.counterparty, address(0)); // Not yet matched
    }

    function test_CreateOffer_Short() public {
        _depositToVault(alice, NOTIONAL);

        vm.prank(alice);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, false
        );

        assertEq(forward.ownerOf(shortId), alice); // Alice holds short
        // Long token not yet minted (no owner)
        vm.expectRevert();
        forward.ownerOf(longId);
    }

    function test_CreateOffer_RevertsWhen_ZeroNotional() public {
        _depositToVault(alice, NOTIONAL);
        vm.prank(alice);
        vm.expectRevert(IForward.InvalidNotional.selector);
        forward.createOffer(USD_KRW_MARKET, 0, 1400e18, maturityTime, true);
    }

    function test_CreateOffer_RevertsWhen_NegativeRate() public {
        _depositToVault(alice, NOTIONAL);
        vm.prank(alice);
        vm.expectRevert(IForward.InvalidForwardRate.selector);
        forward.createOffer(USD_KRW_MARKET, NOTIONAL, -1, maturityTime, true);
    }

    function test_CreateOffer_RevertsWhen_PastMaturity() public {
        _depositToVault(alice, NOTIONAL);
        vm.prank(alice);
        vm.expectRevert(IForward.InvalidMaturity.selector);
        forward.createOffer(USD_KRW_MARKET, NOTIONAL, 1400e18, block.timestamp - 1, true);
    }

    function test_CreateOffer_RevertsWhen_InsufficientCollateral() public {
        _depositToVault(alice, NOTIONAL / 2);
        vm.prank(alice);
        vm.expectRevert(); // InsufficientFreeBalance
        forward.createOffer(USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true);
    }

    // ─── acceptOffer ─────────────────────────────────────────────────────

    function test_AcceptOffer_Success() public {
        _depositToVault(alice, NOTIONAL);
        _depositToVault(bob, NOTIONAL);

        vm.prank(alice);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(bob);
        forward.acceptOffer(shortId);

        assertEq(forward.ownerOf(longId), alice);
        assertEq(forward.ownerOf(shortId), bob);
        assertEq(vault.lockedBalance(bob), NOTIONAL);

        IForward.ForwardPosition memory pos = forward.getPosition(longId);
        assertEq(pos.counterparty, bob);
    }

    function test_AcceptOffer_RevertsWhen_AlreadyAccepted() public {
        _depositToVault(alice, NOTIONAL);
        _depositToVault(bob, NOTIONAL);
        _depositToVault(carol, NOTIONAL);

        vm.prank(alice);
        (, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(bob);
        forward.acceptOffer(shortId);

        vm.prank(carol);
        vm.expectRevert(IForward.OfferAlreadyAccepted.selector);
        forward.acceptOffer(shortId);
    }

    function test_AcceptOffer_RevertsWhen_SelfAccept() public {
        _depositToVault(alice, NOTIONAL * 2);

        vm.prank(alice);
        (, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(alice);
        vm.expectRevert(IForward.CannotAcceptOwnOffer.selector);
        forward.acceptOffer(shortId);
    }

    // ─── cancelOffer ─────────────────────────────────────────────────────

    function test_CancelOffer_Success() public {
        _depositToVault(alice, NOTIONAL);

        vm.prank(alice);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(alice);
        forward.cancelOffer(longId);

        assertEq(vault.freeBalance(alice), NOTIONAL); // Collateral returned
        assertEq(vault.lockedBalance(alice), 0);

        // Token should be burned
        vm.expectRevert();
        forward.ownerOf(longId);
    }

    function test_CancelOffer_RevertsWhen_AlreadyAccepted() public {
        _depositToVault(alice, NOTIONAL);
        _depositToVault(bob, NOTIONAL);

        vm.prank(alice);
        (uint256 longId, uint256 shortId) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(bob);
        forward.acceptOffer(shortId);

        vm.prank(alice);
        vm.expectRevert(IForward.OfferAlreadyAccepted.selector);
        forward.cancelOffer(longId);
    }

    function test_CancelOffer_RevertsWhen_NotCreator() public {
        _depositToVault(alice, NOTIONAL);

        vm.prank(alice);
        (uint256 longId,) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, 1400e18, maturityTime, true
        );

        vm.prank(bob);
        vm.expectRevert(IForward.NotOfferCreator.selector);
        forward.cancelOffer(longId);
    }

    // ─── lock/unlock ─────────────────────────────────────────────────────

    function test_Lock_BlocksTransfer() public {
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        // Grant structured product role to carol for testing
        bytes32 spRole = forward.STRUCTURED_PRODUCT_ROLE();
        vm.prank(admin);
        forward.grantRole(spRole, carol);

        vm.prank(carol);
        forward.lock(longId);

        // Try to transfer - should fail
        vm.prank(alice);
        vm.expectRevert(IForward.TransferWhileLocked.selector);
        forward.transferFrom(alice, carol, longId);
    }

    function test_Unlock_AllowsTransfer() public {
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        bytes32 spRole = forward.STRUCTURED_PRODUCT_ROLE();
        vm.prank(admin);
        forward.grantRole(spRole, carol);

        vm.prank(carol);
        forward.lock(longId);

        vm.prank(carol);
        forward.unlock(longId);

        // Now transfer should work
        vm.prank(alice);
        forward.transferFrom(alice, carol, longId);
        assertEq(forward.ownerOf(longId), carol);
    }

    function test_Lock_RevertsWhen_NotStructuredProduct() public {
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        vm.prank(alice);
        vm.expectRevert();
        forward.lock(longId);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function test_GetPairedTokenId() public view {
        assertEq(forward.getPairedTokenId(2), 3);
        assertEq(forward.getPairedTokenId(3), 2);
        assertEq(forward.getPairedTokenId(4), 5);
        assertEq(forward.getPairedTokenId(5), 4);
    }

    function test_Maturity() public {
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);
        assertEq(forward.maturity(longId), maturityTime);
    }

    function test_IsSettled_False() public {
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);
        assertFalse(forward.isSettled(longId));
    }

    // ─── Fuzz ────────────────────────────────────────────────────────────

    function testFuzz_CreateOffer_VariousNotionals(uint256 notional) public {
        notional = bound(notional, 1, 10_000_000e6); // 1 wei to 10M USDC
        _fundUser(alice, notional);
        _depositToVault(alice, notional);

        vm.prank(alice);
        (uint256 longId,) = forward.createOffer(
            USD_KRW_MARKET, notional, 1400e18, maturityTime, true
        );

        IForward.ForwardPosition memory pos = forward.getPosition(longId);
        assertEq(pos.notional, notional);
    }
}
