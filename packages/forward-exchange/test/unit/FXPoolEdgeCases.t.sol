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
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";

/// @title FXPoolEdgeCasesTest
/// @notice Edge case tests for FXPool MIN_RESERVE, MAX_TRADE_RATIO, and FXPoolUSDC decimals
contract FXPoolEdgeCasesTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;
    FXPool public ysPool;
    FXPoolUSDC public usdcPool;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");

    int256 public constant FORWARD_RATE = 1400e18;
    uint256 public constant POOL_LIFETIME = 90 days;

    uint256 public maturityTime;
    bytes32 public seriesId;
    address public fToken;
    address public sfToken;

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

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        fToken = s.fToken;
        sfToken = s.sfToken;

        ysPool = FXPoolDeployer.deploy(fToken, sfToken, maturityTime, POOL_LIFETIME, 25e16, 5e16, 3e15);
        usdcPool = new FXPoolUSDC(fToken, address(usdc), admin);

        vm.stopPrank();

        // Fund users
        usdc.mint(alice, 100_000_000e6);
        usdc.mint(bob, 100_000_000e6);

        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(factory), type(uint256).max);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FXPool (Yield Space) Edge Cases
    // ═══════════════════════════════════════════════════════════════════

    // ─── MAX_TRADE_RATIO (20% of reserve) ────────────────────────────

    function test_YSPool_TradeTooLarge_Reverts() public {
        _seedYSPool(10_000e18);

        // MAX_TRADE_RATIO = 2e17 = 20%
        // Reserve = 10_000e18, max trade = 2000e18
        vm.prank(alice);
        factory.mint(seriesId, 3000e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);

        // Trade 2001e18 should fail (>20% of 10000)
        vm.prank(alice);
        vm.expectRevert();
        ysPool.swap(fToken, 2001e18, 0);
    }

    function test_YSPool_TradeAtMaxRatio_Succeeds() public {
        _seedYSPool(10_000e18);

        vm.prank(alice);
        factory.mint(seriesId, 2000e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);

        // Trade exactly 2000e18 = 20% of 10000, should succeed
        vm.prank(alice);
        uint256 out = ysPool.swap(fToken, 2000e18, 0);
        assertGt(out, 0);
    }

    // ─── MIN_RESERVE boundary ────────────────────────────────────────

    function test_YSPool_MinReserveBreach_Reverts() public {
        // Very small pool: reserves just above MIN_RESERVE (1e15)
        // With reserves of 1.1e15, MAX_TRADE_RATIO allows up to 0.2 * 1.1e15 = 2.2e14
        // That swap drains enough output to push reserve below MIN_RESERVE
        _seedYSPoolExact(11e14, 11e14);

        vm.prank(alice);
        factory.mint(seriesId, 3e14);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);

        // Trade at MAX_TRADE_RATIO (20%): 2.2e14 of 1.1e15
        // Output ≈ 1.83e14, leaving reserve ≈ 9.17e14 < MIN_RESERVE (1e15)
        vm.prank(alice);
        vm.expectRevert(); // MinimumReserveBreach
        ysPool.swap(fToken, 22e13, 0);
    }

    // ─── Consecutive swaps maintain invariant ────────────────────────

    function test_YSPool_ConsecutiveSwaps_InvariantMaintained() public {
        _seedYSPool(10_000e18);

        vm.prank(alice);
        factory.mint(seriesId, 5000e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(sfToken).approve(address(ysPool), type(uint256).max);

        uint256 kBefore = ysPool.k();

        // Do 5 swaps back and forth
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(alice);
            ysPool.swap(fToken, 100e18, 0);
            vm.prank(alice);
            ysPool.swap(sfToken, 100e18, 0);
        }

        uint256 kAfter = ysPool.k();

        // k should only increase (fees add to reserves)
        assertGe(kAfter, kBefore, "Invariant k should never decrease");
    }

    // ─── quoteSwap matches actual swap ───────────────────────────────

    function test_YSPool_QuoteMatchesActual() public {
        _seedYSPool(10_000e18);

        (uint256 quoted,) = ysPool.quoteSwap(fToken, 500e18);

        vm.prank(alice);
        factory.mint(seriesId, 500e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(alice);
        uint256 actual = ysPool.swap(fToken, 500e18, 0);

        assertEq(actual, quoted, "Quote must match actual swap output");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FXPoolUSDC (Constant Product) Edge Cases
    // ═══════════════════════════════════════════════════════════════════

    // ─── Decimal handling: fToken(18d) → USDC(6d) ────────────────────

    function test_USDCPool_SwapFTokenForUSDC_DecimalCorrect() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        vm.prank(alice);
        factory.mint(seriesId, 500e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);

        vm.prank(alice);
        uint256 usdcOut = usdcPool.swap(fToken, 500e18, 0);

        // Should get ~476 USDC for 500 fToken (constant product with fee)
        assertGt(usdcOut, 0);
        assertTrue(usdcOut < 500e6, "Should be less than 500 USDC due to price impact");
        assertTrue(usdcOut > 400e6, "Should be reasonable amount");
    }

    // ─── USDC(6d) → fToken(18d) ─────────────────────────────────────

    function test_USDCPool_SwapUSDCForFToken_DecimalCorrect() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        vm.prank(alice);
        usdc.approve(address(usdcPool), type(uint256).max);

        vm.prank(alice);
        uint256 fTokenOut = usdcPool.swap(address(usdc), 500e6, 0);

        // Should get ~476 fToken(18d) for 500 USDC
        assertGt(fTokenOut, 0);
        assertTrue(fTokenOut < 500e18, "Should be less than 500 fToken due to price impact");
        assertTrue(fTokenOut > 400e18, "Should be reasonable amount");
    }

    // ─── Very small USDC swap ────────────────────────────────────────

    function test_USDCPool_SmallSwap_NoZeroOutput() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        vm.prank(alice);
        usdc.approve(address(usdcPool), type(uint256).max);

        // Swap 1 USDC (1e6)
        vm.prank(alice);
        uint256 fTokenOut = usdcPool.swap(address(usdc), 1e6, 0);

        assertGt(fTokenOut, 0, "Even small swaps should produce output");
    }

    // ─── LP tokens with different decimals ───────────────────────────

    function test_USDCPool_AddLiquidity_LPTokensCorrect() public {
        vm.prank(bob);
        factory.mint(seriesId, 1000e18);

        vm.prank(bob);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(usdcPool), type(uint256).max);

        // First deposit: lpTokens = sqrt(1000e18 * 1000e6 * 1e12) = sqrt(1e42) = 1e21
        vm.prank(bob);
        uint256 lpTokens = usdcPool.addLiquidity(1000e18, 1000e6, 0);

        assertGt(lpTokens, 0);
        // sqrt(1000e18 * 1000e6 * 1e12) - 1000 (MIN_LIQUIDITY)
        // = sqrt(1e42) - 1000 = 1e21 - 1000
        assertApproxEqAbs(lpTokens, 1e21 - 1000, 1);
    }

    // ─── Constant product invariant after swaps ──────────────────────

    function test_USDCPool_InvariantAfterSwap() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        (uint256 resFBefore, uint256 resUBefore) = usdcPool.getReserves();
        uint256 kBefore = resFBefore * resUBefore;

        // Perform swap
        vm.prank(alice);
        factory.mint(seriesId, 200e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(alice);
        usdcPool.swap(fToken, 200e18, 0);

        (uint256 resFAfter, uint256 resUAfter) = usdcPool.getReserves();
        uint256 kAfter = resFAfter * resUAfter;

        // k should increase (fees add to reserves)
        assertGe(kAfter, kBefore, "k must not decrease after swap");
    }

    // ─── Fee accumulation with different decimals ─────────────────────

    function test_USDCPool_FeeAccumulation_BothDecimals() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        // Swap fToken → USDC (generates fToken fees)
        vm.prank(alice);
        factory.mint(seriesId, 500e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(alice);
        usdcPool.swap(fToken, 500e18, 0);

        assertGt(usdcPool.protocolFeesF(), 0, "Should accumulate fToken fees");

        // Swap USDC → fToken (generates USDC fees)
        vm.prank(alice);
        usdc.approve(address(usdcPool), type(uint256).max);
        vm.prank(alice);
        usdcPool.swap(address(usdc), 500e6, 0);

        assertGt(usdcPool.protocolFeesUSDC(), 0, "Should accumulate USDC fees");
    }

    // ─── Collect protocol fees ───────────────────────────────────────

    function test_USDCPool_CollectFees_TransfersCorrectly() public {
        _seedUSDCPool(10_000e18, 10_000e6);

        // Generate fees
        vm.prank(alice);
        factory.mint(seriesId, 1000e18);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(alice);
        usdcPool.swap(fToken, 1000e18, 0);

        uint256 feesF = usdcPool.protocolFeesF();
        assertGt(feesF, 0);

        uint256 recipientBefore = MaturityToken(fToken).balanceOf(admin);
        usdcPool.collectProtocolFees();

        assertEq(usdcPool.protocolFeesF(), 0, "Fees cleared");
        assertEq(MaturityToken(fToken).balanceOf(admin), recipientBefore + feesF, "Fees transferred");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Fuzz Tests
    // ═══════════════════════════════════════════════════════════════════

    function testFuzz_USDCPool_SwapRoundTrip(uint256 usdcAmount) public {
        usdcAmount = bound(usdcAmount, 10e6, 1000e6);

        _seedUSDCPool(50_000e18, 50_000e6);

        vm.prank(alice);
        usdc.approve(address(usdcPool), type(uint256).max);
        vm.prank(alice);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);

        // USDC → fToken
        vm.prank(alice);
        uint256 fTokenOut = usdcPool.swap(address(usdc), usdcAmount, 0);

        // fToken → USDC
        vm.prank(alice);
        uint256 usdcBack = usdcPool.swap(fToken, fTokenOut, 0);

        // Should get less back due to fees (2x 0.3%)
        assertTrue(usdcBack < usdcAmount, "Round trip should lose to fees");
        assertTrue(usdcBack > usdcAmount * 99 / 100, "Round trip loss should be reasonable");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════

    function _seedYSPool(uint256 amount) internal {
        vm.prank(bob);
        factory.mint(seriesId, amount);
        vm.prank(bob);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        MaturityToken(sfToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        ysPool.addLiquidity(amount, amount, 0);
    }

    function _seedYSPoolExact(uint256 amountX, uint256 amountY) internal {
        uint256 needed = amountX > amountY ? amountX : amountY;
        vm.prank(bob);
        factory.mint(seriesId, needed);
        vm.prank(bob);
        MaturityToken(fToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        MaturityToken(sfToken).approve(address(ysPool), type(uint256).max);
        vm.prank(bob);
        ysPool.addLiquidity(amountX, amountY, 0);
    }

    function _seedUSDCPool(uint256 fTokenAmount, uint256 usdcAmount) internal {
        vm.prank(bob);
        factory.mint(seriesId, fTokenAmount);
        vm.prank(bob);
        MaturityToken(fToken).approve(address(usdcPool), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(usdcPool), type(uint256).max);
        vm.prank(bob);
        usdcPool.addLiquidity(fTokenAmount, usdcAmount, 0);
    }
}
