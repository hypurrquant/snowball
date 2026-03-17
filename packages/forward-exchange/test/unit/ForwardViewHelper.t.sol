// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {ForwardViewHelper} from "../../src/cre/ForwardViewHelper.sol";

contract ForwardViewHelperTest is BaseTest {
    ForwardViewHelper public helper;

    function setUp() public override {
        super.setUp();
        helper = new ForwardViewHelper();
    }

    // ─── No Positions ────────────────────────────────────────────────

    function test_GetMaturedPositions_Empty() public view {
        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 0);
    }

    // ─── No Matured Positions ────────────────────────────────────────

    function test_GetMaturedPositions_NoneMatured() public {
        uint256 matTime = block.timestamp + 30 days;
        _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        // Not yet matured
        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 0);
    }

    // ─── Single Matured Position ─────────────────────────────────────

    function test_GetMaturedPositions_SingleMatured() public {
        uint256 matTime = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);

        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 1);
        assertEq(positions[0].longId, longId);
        assertEq(positions[0].marketId, USD_KRW_MARKET);
        assertEq(positions[0].notional, NOTIONAL);
        assertEq(positions[0].forwardRate, KRW_PRICE_18D);
        assertEq(positions[0].longOwner, alice);
        assertEq(positions[0].shortOwner, bob);
    }

    // ─── Multiple Positions, Mixed ───────────────────────────────────

    function test_GetMaturedPositions_MixedStates() public {
        uint256 matTime1 = block.timestamp + 10 days;
        uint256 matTime2 = block.timestamp + 30 days;

        // Raise concentration limit for this test
        vm.prank(admin);
        riskManager.updateMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 10_000,
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));

        // Position 1: alice vs bob, will mature
        _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime1);

        // Position 2: carol vs bob, won't mature yet
        _fundUser(carol, INITIAL_USDC);
        _fundUser(bob, INITIAL_USDC);
        _createAndAcceptForwardCustom(carol, bob, NOTIONAL, KRW_PRICE_18D, matTime2);

        // Warp to only position 1 maturity
        vm.warp(matTime1);

        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 1);
    }

    // ─── Settled Position Not Returned ───────────────────────────────

    function test_GetMaturedPositions_ExcludesSettled() public {
        uint256 matTime = block.timestamp + 10 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, KRW_PRICE_18D, matTime);

        vm.warp(matTime);

        // Settle position
        _seedOraclePrice(USD_KRW_FEED_ID, 1450e18);
        vm.prank(alice);
        forward.settle(longId, _emptyPriceUpdate());

        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 0);
    }

    // ─── Pending (Unmatched) Position Not Returned ───────────────────

    function test_GetMaturedPositions_ExcludesPending() public {
        // Create offer without accepting
        _depositToVault(alice, NOTIONAL);
        vm.prank(alice);
        forward.createOffer(USD_KRW_MARKET, NOTIONAL, KRW_PRICE_18D, block.timestamp + 10 days, true);

        vm.warp(block.timestamp + 11 days);

        ForwardViewHelper.MaturedPosition[] memory positions = helper.getMaturedPositions(address(forward), 0);
        assertEq(positions.length, 0);
    }

    // ─── Helper ──────────────────────────────────────────────────────

    function _createAndAcceptForwardCustom(
        address maker,
        address taker,
        uint256 notional,
        int256 forwardRate,
        uint256 maturityTime
    ) internal returns (uint256 longId, uint256 shortId) {
        _depositToVault(maker, notional);
        _depositToVault(taker, notional);

        vm.prank(maker);
        (longId, shortId) = forward.createOffer(USD_KRW_MARKET, notional, forwardRate, maturityTime, true);

        vm.prank(taker);
        forward.acceptOffer(shortId);
    }
}
