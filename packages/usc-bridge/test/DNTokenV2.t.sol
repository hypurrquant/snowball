// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DNToken.sol";

contract DNTokenV2Test is Test {
    DNToken token;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        token = new DNToken(1_000_000 ether);
    }

    function test_mint() public {
        token.mint(alice, 100 ether);
        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.totalSupply(), 1_000_000 ether + 100 ether);
    }

    function test_mint_unauthorized_reverts() public {
        vm.prank(alice);
        vm.expectRevert("DNToken: not owner");
        token.mint(bob, 50 ether);
    }

    function test_mint_emits_transfer() public {
        vm.expectEmit(true, true, false, true);
        emit DNToken.Transfer(address(0), alice, 100 ether);
        token.mint(alice, 100 ether);
    }

    function test_bridgeBurn() public {
        token.mint(alice, 100 ether);
        vm.prank(alice);
        token.bridgeBurn(100 ether, 1);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(address(1)), 100 ether);
    }

    function test_bridgeBurn_emits_events() public {
        token.mint(alice, 100 ether);
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit DNToken.BridgeBurn(alice, 100 ether, 1);
        token.bridgeBurn(100 ether, 1);
    }

    function test_bridgeBurn_insufficient_balance_reverts() public {
        vm.prank(alice);
        vm.expectRevert("DNToken: insufficient balance");
        token.bridgeBurn(1 ether, 1);
    }
}
