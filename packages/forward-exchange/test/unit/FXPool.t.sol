// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {FXPool} from "../../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../../src/tokenized/FXPoolDeployer.sol";
import {IFXPool} from "../../src/tokenized/interfaces/IFXPool.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract FXPoolTest is Test {
    FXPool public pool;
    ERC20Mock public fToken;
    ERC20Mock public sfToken;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public treasury = makeAddr("treasury");

    uint256 constant WAD = 1e18;
    uint256 constant T_MAX = 25e16;  // 0.25
    uint256 constant T_MIN = 5e16;   // 0.05
    uint256 constant FEE_MAX = 3e15; // 0.3%
    uint256 constant POOL_LIFETIME = 90 days;

    function setUp() public {
        fToken = new ERC20Mock("fKRW", "fKRW", 18);
        sfToken = new ERC20Mock("sfKRW", "sfKRW", 18);

        uint256 maturity_ = block.timestamp + POOL_LIFETIME;

        pool = FXPoolDeployer.deploy(
            address(fToken),
            address(sfToken),
            maturity_,
            POOL_LIFETIME,
            T_MAX,
            T_MIN,
            FEE_MAX
        );

        // Fund users
        fToken.mint(alice, 100_000e18);
        sfToken.mint(alice, 100_000e18);
        fToken.mint(bob, 100_000e18);
        sfToken.mint(bob, 100_000e18);

        // Approve pool
        vm.prank(alice);
        fToken.approve(address(pool), type(uint256).max);
        vm.prank(alice);
        sfToken.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        fToken.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        sfToken.approve(address(pool), type(uint256).max);
    }

    // ─── Initialize ───

    function test_Initialize_RevertsWhen_AlreadyInitialized() public {
        vm.expectRevert();
        pool.initialize(address(fToken), address(sfToken), 0, 0, 0, 0, 0);
    }

    // ─── Add Liquidity ───

    function test_AddLiquidity_FirstDeposit() public {
        vm.prank(alice);
        uint256 lp = pool.addLiquidity(1000e18, 1000e18, 0);

        assertGt(lp, 0);
        assertEq(pool.balanceOf(alice), lp);
        (uint256 rx, uint256 ry) = pool.getReserves();
        assertEq(rx, 1000e18);
        assertEq(ry, 1000e18);
        assertGt(pool.getInvariantK(), 0);
    }

    function test_AddLiquidity_Proportional() public {
        // Alice adds initial liquidity
        vm.prank(alice);
        pool.addLiquidity(1000e18, 1000e18, 0);
        uint256 aliceLp = pool.balanceOf(alice);

        // Bob adds proportional liquidity (same ratio)
        vm.prank(bob);
        uint256 bobLp = pool.addLiquidity(500e18, 500e18, 0);

        // Bob should get ~50% of Alice's LP tokens
        assertApproxEqRel(bobLp, aliceLp / 2, 1e16);
    }

    function test_AddLiquidity_RevertsWhen_BadRatio() public {
        vm.prank(alice);
        pool.addLiquidity(1000e18, 1000e18, 0);

        vm.prank(bob);
        vm.expectRevert(IFXPool.InvalidRatio.selector);
        pool.addLiquidity(1000e18, 500e18, 0); // 2:1 ratio, pool is 1:1
    }

    // ─── Remove Liquidity ───

    function test_RemoveLiquidity_Full() public {
        vm.prank(alice);
        uint256 lp = pool.addLiquidity(1000e18, 1000e18, 0);

        uint256 fBefore = fToken.balanceOf(alice);
        uint256 sfBefore = sfToken.balanceOf(alice);

        vm.prank(alice);
        (uint256 amountX, uint256 amountY) = pool.removeLiquidity(lp, 0, 0);

        // First LP provider gets back slightly less than 1000e18 due to minimum liquidity
        // lock (1000 wei burned to address(1) on first deposit)
        assertApproxEqAbs(amountX, 1000e18, 1000);
        assertApproxEqAbs(amountY, 1000e18, 1000);
        assertApproxEqAbs(fToken.balanceOf(alice) - fBefore, 1000e18, 1000);
        assertApproxEqAbs(sfToken.balanceOf(alice) - sfBefore, 1000e18, 1000);
    }

    function test_RemoveLiquidity_Partial() public {
        vm.prank(alice);
        uint256 lp = pool.addLiquidity(1000e18, 1000e18, 0);

        vm.prank(alice);
        (uint256 amountX, uint256 amountY) = pool.removeLiquidity(lp / 2, 0, 0);

        // Should get ~50% of reserves
        assertApproxEqRel(amountX, 500e18, 1e15);
        assertApproxEqRel(amountY, 500e18, 1e15);
    }

    // ─── Swap ───

    function test_Swap_FTokenIn() public {
        // Setup liquidity
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        uint256 amountIn = 100e18; // 1% of pool

        vm.prank(bob);
        uint256 amountOut = pool.swap(address(fToken), amountIn, 0);

        // Should get close to 1:1 minus fee and slippage
        assertGt(amountOut, 0);
        assertLt(amountOut, amountIn); // Less due to fees + slippage
    }

    function test_Swap_SFTokenIn() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        vm.prank(bob);
        uint256 amountOut = pool.swap(address(sfToken), 100e18, 0);

        assertGt(amountOut, 0);
    }

    function test_Swap_SlippageProtection() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        // Set unreasonably high minAmountOut
        vm.prank(bob);
        vm.expectRevert();
        pool.swap(address(fToken), 100e18, 100e18);
    }

    function test_Swap_InvalidToken() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        vm.prank(bob);
        vm.expectRevert(IFXPool.InvalidToken.selector);
        pool.swap(address(0x1234), 100e18, 0);
    }

    function test_Swap_TradeTooLarge() public {
        vm.prank(alice);
        pool.addLiquidity(1000e18, 1000e18, 0);

        // Try to swap more than 20% of reserves
        vm.prank(bob);
        vm.expectRevert(IFXPool.TradeTooLarge.selector);
        pool.swap(address(fToken), 250e18, 0);
    }

    function test_Swap_FeeDistribution() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        vm.prank(bob);
        pool.swap(address(fToken), 100e18, 0);

        // Protocol fees should have accumulated
        uint256 protoFeesX = pool.protocolFeesX();
        assertGt(protoFeesX, 0);

        // Reserves should reflect LP fee portion
        (uint256 rx, uint256 ry) = pool.getReserves();
        assertGt(rx, 10_000e18); // Increased by input + LP fee
        assertLt(ry, 10_000e18); // Decreased by output
    }

    function test_Swap_DynamicFee_SkewPenalty() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        // First swap to create skew
        vm.prank(bob);
        pool.swap(address(fToken), 100e18, 0);

        // Quote another swap in same direction (should have higher fee)
        (, uint256 fee1) = pool.quoteSwap(address(fToken), 100e18);

        // Quote a rebalancing swap (should have lower fee)
        (, uint256 fee2) = pool.quoteSwap(address(sfToken), 100e18);

        // Drain direction fee > rebalancing fee
        assertGt(fee1, fee2);
    }

    function test_Swap_TDecaysOverTime() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        uint256 t0 = pool.getCurrentT();

        // Advance 45 days
        vm.warp(block.timestamp + 45 days);

        uint256 t1 = pool.getCurrentT();
        assertLt(t1, t0); // t should decrease as time passes

        // Advance to near maturity
        vm.warp(block.timestamp + 44 days);

        uint256 t2 = pool.getCurrentT();
        assertLt(t2, t1);
        assertGe(t2, T_MIN); // Never below t_min
    }

    function test_QuoteSwap_MatchesActualSwap() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        (uint256 quotedOut, uint256 quotedFee) = pool.quoteSwap(address(fToken), 50e18);

        vm.prank(bob);
        uint256 actualOut = pool.swap(address(fToken), 50e18, 0);

        // Quoted and actual should match
        assertEq(quotedOut, actualOut);
    }

    // ─── Edge Cases ───

    function test_Swap_AtMaturity_TEqualsMin() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        // Warp to maturity
        vm.warp(block.timestamp + POOL_LIFETIME);

        uint256 t = pool.getCurrentT();
        assertEq(t, T_MIN);

        // Swap should still work at t_min
        vm.prank(bob);
        uint256 out = pool.swap(address(fToken), 100e18, 0);
        assertGt(out, 0);
    }

    function test_GetSkew_AfterSwap() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        assertEq(pool.getSkew(), 0); // Balanced initially

        vm.prank(bob);
        pool.swap(address(fToken), 100e18, 0);

        assertGt(pool.getSkew(), 0); // Now skewed
    }

    function test_CollectProtocolFees() public {
        vm.prank(alice);
        pool.addLiquidity(10_000e18, 10_000e18, 0);

        vm.prank(bob);
        pool.swap(address(fToken), 100e18, 0);

        uint256 protoFees = pool.protocolFeesX();
        assertGt(protoFees, 0);

        address recipient = pool.protocolFeeRecipient();
        uint256 balBefore = fToken.balanceOf(recipient);

        pool.collectProtocolFees();

        assertEq(pool.protocolFeesX(), 0);
        assertGt(fToken.balanceOf(recipient) - balBefore, 0);
    }
}
