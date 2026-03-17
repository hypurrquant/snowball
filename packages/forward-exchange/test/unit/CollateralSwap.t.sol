// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {CollateralSwap} from "../../src/tokenized/CollateralSwap.sol";

contract CollateralSwapTest is Test {
    ERC20Mock public usdc;
    ERC20Mock public aUSDC;
    ERC20Mock public randomToken;
    CollateralSwap public swapper;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");

    function setUp() public {
        usdc = new ERC20Mock("USDC", "USDC", 6);
        aUSDC = new ERC20Mock("aUSDC", "aUSDC", 6);
        randomToken = new ERC20Mock("RAND", "RAND", 18);

        vm.prank(admin);
        swapper = new CollateralSwap(admin);

        // Approve pair
        vm.prank(admin);
        swapper.approvePair(address(usdc), address(aUSDC));

        // Fund swap contract with both tokens
        usdc.mint(address(swapper), 1_000_000e6);
        aUSDC.mint(address(swapper), 1_000_000e6);

        // Fund alice
        usdc.mint(alice, 100_000e6);
        aUSDC.mint(alice, 100_000e6);

        vm.prank(alice);
        usdc.approve(address(swapper), type(uint256).max);
        vm.prank(alice);
        aUSDC.approve(address(swapper), type(uint256).max);
    }

    // ─── Constructor ─────────────────────────────────────────────────

    function test_Constructor_RevertsWhen_ZeroAdmin() public {
        vm.expectRevert();
        new CollateralSwap(address(0));
    }

    // ─── approvePair ─────────────────────────────────────────────────

    function test_ApprovePair_Success() public {
        vm.prank(admin);
        swapper.approvePair(address(usdc), address(randomToken));

        assertTrue(swapper.approvedPairs(address(usdc), address(randomToken)));
        assertTrue(swapper.approvedPairs(address(randomToken), address(usdc)));
    }

    function test_ApprovePair_RevertsWhen_NotAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        swapper.approvePair(address(usdc), address(randomToken));
    }

    function test_ApprovePair_RevertsWhen_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert();
        swapper.approvePair(address(0), address(usdc));
    }

    // ─── swap ────────────────────────────────────────────────────────

    function test_Swap_USDCToAUSDC() public {
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        uint256 aliceAusdcBefore = aUSDC.balanceOf(alice);

        vm.prank(alice);
        swapper.swap(address(usdc), address(aUSDC), 1000e6);

        assertEq(usdc.balanceOf(alice), aliceUsdcBefore - 1000e6);
        assertEq(aUSDC.balanceOf(alice), aliceAusdcBefore + 1000e6);
    }

    function test_Swap_AUSDCToUSDC() public {
        vm.prank(alice);
        swapper.swap(address(aUSDC), address(usdc), 500e6);

        assertEq(aUSDC.balanceOf(alice), 100_000e6 - 500e6);
        assertEq(usdc.balanceOf(alice), 100_000e6 + 500e6);
    }

    function test_Swap_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        swapper.swap(address(usdc), address(aUSDC), 0);
    }

    function test_Swap_RevertsWhen_PairNotApproved() public {
        vm.prank(alice);
        vm.expectRevert();
        swapper.swap(address(usdc), address(randomToken), 100e6);
    }

    function test_Swap_RevertsWhen_InsufficientLiquidity() public {
        // Try to swap more than contract holds
        vm.prank(alice);
        vm.expectRevert();
        swapper.swap(address(usdc), address(aUSDC), 2_000_000e6);
    }

    // ─── Fuzz ────────────────────────────────────────────────────────

    function testFuzz_Swap_BalanceConsistency(uint256 amount) public {
        amount = bound(amount, 1, 100_000e6);

        uint256 swapperUsdcBefore = usdc.balanceOf(address(swapper));
        uint256 swapperAusdcBefore = aUSDC.balanceOf(address(swapper));

        vm.prank(alice);
        swapper.swap(address(usdc), address(aUSDC), amount);

        // Swapper gains USDC and loses aUSDC by exact amounts
        assertEq(usdc.balanceOf(address(swapper)), swapperUsdcBefore + amount);
        assertEq(aUSDC.balanceOf(address(swapper)), swapperAusdcBefore - amount);
    }
}
