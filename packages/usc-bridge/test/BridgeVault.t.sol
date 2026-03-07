// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BridgeVault.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        require(balanceOf[from] >= amount, "insufficient balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract BridgeVaultTest is Test {
    BridgeVault vault;
    MockUSDC usdc;
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
        vault = new BridgeVault(address(usdc));
        usdc.mint(alice, 10_000 ether);
    }

    function test_deposit() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 100 ether);
        vault.deposit(100 ether, 1);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vault)), 100 ether);
        assertEq(usdc.balanceOf(alice), 9_900 ether);
    }

    function test_deposit_emits_event() public {
        vm.startPrank(alice);
        usdc.approve(address(vault), 100 ether);

        vm.expectEmit(true, false, false, true);
        emit BridgeVault.Deposited(alice, 100 ether, 1);
        vault.deposit(100 ether, 1);
        vm.stopPrank();
    }

    function test_deposit_zero_reverts() public {
        vm.prank(alice);
        vm.expectRevert("BridgeVault: zero amount");
        vault.deposit(0, 1);
    }

    function test_deposit_no_approval_reverts() public {
        vm.prank(alice);
        vm.expectRevert("insufficient allowance");
        vault.deposit(100 ether, 1);
    }
}
