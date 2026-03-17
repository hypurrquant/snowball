// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MaturityTokenFactory} from "../../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";

/// @title MaturityTokenEdgeCasesTest
/// @notice Edge case tests for MaturityToken redeem, settlement rates, and escrow interaction
contract MaturityTokenEdgeCasesTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");

    int256 public constant FORWARD_RATE = 1400e18;
    uint256 public maturityTime;
    bytes32 public seriesId;

    function setUp() public {
        maturityTime = block.timestamp + 90 days;

        vm.startPrank(admin);

        usdc = new ERC20Mock("USDC", "USDC", 6);
        creAdapter = new CREOracleAdapter(admin, 60, 1000);
        oracleGuard = new OracleGuard(address(creAdapter), admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);

        escrow = new EscrowVault(address(usdc), admin);
        factory = new MaturityTokenFactory(address(usdc), address(escrow), address(oracleGuard), admin);

        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);
        seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.stopPrank();

        usdc.mint(alice, 10_000_000e6);
        usdc.mint(bob, 10_000_000e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(factory), type(uint256).max);
    }

    // ─── Partial Redemption ──────────────────────────────────────────

    function test_Redeem_Partial_ThenRemaining() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 1000e18);

        // Settle at 1:1
        vm.warp(maturityTime);
        _settle(1400e18);

        // Redeem 300 tokens
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(300e18);

        assertEq(MaturityToken(s.fToken).balanceOf(alice), 700e18);

        // Redeem remaining 700
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(700e18);

        assertEq(MaturityToken(s.fToken).balanceOf(alice), 0);
    }

    // ─── Dust amount rounds to zero ──────────────────────────────────

    function test_Redeem_RevertsWhen_PayoutRoundsToZero() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 1000e18);

        vm.warp(maturityTime);
        _settle(1400e18);

        // Try to redeem 1 wei — payout = 1 * 1e6 / 1e18 = 0
        vm.prank(alice);
        vm.expectRevert("Payout rounds to zero");
        MaturityToken(s.fToken).redeem(1);
    }

    // ─── Settlement at exact forward rate (1:1) ──────────────────────

    function test_Settle_ExactForwardRate_FTokenGets1USDC() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.warp(maturityTime);
        _settle(1400e18);

        // fToken = 1400/1400 = 1.0 → 1e6 USDC per token
        assertEq(MaturityToken(s.fToken).redemptionRate(), 1e6);
        // sfToken = 2 - 1.0 = 1.0 → 1e6 USDC per token
        assertEq(MaturityToken(s.sfToken).redemptionRate(), 1e6);
    }

    // ─── Extreme rate: fToken capped at 2 USDC ───────────────────────

    function test_Settle_ExtremeRate_FTokenCappedAt2() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.warp(maturityTime);

        // Settlement rate = 3x forward → ratio = 3.0, capped at 2.0
        // Need to bypass oracle deviation — set lastKnown first
        vm.prank(admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 4200e18);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 4200e18);
        factory.settleSeries(seriesId, new bytes[](0));

        assertEq(MaturityToken(s.fToken).redemptionRate(), 2e6);
        assertEq(MaturityToken(s.sfToken).redemptionRate(), 0);
    }

    // ─── fToken + sfToken redemption = 2 USDC ────────────────────────

    function test_Redeem_SumEquals2USDC() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 500e18);

        vm.warp(maturityTime);
        _settle(1350e18);

        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();

        // Sum should be 2 USDC (within rounding)
        assertApproxEqAbs(fRate + sfRate, 2e6, 2);

        // Redeem both
        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(500e18);
        vm.prank(alice);
        MaturityToken(s.sfToken).redeem(500e18);

        // Total received ≈ 1000 USDC (500 pairs * 2 USDC each)
        uint256 received = usdc.balanceOf(alice) - aliceBefore;
        assertApproxEqAbs(received, 1000e6, 500); // allow small rounding
    }

    // ─── Multiple users redeem from same series ──────────────────────

    function test_Redeem_MultipleUsers() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 500e18);
        vm.prank(bob);
        factory.mint(seriesId, 300e18);

        vm.warp(maturityTime);
        _settle(1450e18);

        // Both redeem fTokens
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(500e18);
        vm.prank(bob);
        MaturityToken(s.fToken).redeem(300e18);

        assertEq(MaturityToken(s.fToken).balanceOf(alice), 0);
        assertEq(MaturityToken(s.fToken).balanceOf(bob), 0);
    }

    // ─── Redeem before settlement reverts ────────────────────────────

    function test_Redeem_RevertsWhen_NotSettled() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.prank(alice);
        vm.expectRevert();
        MaturityToken(s.fToken).redeem(100e18);
    }

    // ─── Redeem more than balance reverts ─────────────────────────────

    function test_Redeem_RevertsWhen_InsufficientBalance() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.warp(maturityTime);
        _settle(1400e18);

        vm.prank(alice);
        vm.expectRevert();
        MaturityToken(s.fToken).redeem(200e18);
    }

    // ─── Independent series escrow ───────────────────────────────────

    function test_Redeem_IndependentSeriesEscrow() public {
        // Create second series
        vm.prank(admin);
        bytes32 seriesId2 = factory.createSeries(USD_KRW_MARKET, maturityTime + 1 days, 1450e18);

        // Mint in both
        vm.prank(alice);
        factory.mint(seriesId, 100e18);
        vm.prank(alice);
        factory.mint(seriesId2, 200e18);

        // Settle only first
        vm.warp(maturityTime);
        _settle(1400e18);

        IMaturityTokenFactory.Series memory s1 = factory.getSeries(seriesId);

        // Redeem from settled series
        vm.prank(alice);
        MaturityToken(s1.fToken).redeem(100e18);

        // Second series escrow should be untouched
        assertEq(escrow.seriesBalance(seriesId2), 400e6); // 200 pairs * 2 USDC
    }

    // ─── Fuzz: redemption rate consistency ───────────────────────────

    function testFuzz_Settle_RedemptionRateConsistency(int256 settlementRate) public {
        settlementRate = int256(bound(uint256(settlementRate), 700e18, 2800e18));

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.warp(maturityTime);

        // Bypass oracle deviation for fuzz testing
        vm.startPrank(admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, settlementRate);
        creAdapter.setPrice(USD_KRW_FEED_ID, settlementRate);
        vm.stopPrank();
        factory.settleSeries(seriesId, new bytes[](0));

        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();

        // fRate + sfRate should always = 2 USDC (within rounding)
        assertApproxEqAbs(fRate + sfRate, 2e6, 2, "f + sf must equal 2 USDC");

        // Both rates must be non-negative
        assertTrue(fRate <= 2e6, "fRate capped at 2 USDC");
        assertTrue(sfRate <= 2e6, "sfRate capped at 2 USDC");
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    function _settle(int256 rate) internal {
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, rate);
        factory.settleSeries(seriesId, new bytes[](0));
    }
}
