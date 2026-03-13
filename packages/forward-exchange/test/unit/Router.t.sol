// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MaturityTokenFactory} from "../../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {FXPool} from "../../src/tokenized/FXPool.sol";
import {FXPoolUSDC} from "../../src/tokenized/FXPoolUSDC.sol";
import {FXPoolDeployer} from "../../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../../src/tokenized/Router.sol";
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";

contract RouterTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;
    FXPool public ysPool;
    FXPoolUSDC public usdcPool;
    Router public router;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");

    int256 public constant FORWARD_RATE = 1400e18;
    uint256 public constant POOL_LIFETIME = 90 days;

    uint256 public maturityTime;
    bytes32 public seriesId;
    IMaturityTokenFactory.Series public series;

    function setUp() public {
        maturityTime = block.timestamp + POOL_LIFETIME;

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

        series = factory.getSeries(seriesId);

        // Deploy YieldSpace pool
        ysPool = FXPoolDeployer.deploy(series.fToken, series.sfToken, maturityTime, POOL_LIFETIME, 25e16, 5e16, 3e15);

        // Deploy USDC pool
        usdcPool = new FXPoolUSDC(series.fToken, address(usdc), admin);

        // Deploy router
        router = new Router(address(factory), address(usdc));

        vm.stopPrank();

        // Fund and approve
        usdc.mint(alice, 10_000_000e6);
        usdc.mint(bob, 10_000_000e6);

        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(alice);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(router), type(uint256).max);

        // Seed pools with liquidity
        _seedYSPool(5000e18);
        _seedUSDCPool(5000e18, 5000e6);
    }

    // ─── Constructor ─────────────────────────────────────────────────

    function test_Constructor_RevertsWhen_ZeroFactory() public {
        vm.expectRevert();
        new Router(address(0), address(usdc));
    }

    function test_Constructor_RevertsWhen_ZeroUSDC() public {
        vm.expectRevert();
        new Router(address(factory), address(0));
    }

    // ─── mintAndSwap ─────────────────────────────────────────────────

    function test_MintAndSwap_WantFToken() public {
        vm.prank(alice);
        uint256 amountOut = router.mintAndSwap(seriesId, 200e6, address(ysPool), true, 0, block.timestamp + 1 hours);

        assertGt(amountOut, 0);
        assertEq(MaturityToken(series.fToken).balanceOf(alice), amountOut);
        assertEq(MaturityToken(series.sfToken).balanceOf(alice), 0);
    }

    function test_MintAndSwap_WantSFToken() public {
        vm.prank(alice);
        uint256 amountOut = router.mintAndSwap(seriesId, 200e6, address(ysPool), false, 0, block.timestamp + 1 hours);

        assertGt(amountOut, 0);
        assertEq(MaturityToken(series.sfToken).balanceOf(alice), amountOut);
    }

    function test_MintAndSwap_RevertsWhen_SlippageExceeded() public {
        vm.prank(alice);
        vm.expectRevert();
        router.mintAndSwap(seriesId, 200e6, address(ysPool), true, type(uint256).max, block.timestamp + 1 hours);
    }

    function test_MintAndSwap_RevertsWhen_DeadlineExpired() public {
        vm.prank(alice);
        vm.expectRevert("Transaction expired");
        router.mintAndSwap(seriesId, 200e6, address(ysPool), true, 0, block.timestamp - 1);
    }

    function test_MintAndSwap_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        router.mintAndSwap(seriesId, 0, address(ysPool), true, 0, block.timestamp + 1 hours);
    }

    function test_MintAndSwap_RevertsWhen_ZeroPool() public {
        vm.prank(alice);
        vm.expectRevert();
        router.mintAndSwap(seriesId, 200e6, address(0), true, 0, block.timestamp + 1 hours);
    }

    // ─── mintAndAddLiquidity ─────────────────────────────────────────

    function test_MintAndAddLiquidity_Success() public {
        vm.prank(alice);
        uint256 lpTokens = router.mintAndAddLiquidity(seriesId, 200e6, address(ysPool), 0, block.timestamp + 1 hours);

        assertGt(lpTokens, 0);
        // LP tokens are minted to the router (router is the caller to pool)
        // The router doesn't transfer LP tokens back — they stay in pool contract
        // Check that the router received LP tokens
        assertEq(ysPool.balanceOf(address(router)), lpTokens);
    }

    function test_MintAndAddLiquidity_RevertsWhen_DeadlineExpired() public {
        vm.prank(alice);
        vm.expectRevert("Transaction expired");
        router.mintAndAddLiquidity(seriesId, 200e6, address(ysPool), 0, block.timestamp - 1);
    }

    function test_MintAndAddLiquidity_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        router.mintAndAddLiquidity(seriesId, 0, address(ysPool), 0, block.timestamp + 1 hours);
    }

    // ─── sellToken ───────────────────────────────────────────────────

    function test_SellToken_FToken() public {
        // Alice gets fTokens first
        vm.prank(alice);
        factory.mint(seriesId, 100e18);

        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(router), type(uint256).max);

        vm.prank(alice);
        uint256 usdcOut = router.sellToken(seriesId, 100e18, address(usdcPool), true, 0, block.timestamp + 1 hours);

        assertGt(usdcOut, 0);
    }

    function test_SellToken_RevertsWhen_SlippageExceeded() public {
        vm.prank(alice);
        factory.mint(seriesId, 100e18);
        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(router), type(uint256).max);

        vm.prank(alice);
        vm.expectRevert();
        router.sellToken(seriesId, 100e18, address(usdcPool), true, type(uint256).max, block.timestamp + 1 hours);
    }

    // ─── sellTokenMultiHop ───────────────────────────────────────────

    function test_SellTokenMultiHop_FToken_Direct() public {
        vm.prank(alice);
        factory.mint(seriesId, 100e18);
        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(router), type(uint256).max);

        vm.prank(alice);
        uint256 usdcOut = router.sellTokenMultiHop(seriesId, 100e18, address(usdcPool), address(ysPool), true, 0, block.timestamp + 1 hours);

        assertGt(usdcOut, 0);
    }

    function test_SellTokenMultiHop_SFToken_TwoHop() public {
        vm.prank(alice);
        factory.mint(seriesId, 100e18);
        vm.prank(alice);
        MaturityToken(series.sfToken).approve(address(router), type(uint256).max);

        vm.prank(alice);
        uint256 usdcOut = router.sellTokenMultiHop(seriesId, 50e18, address(usdcPool), address(ysPool), false, 0, block.timestamp + 1 hours);

        assertGt(usdcOut, 0);
    }

    // ─── buyToken ────────────────────────────────────────────────────

    function test_BuyToken_PathA_USDCPool() public {
        vm.prank(alice);
        uint256 amountOut = router.buyToken(
            seriesId, 100e6, address(usdcPool), address(ysPool), true, 0, block.timestamp + 1 hours
        );

        assertGt(amountOut, 0);
        assertGt(MaturityToken(series.fToken).balanceOf(alice), 0);
    }

    function test_BuyToken_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        router.buyToken(seriesId, 0, address(usdcPool), address(ysPool), true, 0, block.timestamp + 1 hours);
    }

    // ─── redeemAndRoll ───────────────────────────────────────────────

    function test_RedeemAndRoll_Success() public {
        // Setup: Alice mints, settle old series
        vm.prank(alice);
        factory.mint(seriesId, 500e18);

        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1350e18);
        factory.settleSeries(seriesId, new bytes[](0));

        // Create new series
        uint256 newMaturity = maturityTime + 90 days;
        vm.prank(admin);
        bytes32 newSeriesId = factory.createSeries(USD_KRW_MARKET, newMaturity, 1350e18);

        // Deploy new pool
        IMaturityTokenFactory.Series memory newS = factory.getSeries(newSeriesId);
        FXPool newPool = FXPoolDeployer.deploy(newS.fToken, newS.sfToken, newMaturity, 90 days, 25e16, 5e16, 3e15);

        // Seed new pool with liquidity
        vm.prank(bob);
        factory.mint(newSeriesId, 5000e18);
        vm.prank(bob);
        MaturityToken(newS.fToken).approve(address(newPool), type(uint256).max);
        vm.prank(bob);
        MaturityToken(newS.sfToken).approve(address(newPool), type(uint256).max);
        vm.prank(bob);
        newPool.addLiquidity(5000e18, 5000e18, 0);

        // Alice rolls fToken
        uint256 aliceFTokens = MaturityToken(series.fToken).balanceOf(alice);
        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(router), type(uint256).max);

        vm.prank(alice);
        uint256 newTokens = router.redeemAndRoll(
            seriesId, newSeriesId, address(newPool), aliceFTokens, true, 0, block.timestamp + 1 hours
        );

        assertGt(newTokens, 0);
        assertEq(MaturityToken(series.fToken).balanceOf(alice), 0, "Old tokens burned");
        assertEq(MaturityToken(newS.fToken).balanceOf(alice), newTokens, "New tokens received");
    }

    function test_RedeemAndRoll_RevertsWhen_OldSeriesNotSettled() public {
        vm.prank(alice);
        factory.mint(seriesId, 100e18);
        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(router), type(uint256).max);

        // Create new series without settling old one
        vm.prank(admin);
        bytes32 newSeriesId = factory.createSeries(USD_KRW_MARKET, maturityTime + 90 days, 1400e18);

        // Should revert because old series not settled → _redeemToken fails → tokens returned → ZeroAmount
        vm.prank(alice);
        vm.expectRevert();
        router.redeemAndRoll(
            seriesId, newSeriesId, address(ysPool), 100e18, true, 0, block.timestamp + 1 hours
        );
    }

    // ─── removeLiquidityAndRedeem ────────────────────────────────────

    function test_RemoveLiquidityAndRedeem_Success() public {
        // Alice adds liquidity directly (not via router, so she owns the LP tokens)
        vm.prank(alice);
        factory.mint(seriesId, 1000e18);

        vm.prank(alice);
        MaturityToken(series.fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(series.sfToken).approve(address(ysPool), type(uint256).max);
        vm.prank(alice);
        uint256 lpTokens = ysPool.addLiquidity(1000e18, 1000e18, 0);

        // Settle the series
        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);
        factory.settleSeries(seriesId, new bytes[](0));

        // Remove liquidity and redeem
        vm.prank(alice);
        ysPool.approve(address(router), type(uint256).max);

        vm.prank(alice);
        uint256 usdcReceived = router.removeLiquidityAndRedeem(address(ysPool), lpTokens, seriesId, block.timestamp + 1 hours);

        assertGt(usdcReceived, 0);
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    function _seedYSPool(uint256 tokenAmount) internal {
        vm.prank(bob);
        factory.mint(seriesId, tokenAmount);

        vm.prank(bob);
        MaturityToken(series.fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        MaturityToken(series.sfToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        ysPool.addLiquidity(tokenAmount, tokenAmount, 0);
    }

    function _seedUSDCPool(uint256 fTokenAmount, uint256 usdcAmount) internal {
        vm.prank(bob);
        factory.mint(seriesId, fTokenAmount);

        vm.prank(bob);
        MaturityToken(series.fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(usdcPool), type(uint256).max);
        vm.prank(bob);
        usdcPool.addLiquidity(fTokenAmount, usdcAmount, 0);
    }
}
