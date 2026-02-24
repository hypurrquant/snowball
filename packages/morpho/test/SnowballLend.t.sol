// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {SnowballLend} from "../src/SnowballLend.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";

/// @dev Minimal IRM for testing — returns a fixed borrow rate
contract MockIRM {
    uint256 public constant RATE = 50000000000000000 / uint256(365 days); // ~5% APY per second

    function borrowRate(bytes32, uint256, uint256, uint256) external pure returns (uint256) {
        return RATE;
    }
}

contract SnowballLendTest is Test {
    SnowballLend public lend;
    MockERC20 public loanToken;
    MockERC20 public collToken;
    MockOracle public oracle;
    MockIRM public irm;

    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    bytes32 marketId;
    uint256 constant LLTV = 0.8e18; // 80%
    uint256 constant ORACLE_PRICE = 1e36; // 1:1 price

    function setUp() public {
        // Deploy core
        lend = new SnowballLend(owner);
        loanToken = new MockERC20("Loan Token", "LOAN", 18);
        collToken = new MockERC20("Collateral Token", "COLL", 18);
        oracle = new MockOracle(ORACLE_PRICE);
        irm = new MockIRM();

        // Enable IRM and LLTV
        lend.enableIrm(address(irm));
        lend.enableLltv(LLTV);

        // Create market
        SnowballLend.MarketParams memory params = SnowballLend.MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collToken),
            oracle: address(oracle),
            irm: address(irm),
            lltv: LLTV
        });
        marketId = lend.createMarket(params);

        // Fund users
        loanToken.mint(alice, 10_000e18);
        loanToken.mint(bob, 10_000e18);
        collToken.mint(alice, 10_000e18);
        collToken.mint(bob, 10_000e18);

        // Approvals
        vm.startPrank(alice);
        loanToken.approve(address(lend), type(uint256).max);
        collToken.approve(address(lend), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        loanToken.approve(address(lend), type(uint256).max);
        collToken.approve(address(lend), type(uint256).max);
        vm.stopPrank();
    }

    // ─── Admin Tests ───

    function test_setOwner() public {
        lend.setOwner(alice);
        assertEq(lend.owner(), alice);
    }

    function test_setOwner_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("SnowballLend: not owner");
        lend.setOwner(alice);
    }

    function test_setFee() public {
        lend.setFeeRecipient(owner);
        lend.setFee(marketId, 0.1e18); // 10%
        (, , , , , uint128 fee) = lend.market(marketId);
        assertEq(fee, 0.1e18);
    }

    function test_setFee_revertExceedsMax() public {
        vm.expectRevert("SnowballLend: fee > MAX_FEE");
        lend.setFee(marketId, 0.3e18); // 30% > 25% max
    }

    function test_enableLltv_revertAboveOne() public {
        vm.expectRevert("SnowballLend: LLTV >= 1");
        lend.enableLltv(1e18);
    }

    // ─── Authorization Tests ───

    function test_setAuthorization() public {
        vm.prank(alice);
        lend.setAuthorization(bob, true);
        assertTrue(lend.isAuthorized(alice, bob));
    }

    // ─── Supply Tests ───

    function test_supply_withAssets() public {
        vm.prank(alice);
        (uint256 returnedAssets, uint256 returnedShares) = lend.supply(marketId, 1000e18, 0, alice, "");

        assertEq(returnedAssets, 1000e18);
        assertGt(returnedShares, 0);
        assertEq(lend.supplyShares(marketId, alice), returnedShares);
        assertEq(loanToken.balanceOf(address(lend)), 1000e18);
    }

    function test_supply_withShares() public {
        // First supply to establish share ratio
        vm.prank(alice);
        lend.supply(marketId, 1000e18, 0, alice, "");

        // Supply by specifying shares
        vm.prank(bob);
        (, uint256 shares) = lend.supply(marketId, 500e18, 0, bob, "");

        vm.prank(bob);
        (uint256 returnedAssets, uint256 returnedShares) = lend.supply(marketId, 0, shares, bob, "");

        assertGt(returnedAssets, 0);
        assertEq(returnedShares, shares);
    }

    function test_supply_revertBothZero() public {
        vm.prank(alice);
        vm.expectRevert("SnowballLend: exactly one of assets/shares must be zero");
        lend.supply(marketId, 0, 0, alice, "");
    }

    function test_supply_revertBothNonZero() public {
        vm.prank(alice);
        vm.expectRevert("SnowballLend: exactly one of assets/shares must be zero");
        lend.supply(marketId, 100e18, 100e18, alice, "");
    }

    function test_supply_onBehalf() public {
        // Alice supplies on behalf of Bob (no auth needed for supply)
        vm.prank(alice);
        lend.supply(marketId, 500e18, 0, bob, "");

        assertGt(lend.supplyShares(marketId, bob), 0);
        assertEq(lend.supplyShares(marketId, alice), 0);
    }

    // ─── Withdraw Tests ───

    function test_withdraw_withAssets() public {
        vm.prank(alice);
        lend.supply(marketId, 1000e18, 0, alice, "");

        uint256 balBefore = loanToken.balanceOf(alice);
        vm.prank(alice);
        (uint256 returnedAssets, uint256 returnedShares) = lend.withdraw(marketId, 500e18, 0, alice, alice);

        assertEq(returnedAssets, 500e18);
        assertGt(returnedShares, 0);
        assertEq(loanToken.balanceOf(alice) - balBefore, 500e18);
    }

    function test_withdraw_all() public {
        vm.prank(alice);
        (, uint256 shares) = lend.supply(marketId, 1000e18, 0, alice, "");

        vm.prank(alice);
        lend.withdraw(marketId, 0, shares, alice, alice);

        assertEq(lend.supplyShares(marketId, alice), 0);
    }

    function test_withdraw_revertNotAuthorized() public {
        vm.prank(alice);
        lend.supply(marketId, 1000e18, 0, alice, "");

        vm.prank(bob);
        vm.expectRevert("SnowballLend: not authorized");
        lend.withdraw(marketId, 500e18, 0, alice, bob);
    }

    function test_withdraw_authorized() public {
        vm.prank(alice);
        lend.supply(marketId, 1000e18, 0, alice, "");

        // Alice authorizes Bob
        vm.prank(alice);
        lend.setAuthorization(bob, true);

        // Bob withdraws on behalf of Alice
        vm.prank(bob);
        lend.withdraw(marketId, 500e18, 0, alice, bob);

        assertEq(loanToken.balanceOf(bob), 10_500e18);
    }

    function test_withdraw_revertInsufficientLiquidity() public {
        // Alice supplies 1000
        vm.prank(alice);
        lend.supply(marketId, 1000e18, 0, alice, "");

        // Bob supplies collateral and borrows 800
        vm.prank(bob);
        lend.supplyCollateral(marketId, 2000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 800e18, 0, bob, bob);

        // Alice tries to withdraw all 1000 — only 200 available
        vm.prank(alice);
        vm.expectRevert("SnowballLend: insufficient liquidity");
        lend.withdraw(marketId, 1000e18, 0, alice, alice);
    }

    // ─── SupplyCollateral Tests ───

    function test_supplyCollateral() public {
        vm.prank(alice);
        lend.supplyCollateral(marketId, 500e18, alice, "");

        assertEq(lend.collateral(marketId, alice), 500e18);
        assertEq(collToken.balanceOf(address(lend)), 500e18);
    }

    function test_supplyCollateral_revertZero() public {
        vm.prank(alice);
        vm.expectRevert("SnowballLend: zero assets");
        lend.supplyCollateral(marketId, 0, alice, "");
    }

    // ─── Borrow Tests ───

    function test_borrow() public {
        // Alice supplies liquidity
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        // Bob supplies collateral then borrows
        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");

        uint256 balBefore = loanToken.balanceOf(bob);
        vm.prank(bob);
        (uint256 returnedAssets, uint256 returnedShares) = lend.borrow(marketId, 500e18, 0, bob, bob);

        assertEq(returnedAssets, 500e18);
        assertGt(returnedShares, 0);
        assertEq(loanToken.balanceOf(bob) - balBefore, 500e18);
        assertEq(lend.borrowShares(marketId, bob), returnedShares);
    }

    function test_borrow_revertInsufficientCollateral() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        // Bob supplies 100 collateral, tries to borrow 100 (LLTV 80% → max 80)
        vm.prank(bob);
        lend.supplyCollateral(marketId, 100e18, bob, "");

        vm.prank(bob);
        vm.expectRevert("SnowballLend: insufficient collateral");
        lend.borrow(marketId, 100e18, 0, bob, bob);
    }

    function test_borrow_maxLltv() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        // Bob supplies 1000, borrows exactly 800 (80% LLTV) — should succeed
        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");

        vm.prank(bob);
        lend.borrow(marketId, 800e18, 0, bob, bob);

        assertGt(lend.borrowShares(marketId, bob), 0);
    }

    function test_borrow_revertNotAuthorized() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(alice);
        lend.supplyCollateral(marketId, 1000e18, alice, "");

        vm.prank(bob);
        vm.expectRevert("SnowballLend: not authorized");
        lend.borrow(marketId, 100e18, 0, alice, bob);
    }

    // ─── Repay Tests ───

    function test_repay() public {
        // Setup: supply + borrow
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        (, uint256 borrowedShares) = lend.borrow(marketId, 500e18, 0, bob, bob);

        // Repay all
        vm.prank(bob);
        lend.repay(marketId, 0, borrowedShares, bob, "");

        assertEq(lend.borrowShares(marketId, bob), 0);
    }

    function test_repay_partial() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 500e18, 0, bob, bob);

        // Repay 200
        uint256 sharesBefore = lend.borrowShares(marketId, bob);
        vm.prank(bob);
        lend.repay(marketId, 200e18, 0, bob, "");

        assertLt(lend.borrowShares(marketId, bob), sharesBefore);
    }

    // ─── WithdrawCollateral Tests ───

    function test_withdrawCollateral() public {
        vm.prank(alice);
        lend.supplyCollateral(marketId, 1000e18, alice, "");

        uint256 balBefore = collToken.balanceOf(alice);
        vm.prank(alice);
        lend.withdrawCollateral(marketId, 500e18, alice, alice);

        assertEq(lend.collateral(marketId, alice), 500e18);
        assertEq(collToken.balanceOf(alice) - balBefore, 500e18);
    }

    function test_withdrawCollateral_revertUnhealthy() public {
        // Supply liquidity, supply collateral, borrow
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 700e18, 0, bob, bob);

        // Withdraw too much collateral
        vm.prank(bob);
        vm.expectRevert("SnowballLend: insufficient collateral");
        lend.withdrawCollateral(marketId, 200e18, bob, bob);
    }

    // ─── Interest Accrual Tests ───

    function test_accrueInterest() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 2000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 1000e18, 0, bob, bob);

        (uint128 supplyBefore, , uint128 borrowBefore, , ,) = lend.market(marketId);

        // Advance time by 1 year
        vm.warp(block.timestamp + 365 days);
        lend.accrueInterest(marketId);

        (uint128 supplyAfter, , uint128 borrowAfter, , ,) = lend.market(marketId);

        assertGt(borrowAfter, borrowBefore, "borrow should increase after interest");
        assertGt(supplyAfter, supplyBefore, "supply should increase after interest");
        assertEq(
            uint256(supplyAfter) - uint256(supplyBefore),
            uint256(borrowAfter) - uint256(borrowBefore),
            "interest added to both sides equally (no fee)"
        );
    }

    function test_accrueInterest_withFee() public {
        lend.setFeeRecipient(owner);
        lend.setFee(marketId, 0.1e18); // 10% fee

        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 2000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 1000e18, 0, bob, bob);

        vm.warp(block.timestamp + 365 days);
        lend.accrueInterest(marketId);

        // Fee recipient should have supply shares
        assertGt(lend.supplyShares(marketId, owner), 0, "fee recipient should have shares");
    }

    // ─── Liquidation Tests ───

    function test_liquidate_seizedAssets() public {
        // Setup: Alice supplies, Bob borrows at max
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 790e18, 0, bob, bob);

        // Price drops — Bob becomes unhealthy
        oracle.setPrice(0.5e36); // collateral value halves

        // Alice liquidates by specifying seized collateral
        uint256 aliceLoanBefore = loanToken.balanceOf(alice);
        uint256 aliceCollBefore = collToken.balanceOf(alice);

        vm.prank(alice);
        (uint256 seized, uint256 repaidShares) = lend.liquidate(marketId, bob, 200e18, 0, "");

        assertEq(seized, 200e18);
        assertGt(repaidShares, 0);
        assertEq(collToken.balanceOf(alice) - aliceCollBefore, 200e18, "liquidator received collateral");
        assertLt(loanToken.balanceOf(alice), aliceLoanBefore, "liquidator paid loan tokens");
    }

    function test_liquidate_repaidShares() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        (, uint256 borrowedShares) = lend.borrow(marketId, 790e18, 0, bob, bob);

        oracle.setPrice(0.5e36);

        // Liquidate by specifying repaid shares
        vm.prank(alice);
        (uint256 seized, ) = lend.liquidate(marketId, bob, 0, borrowedShares / 2, "");

        assertGt(seized, 0);
        assertLt(lend.borrowShares(marketId, bob), borrowedShares);
    }

    function test_liquidate_revertHealthy() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 500e18, 0, bob, bob);

        // Bob is healthy — liquidation should revert
        vm.prank(alice);
        vm.expectRevert("SnowballLend: borrower is healthy");
        lend.liquidate(marketId, bob, 100e18, 0, "");
    }

    function test_liquidate_badDebt() public {
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        vm.prank(bob);
        lend.supplyCollateral(marketId, 1000e18, bob, "");
        vm.prank(bob);
        lend.borrow(marketId, 790e18, 0, bob, bob);

        // Massive price drop — collateral almost worthless
        oracle.setPrice(0.01e36);

        // Seize ALL collateral
        uint256 bobColl = lend.collateral(marketId, bob);

        vm.prank(alice);
        lend.liquidate(marketId, bob, bobColl, 0, "");

        // Bob should have 0 collateral and 0 borrow shares (bad debt socialized)
        assertEq(lend.collateral(marketId, bob), 0);
        assertEq(lend.borrowShares(marketId, bob), 0, "bad debt should be cleared");
    }

    // ─── Market Creation Tests ───

    function test_createMarket() public {
        MockOracle newOracle = new MockOracle(1e36);
        SnowballLend.MarketParams memory params = SnowballLend.MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collToken),
            oracle: address(newOracle),
            irm: address(irm),
            lltv: LLTV
        });
        bytes32 id = lend.createMarket(params);
        (, , , , uint128 lastUpdate,) = lend.market(id);
        assertGt(lastUpdate, 0);
    }

    function test_createMarket_revertDuplicate() public {
        SnowballLend.MarketParams memory params = SnowballLend.MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collToken),
            oracle: address(oracle),
            irm: address(irm),
            lltv: LLTV
        });
        vm.expectRevert("SnowballLend: market already exists");
        lend.createMarket(params);
    }

    function test_createMarket_revertIrmNotEnabled() public {
        SnowballLend.MarketParams memory params = SnowballLend.MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collToken),
            oracle: address(oracle),
            irm: address(0xdead),
            lltv: LLTV
        });
        vm.expectRevert("SnowballLend: IRM not enabled");
        lend.createMarket(params);
    }

    // ─── E2E Flow Test ───

    function test_fullFlow() public {
        // 1. Alice supplies 5000 loan tokens
        vm.prank(alice);
        lend.supply(marketId, 5000e18, 0, alice, "");

        // 2. Bob supplies 2000 collateral
        vm.prank(bob);
        lend.supplyCollateral(marketId, 2000e18, bob, "");

        // 3. Bob borrows 1000
        vm.prank(bob);
        lend.borrow(marketId, 1000e18, 0, bob, bob);

        // 4. Time passes — interest accrues
        vm.warp(block.timestamp + 30 days);
        lend.accrueInterest(marketId);

        // 5. Bob repays (needs slightly more due to interest)
        (,,uint128 totalBorrowAssets, uint128 totalBorrowShares,,) = lend.market(marketId);
        assertGt(totalBorrowAssets, 1000e18, "interest should have accrued");

        uint256 bobShares = lend.borrowShares(marketId, bob);
        vm.prank(bob);
        lend.repay(marketId, 0, bobShares, bob, "");

        assertEq(lend.borrowShares(marketId, bob), 0);

        // 6. Bob withdraws all collateral
        uint256 bobColl = lend.collateral(marketId, bob);
        vm.prank(bob);
        lend.withdrawCollateral(marketId, bobColl, bob, bob);

        assertEq(lend.collateral(marketId, bob), 0);

        // 7. Alice withdraws all supply (with interest earned)
        uint256 aliceShares = lend.supplyShares(marketId, alice);
        vm.prank(alice);
        (uint256 withdrawn,) = lend.withdraw(marketId, 0, aliceShares, alice, alice);

        assertGt(withdrawn, 5000e18, "Alice should have earned interest");
    }
}
