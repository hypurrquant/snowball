// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Marketplace} from "../../src/infrastructure/Marketplace.sol";
import {IMarketplace} from "../../src/interfaces/IMarketplace.sol";

contract MarketplaceLifecycleTest is BaseTest {
    Marketplace public marketplace;

    function setUp() public override {
        super.setUp();

        vm.startPrank(admin);
        marketplace = Marketplace(address(new ERC1967Proxy(
            address(new Marketplace()),
            abi.encodeCall(Marketplace.initialize, (address(forward), address(vault), admin))
        )));
        bytes32 mpRole = vault.MARKETPLACE_ROLE();
        vault.grantRole(mpRole, address(marketplace));
        // Grant admin OPERATOR_ROLE on vault so tests can transfer locked collateral when NFT changes hands
        vault.grantRole(vault.OPERATOR_ROLE(), admin);
        vm.stopPrank();
    }

    /// @dev Transfer vault locked collateral when a position NFT is sold on secondary market.
    ///      The settlement engine uses current NFT owners to determine winner/loser locked balances.
    ///      Unlocks from the old owner, funds the new owner, then locks under the new owner.
    function _transferLockedCollateral(address from, address to, uint256 positionId, uint256 amount) internal {
        vm.prank(admin);
        vault.unlockCollateral(from, positionId, amount);
        _fundUser(to, amount);
        _depositToVault(to, amount);
        vm.prank(admin);
        vault.lockCollateral(to, positionId, amount);
    }

    /// @dev Full flow: Create position → List → Buy → Settle
    function test_FullFlow_ListBuySettle() public {
        uint256 maturityTime = block.timestamp + 30 days;
        uint256 askPrice = 50_000e6;

        // 1. Create and accept forward: Alice long, Bob short
        (uint256 longId, uint256 shortId) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        // 2. Alice lists her long position
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, askPrice);
        vm.stopPrank();

        // 3. Carol deposits and buys
        _depositToVault(carol, askPrice);
        vm.prank(carol);
        marketplace.buy(longId);

        // Transfer vault locked collateral from alice to carol to reflect NFT ownership change
        _transferLockedCollateral(alice, carol, longId, NOTIONAL);

        // Verify ownership
        assertEq(forward.ownerOf(longId), carol);
        assertEq(forward.ownerOf(shortId), bob);

        // 4. Settle at maturity (long wins)
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        uint256 carolFreeBefore = vault.freeBalance(carol);
        uint256 bobFreeBefore = vault.freeBalance(bob);

        forward.settle(longId, priceUpdate);

        // Carol (new long owner) gains, Bob (short owner) loses
        assertGt(vault.freeBalance(carol), carolFreeBefore);

        // Both NFTs burned
        vm.expectRevert();
        forward.ownerOf(longId);
        vm.expectRevert();
        forward.ownerOf(shortId);
    }

    /// @dev Verify that PnL goes to the new owner after secondary market purchase
    function test_ListBuy_PnLGoesToNewOwner() public {
        uint256 maturityTime = block.timestamp + 30 days;
        int256 forwardRate = 1400e18;
        uint256 askPrice = 80_000e6;

        // Create position
        (uint256 longId, uint256 shortId) = _createAndAcceptForward(NOTIONAL, forwardRate, maturityTime);

        // Alice lists long position, Carol buys
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, askPrice);
        vm.stopPrank();

        _depositToVault(carol, askPrice);
        vm.prank(carol);
        marketplace.buy(longId);

        // Transfer vault locked collateral from alice to carol to reflect NFT ownership change
        _transferLockedCollateral(alice, carol, longId, NOTIONAL);

        // Settle: long wins (rate went up)
        vm.warp(maturityTime);
        _seedOraclePrice(USD_KRW_FEED_ID, 1500e18);
        bytes[] memory priceUpdate = _emptyPriceUpdate();

        // Record balances
        uint256 aliceFreeBefore = vault.freeBalance(alice);
        uint256 carolFreeBefore = vault.freeBalance(carol);
        uint256 bobFreeBefore = vault.freeBalance(bob);

        forward.settle(longId, priceUpdate);

        // PnL = NOTIONAL * (1500 - 1400) / 1500 = 100_000e6 * 100 / 1500 ≈ 6666.66e6
        uint256 carolFreeAfter = vault.freeBalance(carol);
        uint256 bobFreeAfter = vault.freeBalance(bob);

        // Carol (new long owner) receives collateral + PnL
        assertGt(carolFreeAfter, carolFreeBefore, "Carol should receive settlement proceeds");

        // Alice's free balance should NOT change from settlement (she already sold the position)
        assertEq(vault.freeBalance(alice), aliceFreeBefore, "Alice should not receive settlement PnL");

        // Bob (short) loses PnL
        assertGt(bobFreeAfter, 0, "Bob should receive remaining collateral minus PnL");
        assertLt(bobFreeAfter - bobFreeBefore, NOTIONAL, "Bob should lose some collateral to PnL");
    }

    /// @dev List → Cancel → Relist → Buy flow
    function test_ListCancelRelistBuy() public {
        uint256 maturityTime = block.timestamp + 30 days;
        (uint256 longId, ) = _createAndAcceptForward(NOTIONAL, 1400e18, maturityTime);

        // Alice lists
        vm.startPrank(alice);
        forward.approve(address(marketplace), longId);
        marketplace.list(longId, 50_000e6);

        // Alice cancels
        marketplace.cancelListing(longId);
        IMarketplace.Listing memory listing = marketplace.getListing(longId);
        assertEq(listing.seller, address(0));

        // Alice relists at different price
        marketplace.list(longId, 60_000e6);
        vm.stopPrank();

        listing = marketplace.getListing(longId);
        assertEq(listing.askPrice, 60_000e6);

        // Carol buys at new price
        _depositToVault(carol, 60_000e6);
        vm.prank(carol);
        marketplace.buy(longId);

        assertEq(forward.ownerOf(longId), carol);
    }
}
