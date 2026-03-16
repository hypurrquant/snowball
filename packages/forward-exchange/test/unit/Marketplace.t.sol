// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Marketplace} from "../../src/infrastructure/Marketplace.sol";
import {IMarketplace} from "../../src/interfaces/IMarketplace.sol";
import {IForward} from "../../src/interfaces/IForward.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MarketplaceTest is BaseTest {
    Marketplace public marketplace;

    uint256 public longId;
    uint256 public shortId;
    uint256 public maturityTime;

    function setUp() public override {
        super.setUp();

        // Deploy marketplace
        vm.startPrank(admin);
        marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (address(forward), address(vault), admin))
        )));
        bytes32 mpRole = vault.MARKETPLACE_ROLE();
        vault.grantRole(mpRole, address(marketplace));
        // Grant admin OPERATOR_ROLE so tests can transfer locked collateral when NFT changes hands
        vault.grantRole(vault.OPERATOR_ROLE(), admin);
        vm.stopPrank();

        // Create a matched position: Alice long, Bob short
        maturityTime = block.timestamp + 30 days;
        (longId, shortId) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);
    }

    // ─── List ────────────────────────────────────────────────────────────

    function test_List_Success() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        IMarketplace.Listing memory listing = marketplace.getListing(longId);
        assertEq(listing.seller, alice);
        assertEq(listing.askPrice, 50_000e6);
        assertEq(listing.listedAt, block.timestamp);
    }

    function test_List_RevertNotOwner() public {
        vm.startPrank(carol);
        vm.expectRevert(IMarketplace.NotTokenOwner.selector);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();
    }

    function test_List_RevertNotActive() public {
        // Create an unmatched offer (use USD_JPY to avoid concentration limits)
        _depositToVault(carol, NOTIONAL);
        vm.prank(carol);
        (uint256 unmatchedLong, ) = forward.createOffer(
            USD_JPY_MARKET, NOTIONAL, 150e18, maturityTime, true
        );

        vm.startPrank(carol);
        forward.approve(address(marketplace), unmatchedLong);
        vm.expectRevert(IMarketplace.PositionNotActive.selector);
        marketplace.list(unmatchedLong, 50_000e6);
        vm.stopPrank();
    }

    function test_List_RevertSettled() public {
        // Settle the position first
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();
        forward.settle(longId, priceUpdate);

        // Try to list settled position - ownerOf will revert since NFT is burned
        vm.startPrank(alice);
        vm.expectRevert(); // ERC721: ownerOf reverts for non-existent token
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();
    }

    function test_List_RevertLocked() public {
        // Lock the position
        bytes32 spRole = forward.STRUCTURED_PRODUCT_ROLE();
        vm.prank(admin);
        forward.grantRole(spRole, admin);
        vm.prank(admin);
        forward.lock(longId);

        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        vm.expectRevert(IMarketplace.PositionLocked.selector);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();
    }

    function test_List_RevertMatured() public {
        // Warp past maturity
        vm.warp(maturityTime + 1);

        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        vm.expectRevert(IMarketplace.PositionMatured.selector);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();
    }

    function test_List_RevertZeroPrice() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        vm.expectRevert(IMarketplace.InvalidPrice.selector);
        marketplace.list(longId, 0);
        vm.stopPrank();
    }

    function test_List_RevertNotApproved() public {
        vm.prank(alice);
        vm.expectRevert(IMarketplace.NotApproved.selector);
        marketplace.list(longId, 50_000e6);
    }

    // ─── Cancel Listing ─────────────────────────────────────────────────

    function test_CancelListing_Success() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        marketplace.cancelListing(longId);
        vm.stopPrank();

        IMarketplace.Listing memory listing = marketplace.getListing(longId);
        assertEq(listing.seller, address(0));
    }

    function test_CancelListing_RevertNotSeller() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(IMarketplace.NotListingSeller.selector);
        marketplace.cancelListing(longId);
    }

    function test_CancelListing_RevertNotFound() public {
        vm.prank(alice);
        vm.expectRevert(IMarketplace.ListingNotFound.selector);
        marketplace.cancelListing(longId);
    }

    // ─── Update Price ───────────────────────────────────────────────────

    function test_UpdatePrice_Success() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        marketplace.updatePrice(longId, 60_000e6);
        vm.stopPrank();

        IMarketplace.Listing memory listing = marketplace.getListing(longId);
        assertEq(listing.askPrice, 60_000e6);
    }

    function test_UpdatePrice_RevertNotSeller() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(IMarketplace.NotListingSeller.selector);
        marketplace.updatePrice(longId, 60_000e6);
    }

    function test_UpdatePrice_RevertZeroPrice() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.expectRevert(IMarketplace.InvalidPrice.selector);
        marketplace.updatePrice(longId, 0);
        vm.stopPrank();
    }

    // ─── Buy ────────────────────────────────────────────────────────────

    function test_Buy_Success() public {
        uint256 askPrice = 50_000e6;

        // Alice lists her long position
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, askPrice);
        vm.stopPrank();

        // Carol deposits USDC and buys
        _depositToVault(carol, askPrice);

        uint256 carolFreeBefore = vault.freeBalance(carol);
        uint256 aliceFreeBefore = vault.freeBalance(alice);

        vm.prank(carol);
        marketplace.buy(longId);

        // NFT transferred to carol
        assertEq(forward.ownerOf(longId), carol);

        // USDC moved: carol paid, alice received
        assertEq(vault.freeBalance(carol), carolFreeBefore - askPrice);
        assertEq(vault.freeBalance(alice), aliceFreeBefore + askPrice);

        // Listing cleared
        IMarketplace.Listing memory listing = marketplace.getListing(longId);
        assertEq(listing.seller, address(0));
    }

    function test_Buy_RevertSelfBuy() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.expectRevert(IMarketplace.CannotBuyOwnListing.selector);
        marketplace.buy(longId);
        vm.stopPrank();
    }

    function test_Buy_RevertInsufficientBalance() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        // Carol has no vault balance
        vm.prank(carol);
        vm.expectRevert(); // InsufficientFreeBalance from Vault
        marketplace.buy(longId);
    }

    function test_Buy_RevertMatured() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        // Warp past maturity
        vm.warp(maturityTime + 1);

        _depositToVault(carol, 50_000e6);
        vm.prank(carol);
        vm.expectRevert(IMarketplace.PositionMatured.selector);
        marketplace.buy(longId);
    }

    function test_Buy_RevertStale() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        // Alice transfers NFT away (listing becomes stale)
        vm.prank(alice);
        forward.transferFrom(alice, carol, longId);

        _depositToVault(bob, 50_000e6);
        vm.prank(bob);
        vm.expectRevert(IMarketplace.SellerNoLongerOwns.selector);
        marketplace.buy(longId);
    }

    function test_Buy_RevertSettled() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        // Settle the position
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();
        forward.settle(longId, priceUpdate);

        _depositToVault(carol, 50_000e6);
        vm.prank(carol);
        vm.expectRevert(IMarketplace.PositionSettled.selector);
        marketplace.buy(longId);
    }

    function test_Buy_ThenSettle() public {
        uint256 askPrice = 50_000e6;

        // Alice lists her long position
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, askPrice);
        vm.stopPrank();

        // Carol deposits and buys
        _depositToVault(carol, askPrice);
        vm.prank(carol);
        marketplace.buy(longId);

        assertEq(forward.ownerOf(longId), carol);

        // Transfer vault locked collateral from alice to carol to reflect NFT ownership change.
        // The settlement engine uses current NFT owners to determine winner/loser locked balances.
        // Unlock alice's collateral, then re-lock it under carol's name.
        vm.prank(admin);
        vault.unlockCollateral(alice, longId, NOTIONAL);
        // Fund carol with NOTIONAL so she can lock the position collateral
        _fundUser(carol, NOTIONAL);
        _depositToVault(carol, NOTIONAL);
        vm.prank(admin);
        vault.lockCollateral(carol, longId, NOTIONAL);

        // Settle at maturity - long wins
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        uint256 carolFreeBefore = vault.freeBalance(carol);

        forward.settle(longId, priceUpdate);

        // Carol (new long owner) should receive the PnL
        uint256 carolFreeAfter = vault.freeBalance(carol);
        assertGt(carolFreeAfter, carolFreeBefore, "New owner should receive PnL from settlement");
    }

    // ─── Events ─────────────────────────────────────────────────────────

    function test_List_EmitsEvent() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);

        vm.expectEmit(true, true, false, true);
        emit IMarketplace.Listed(longId, alice, 50_000e6);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();
    }

    function test_Buy_EmitsEvent() public {
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);
        vm.stopPrank();

        _depositToVault(carol, 50_000e6);

        vm.expectEmit(true, true, true, true);
        emit IMarketplace.Sold(longId, alice, carol, 50_000e6);
        vm.prank(carol);
        marketplace.buy(longId);
    }
}
