// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MaturityTokenFactory} from "../../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {FXPool} from "../../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../../src/tokenized/Router.sol";
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";
import {TokenizedSettlementConsumer} from "../../src/cre/TokenizedSettlementConsumer.sol";

contract TokenizedLifecycleTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;
    FXPool public pool;
    Router public router;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public treasury = makeAddr("treasury");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");

    int256 public constant FORWARD_RATE = 1400e18;
    uint256 public constant POOL_LIFETIME = 90 days;

    uint256 public maturityTime;
    bytes32 public seriesId;

    function setUp() public {
        maturityTime = block.timestamp + POOL_LIFETIME;

        vm.startPrank(admin);

        // Deploy dependencies
        usdc = new ERC20Mock("USDC", "USDC", 6);
        creAdapter = new CREOracleAdapter(admin, 60, 1000);
        oracleGuard = new OracleGuard(address(creAdapter), admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);

        // Deploy tokenized system
        escrow = new EscrowVault(address(usdc), admin);
        factory = new MaturityTokenFactory(
            address(usdc), address(escrow), address(oracleGuard), admin
        );

        // Grant roles
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        // Set market feed
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);

        // Create series
        seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        // Deploy pool (UUPS proxy)
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, 25e16, 5e16, 3e15);

        // Deploy router
        router = new Router(address(factory), address(usdc));

        vm.stopPrank();

        // Fund users
        usdc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 1_000_000e6);

        // Approve
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(alice);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(router), type(uint256).max);
    }

    // ─── Scenario 1: Full Lifecycle ───

    function test_FullLifecycle_CreateMintSwapSettleRedeem() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Alice mints 1000 token pairs (costs 2000 USDC)
        vm.prank(alice);
        factory.mint(seriesId, 1000e18);

        assertEq(MaturityToken(s.fToken).balanceOf(alice), 1000e18);
        assertEq(MaturityToken(s.sfToken).balanceOf(alice), 1000e18);
        assertEq(escrow.seriesBalance(seriesId), 2000e6);

        // Alice adds initial liquidity to pool
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.addLiquidity(1000e18, 1000e18, 0);

        assertGt(pool.balanceOf(alice), 0);

        // Bob mints and swaps to get fToken only
        vm.prank(bob);
        factory.mint(seriesId, 100e18);
        vm.prank(bob);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(bob);
        uint256 swapOut = pool.swap(address(MaturityToken(s.sfToken)), 100e18, 0);

        // Bob now has 100 + swapOut fTokens
        assertEq(MaturityToken(s.fToken).balanceOf(bob), 100e18 + swapOut);

        // Warp to maturity
        vm.warp(maturityTime);

        // Seed settlement price: 1300 (KRW strengthened → fToken profitable)
        _seedPrice(1300e18);
        bytes[] memory priceUpdate = _createPriceUpdate();

        // Settle series
        factory.settleSeries(seriesId, priceUpdate);

        assertTrue(MaturityToken(s.fToken).isSettled());
        assertTrue(MaturityToken(s.sfToken).isSettled());

        // Verify settlement rates (linear formula: S_T/F_0)
        // fToken = 1300/1400 ≈ 0.9286 → 928571 (6dec)
        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        assertApproxEqAbs(fRate, 928571, 1);

        // sfToken = 2 - 1300/1400 ≈ 1.0714 → 1071428 (6dec)
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();
        assertApproxEqAbs(sfRate, 1071428, 1);

        // Sum should be 2 USDC
        assertApproxEqAbs(fRate + sfRate, 2e6, 2);

        // Bob redeems fTokens
        uint256 bobFTokens = MaturityToken(s.fToken).balanceOf(bob);
        vm.prank(bob);
        MaturityToken(s.fToken).redeem(bobFTokens);

        // Bob should get fTokens * fRate / 1e18 USDC
        uint256 expectedUsdc = bobFTokens * fRate / 1e18;
        assertApproxEqAbs(usdc.balanceOf(bob), 1_000_000e6 - 200e6 + expectedUsdc, 1);
    }

    // ─── Scenario 2: Multi-User PnL ───

    function test_MultiUser_PnL_Verification() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Alice buys fToken (Long KRW), Bob buys sfToken (Short KRW)
        vm.prank(alice);
        factory.mint(seriesId, 500e18);
        vm.prank(bob);
        factory.mint(seriesId, 500e18);

        // Alice keeps fToken, gives sfToken to Bob
        // Actually they both have both tokens after minting
        // Let's have them swap with each other via pool

        // Alice provides liquidity with her tokens
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.addLiquidity(500e18, 500e18, 0);

        // Bob swaps all his fTokens for sfTokens (he wants to be short)
        vm.prank(bob);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(bob);
        uint256 sfOut = pool.swap(address(MaturityToken(s.fToken)), 100e18, 0);

        // Settle at 1500 (KRW weakened → fToken profitable with linear formula)
        vm.warp(maturityTime);
        _seedPrice(1500e18);
        bytes[] memory priceUpdate = _createPriceUpdate();
        factory.settleSeries(seriesId, priceUpdate);

        // fToken = S_T/F_0 = 1500/1400 ≈ 1.0714 → fToken wins
        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        assertGt(fRate, 1e6); // fToken worth more than 1 USDC
        // sfToken = 2 - 1500/1400 ≈ 0.9286 → sfToken loses
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();
        assertLt(sfRate, 1e6);

        // Bob redeems his sfTokens
        uint256 bobSfTokens = MaturityToken(s.sfToken).balanceOf(bob);
        assertGt(bobSfTokens, 500e18); // Bob has > 500 sfTokens (500 minted + sfOut from swap)
    }

    // ─── Scenario 3: LP Lifecycle ───

    function test_LP_Lifecycle() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Alice provides initial liquidity via direct mint + addLiquidity
        vm.prank(alice);
        factory.mint(seriesId, 5000e18);
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        uint256 lpTokens = pool.addLiquidity(5000e18, 5000e18, 0);

        assertGt(lpTokens, 0);

        // Bob does several swaps to generate fees
        vm.prank(bob);
        factory.mint(seriesId, 500e18);
        vm.prank(bob);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(bob);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);

        // Swap fToken → sfToken
        vm.prank(bob);
        pool.swap(address(MaturityToken(s.fToken)), 100e18, 0);

        // Swap back sfToken → fToken
        vm.prank(bob);
        pool.swap(address(MaturityToken(s.sfToken)), 100e18, 0);

        // Protocol should have accumulated fees
        assertGt(pool.protocolFeesX() + pool.protocolFeesY(), 0);

        // Alice removes liquidity
        vm.prank(alice);
        (uint256 amountX, uint256 amountY) = pool.removeLiquidity(lpTokens, 0, 0);

        // Alice should get back slightly more than deposited (LP fees)
        // LP fee share is 20% of fees, which increases reserves
        assertGe(amountX + amountY, 9999e18); // Close to original 10000
    }

    // ─── Scenario 4: KRW Strengthens (fToken wins) ───

    function test_Settlement_KRW_Strengthens() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.warp(maturityTime);

        // KRW strengthens: S_T = 1300 (from F_0 = 1400, ~7% move, within oracle deviation limit)
        vm.deal(address(this), 10 ether);
        _seedPrice(1300e18);
        bytes[] memory priceUpdate = _createPriceUpdate();
        factory.settleSeries(seriesId, priceUpdate);

        // fToken = 1300/1400 ≈ 0.929 → fToken holders lose (S_T dropped)
        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        assertLt(fRate, 1e6);

        // sfToken = 2 - 0.929 ≈ 1.071 → sfToken holders profit
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();
        assertGt(sfRate, 1e6);

        // Redeem both
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(100e18);
        vm.prank(alice);
        MaturityToken(s.sfToken).redeem(100e18);

        // Total USDC received should be ~200 USDC (= 2 * 100 tokens at cost of 2 USDC each)
        // Allow rounding tolerance from integer division
        uint256 usdcReceived = 100e18 * fRate / 1e18 + 100e18 * sfRate / 1e18;
        assertApproxEqAbs(usdcReceived, 200e6, 200);
    }

    // ─── Scenario 5: Swap at t_min ───

    function test_Swap_NearMaturity_TMin() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Setup pool
        vm.prank(alice);
        factory.mint(seriesId, 5000e18);
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.addLiquidity(5000e18, 5000e18, 0);

        // Warp to 1 day before maturity
        vm.warp(maturityTime - 1 days);

        uint256 t = pool.getCurrentT();
        assertLt(t, 10e16); // t should be small
        assertGe(t, 5e16);  // but >= t_min

        // Bob swaps — should still work with low slippage
        vm.prank(bob);
        factory.mint(seriesId, 100e18);
        vm.prank(bob);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(bob);
        uint256 out = pool.swap(address(MaturityToken(s.sfToken)), 50e18, 0);

        // Near 1:1 at low t
        assertGt(out, 49e18); // >0.98:1 ratio
    }

    // ─── Scenario 6: CRE Auto-Settlement + Redeem ───

    function test_CRE_Settlement_MintSwapSettleRedeem() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Deploy CRE consumer
        address creForwarder = makeAddr("creForwarder");
        vm.startPrank(admin);
        TokenizedSettlementConsumer consumer = new TokenizedSettlementConsumer(
            address(factory), creForwarder, admin
        );
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(consumer));
        vm.stopPrank();

        // Alice mints 500 token pairs
        vm.prank(alice);
        factory.mint(seriesId, 500e18);

        // Bob mints 200 token pairs
        vm.prank(bob);
        factory.mint(seriesId, 200e18);

        // Alice adds liquidity
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.addLiquidity(500e18, 500e18, 0);

        // Bob swaps sfToken for fToken (wants to go long)
        vm.prank(bob);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(bob);
        uint256 fOut = pool.swap(address(MaturityToken(s.sfToken)), 100e18, 0);

        uint256 bobFTokens = MaturityToken(s.fToken).balanceOf(bob);
        assertEq(bobFTokens, 200e18 + fOut);

        // Warp to maturity
        vm.warp(maturityTime);

        // CRE settles at 1300 (KRW strengthened → sfToken wins, fToken loses)
        int256 settlementRate = 1300e18;
        bytes memory report = abi.encode(seriesId, settlementRate);
        vm.prank(creForwarder);
        consumer.onReport("", report);

        // Verify settled
        assertTrue(MaturityToken(s.fToken).isSettled());
        assertTrue(MaturityToken(s.sfToken).isSettled());

        // fToken = 1300/1400 ≈ 0.929 USDC (fToken loses when S_T drops)
        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        assertLt(fRate, 1e6);

        // Bob redeems fTokens → gets USDC
        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        MaturityToken(s.fToken).redeem(bobFTokens);

        uint256 expectedUsdc = bobFTokens * fRate / 1e18;
        assertApproxEqAbs(usdc.balanceOf(bob) - bobUsdcBefore, expectedUsdc, 1);
    }

    // ─── Scenario 7: Rollover ───

    function test_RedeemAndRoll() public {
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);

        // Alice mints and provides liquidity to pool A
        vm.prank(alice);
        factory.mint(seriesId, 5000e18);
        vm.prank(alice);
        MaturityToken(s.fToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(s.sfToken).approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.addLiquidity(5000e18, 5000e18, 0);

        // Bob buys fToken via mintAndSwap (wants Long KRW)
        vm.prank(bob);
        uint256 bobTokens = router.mintAndSwap(seriesId, 200e6, address(pool), true, 0, block.timestamp + 1 hours);
        assertGt(bobTokens, 0);

        // Warp to maturity and settle series A
        vm.warp(maturityTime);
        _seedPrice(1300e18); // KRW strengthened
        bytes[] memory priceUpdate = _createPriceUpdate();
        factory.settleSeries(seriesId, priceUpdate);

        // Create new series B (next quarter)
        uint256 newMaturity = maturityTime + 90 days;
        int256 newForwardRate = 1300e18; // new forward at current spot

        vm.prank(admin);
        bytes32 newSeriesId = factory.createSeries(USD_KRW_MARKET, newMaturity, newForwardRate);

        // Deploy new pool for series B
        IMaturityTokenFactory.Series memory newS = factory.getSeries(newSeriesId);
        FXPool newPool = FXPoolDeployer.deploy(
            newS.fToken, newS.sfToken, newMaturity, 90 days, 25e16, 5e16, 3e15
        );

        // Alice provides liquidity to new pool
        vm.prank(alice);
        factory.mint(newSeriesId, 5000e18);
        vm.prank(alice);
        MaturityToken(newS.fToken).approve(address(newPool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(newS.sfToken).approve(address(newPool), type(uint256).max);
        vm.prank(alice);
        newPool.addLiquidity(5000e18, 5000e18, 0);

        // Bob rolls his fToken from series A → series B
        vm.prank(bob);
        MaturityToken(s.fToken).approve(address(router), type(uint256).max);

        uint256 bobFTokensBefore = bobTokens;
        vm.prank(bob);
        uint256 newTokens = router.redeemAndRoll(
            seriesId, newSeriesId, address(newPool), bobFTokensBefore, true, 0, block.timestamp + 1 hours
        );

        // Bob should have new fTokens
        assertGt(newTokens, 0);
        assertEq(MaturityToken(s.fToken).balanceOf(bob), 0, "Old fTokens burned");
        assertEq(MaturityToken(newS.fToken).balanceOf(bob), newTokens, "New fTokens received");

        // Since fToken = S_T/F_0 = 1300/1400 ≈ 0.929, Bob redeemed ~0.929 USDC per token
        // Then minted new tokens with that USDC, so newTokens < bobFTokensBefore
        // (Bob lost value because KRW strengthened and he was Long via fToken which profits when S_T rises)
        // Wait — with flipped formula, fToken = S_T/F_0. S_T=1300 < F_0=1400, so fToken < 1. Bob lost.
        // This is correct: Long loses when rate drops.
    }

    // ─── Helpers ───

    function _seedPrice(int256 price18d) internal {
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, price18d);
    }

    function _createPriceUpdate() internal pure returns (bytes[] memory) {
        return new bytes[](0);
    }
}
