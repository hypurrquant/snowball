// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OptionsClearingHouse} from "../src/OptionsClearingHouse.sol";

contract OptionsClearingHouseTest is Test {
    OptionsClearingHouse ch;
    address admin = address(1);
    address product = address(2);
    address user1 = address(3);
    address user2 = address(4);

    function setUp() public {
        OptionsClearingHouse impl = new OptionsClearingHouse();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(OptionsClearingHouse.initialize, (admin))
        );
        ch = OptionsClearingHouse(payable(address(proxy)));

        bytes32 productRole = ch.PRODUCT_ROLE();
        vm.prank(admin);
        ch.grantRole(productRole, product);

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    // ─── Deposit / Withdraw ───

    function test_deposit() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();
        assertEq(ch.balanceOf(user1), 10 ether);
    }

    function test_depositZeroReverts() public {
        vm.prank(user1);
        vm.expectRevert("ClearingHouse: zero deposit");
        ch.deposit{value: 0}();
    }

    function test_withdraw() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(user1);
        ch.withdraw(5 ether);
        assertEq(ch.balanceOf(user1), 5 ether);
    }

    function test_withdrawInsufficientReverts() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(user1);
        vm.expectRevert("ClearingHouse: insufficient balance");
        ch.withdraw(11 ether);
    }

    // ─── Escrow Operations ───

    function test_lockInEscrow() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(product);
        ch.lockInEscrow(user1, 5 ether);

        assertEq(ch.balanceOf(user1), 5 ether);
        assertEq(ch.escrowOf(user1), 5 ether);
    }

    function test_lockInEscrow_unauthorized() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(user1);
        vm.expectRevert("ClearingHouse: unauthorized");
        ch.lockInEscrow(user1, 5 ether);
    }

    function test_releaseFromEscrow() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(product);
        ch.lockInEscrow(user1, 5 ether);

        vm.prank(product);
        ch.releaseFromEscrow(user1, 3 ether);

        assertEq(ch.balanceOf(user1), 8 ether);
        assertEq(ch.escrowOf(user1), 2 ether);
    }

    function test_settleEscrow() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(product);
        ch.lockInEscrow(user1, 5 ether);

        vm.prank(product);
        ch.settleEscrow(user1, user2, 5 ether);

        assertEq(ch.escrowOf(user1), 0);
        assertEq(ch.balanceOf(user2), 5 ether);
    }

    // ─── Fees ───

    function test_collectFee() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(product);
        ch.lockInEscrow(user1, 10 ether);

        vm.prank(product);
        ch.collectFee(user1, 1 ether);

        assertEq(ch.accumulatedFees(), 1 ether);
        assertEq(ch.escrowOf(user1), 9 ether);
    }

    function test_flushFees() public {
        vm.prank(user1);
        ch.deposit{value: 10 ether}();

        vm.prank(product);
        ch.lockInEscrow(user1, 10 ether);

        vm.prank(product);
        ch.collectFee(user1, 1 ether);

        address treasury = address(5);
        uint256 before = treasury.balance;

        vm.prank(admin);
        ch.flushFeesToRevenue(treasury);

        assertEq(treasury.balance - before, 1 ether);
        assertEq(ch.accumulatedFees(), 0);
    }

    // ─── Access Control ───

    function test_onlyAdminCanGrantRole() public {
        bytes32 productRole = ch.PRODUCT_ROLE();
        vm.prank(user1);
        vm.expectRevert("ClearingHouse: not admin");
        ch.grantRole(productRole, user1);
    }
}
