// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

contract VaultTest is BaseTest {
    function test_Deposit_Success() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        assertEq(vault.freeBalance(alice), 1000e6);
        assertEq(usdc.balanceOf(address(vault)), 1000e6);
    }

    function test_Deposit_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_Withdraw_Success() public {
        _depositToVault(alice, 1000e6);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(500e6);

        assertEq(vault.freeBalance(alice), 500e6);
        assertEq(usdc.balanceOf(alice), balBefore + 500e6);
    }

    function test_Withdraw_RevertsWhen_InsufficientBalance() public {
        _depositToVault(alice, 1000e6);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(
            Vault.InsufficientFreeBalance.selector, alice, 1001e6, 1000e6
        ));
        vault.withdraw(1001e6);
    }

    function test_Withdraw_RevertsWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    function test_LockCollateral_Success() public {
        _depositToVault(alice, 1000e6);

        vm.prank(address(forward));
        vault.lockCollateral(alice, 2, 500e6);

        assertEq(vault.freeBalance(alice), 500e6);
        assertEq(vault.lockedBalance(alice), 500e6);
        assertEq(vault.positionCollateral(2), 500e6);
    }

    function test_LockCollateral_RevertsWhen_InsufficientFree() public {
        _depositToVault(alice, 100e6);

        vm.prank(address(forward));
        vm.expectRevert(abi.encodeWithSelector(
            Vault.InsufficientFreeBalance.selector, alice, 500e6, 100e6
        ));
        vault.lockCollateral(alice, 2, 500e6);
    }

    function test_LockCollateral_RevertsWhen_NotOperator() public {
        _depositToVault(alice, 1000e6);

        vm.prank(alice);
        vm.expectRevert();
        vault.lockCollateral(alice, 2, 500e6);
    }

    function test_UnlockCollateral_Success() public {
        _depositToVault(alice, 1000e6);

        vm.prank(address(forward));
        vault.lockCollateral(alice, 2, 500e6);

        vm.prank(address(forward));
        vault.unlockCollateral(alice, 2, 500e6);

        assertEq(vault.freeBalance(alice), 1000e6);
        assertEq(vault.lockedBalance(alice), 0);
        assertEq(vault.positionCollateral(2), 0);
    }

    function test_SettlePosition_LongWins() public {
        _depositToVault(alice, NOTIONAL);
        _depositToVault(bob, NOTIONAL);

        // Lock collateral for both sides
        vm.startPrank(address(forward));
        vault.lockCollateral(alice, 2, NOTIONAL); // Long (even ID)
        vault.lockCollateral(bob, 3, NOTIONAL);   // Short (odd ID)
        vm.stopPrank();

        // Long wins 10K USDC
        uint256 pnl = 10_000e6;
        vm.prank(address(settlementEngine));
        vault.settlePosition(3, alice, bob, pnl); // loser's positionId=3, winner=alice

        assertEq(vault.freeBalance(alice), NOTIONAL + pnl); // Got collateral back + PnL
        assertEq(vault.freeBalance(bob), NOTIONAL - pnl);   // Got collateral back - PnL
        assertEq(vault.lockedBalance(alice), 0);
        assertEq(vault.lockedBalance(bob), 0);
    }

    function test_Pause_BlocksDeposit() public {
        vm.prank(admin);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(1000e6);
    }

    // ─── InternalTransfer ────────────────────────────────────────────────

    function test_InternalTransfer_Success() public {
        _depositToVault(alice, 1000e6);

        bytes32 role = vault.MARKETPLACE_ROLE();
        vm.prank(admin);
        vault.grantRole(role, address(this));

        vault.internalTransfer(alice, bob, 400e6);

        assertEq(vault.freeBalance(alice), 600e6);
        assertEq(vault.freeBalance(bob), 400e6);
    }

    function test_InternalTransfer_RevertInsufficientBalance() public {
        _depositToVault(alice, 100e6);

        bytes32 role = vault.MARKETPLACE_ROLE();
        vm.prank(admin);
        vault.grantRole(role, address(this));

        vm.expectRevert(abi.encodeWithSelector(
            Vault.InsufficientFreeBalance.selector, alice, 500e6, 100e6
        ));
        vault.internalTransfer(alice, bob, 500e6);
    }

    function test_InternalTransfer_RevertNotMarketplaceRole() public {
        _depositToVault(alice, 1000e6);

        vm.prank(alice);
        vm.expectRevert();
        vault.internalTransfer(alice, bob, 400e6);
    }

    function test_InternalTransfer_RevertZeroAmount() public {
        bytes32 role = vault.MARKETPLACE_ROLE();
        vm.prank(admin);
        vault.grantRole(role, address(this));

        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.internalTransfer(alice, bob, 0);
    }

    function test_InternalTransfer_RevertZeroAddress() public {
        bytes32 role = vault.MARKETPLACE_ROLE();
        vm.prank(admin);
        vault.grantRole(role, address(this));

        _depositToVault(alice, 1000e6);

        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.internalTransfer(alice, address(0), 400e6);
    }

    function testFuzz_DepositWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, INITIAL_USDC);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        _depositToVault(alice, depositAmount);

        vm.prank(alice);
        vault.withdraw(withdrawAmount);

        assertEq(vault.freeBalance(alice), depositAmount - withdrawAmount);
    }
}
