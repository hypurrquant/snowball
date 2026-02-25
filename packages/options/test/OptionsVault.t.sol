// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {OptionsVault} from "../src/OptionsVault.sol";

contract OptionsVaultTest is Test {
    OptionsVault vault;
    address admin = address(1);
    address engine = address(2);
    address lp1 = address(3);
    address lp2 = address(4);
    address winner = address(5);

    function setUp() public {
        OptionsVault impl = new OptionsVault();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(OptionsVault.initialize, (admin))
        );
        vault = OptionsVault(payable(address(proxy)));

        bytes32 engineRole = vault.ENGINE_ROLE();
        vm.prank(admin);
        vault.grantRole(engineRole, engine);

        vm.deal(lp1, 100 ether);
        vm.deal(lp2, 100 ether);
        vm.deal(engine, 100 ether);
    }

    // ─── LP Operations ───

    function test_deposit() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        assertEq(vault.sharesOf(lp1), 10 ether);
        assertEq(vault.totalShares(), 10 ether);
        assertEq(vault.totalDeposited(), 10 ether);
    }

    function test_depositMultipleLP() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(lp2);
        vault.deposit{value: 10 ether}();

        assertEq(vault.sharesOf(lp1), 10 ether);
        assertEq(vault.sharesOf(lp2), 10 ether);
        assertEq(vault.totalDeposited(), 20 ether);
    }

    function test_withdrawFlow() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(lp1);
        vault.requestWithdraw(5 ether);

        // Can't execute before delay
        vm.prank(lp1);
        vm.expectRevert("Vault: withdrawal locked");
        vault.executeWithdraw();

        // Warp past delay
        vm.warp(block.timestamp + 24 hours + 1);

        uint256 balBefore = lp1.balance;
        vm.prank(lp1);
        vault.executeWithdraw();

        assertEq(lp1.balance - balBefore, 5 ether);
        assertEq(vault.sharesOf(lp1), 5 ether);
        assertEq(vault.totalDeposited(), 5 ether);
    }

    function test_depositZeroReverts() public {
        vm.prank(lp1);
        vm.expectRevert("Vault: zero deposit");
        vault.deposit{value: 0}();
    }

    // ─── Engine Operations ───

    function test_lockAndReleaseCollateral() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(engine);
        vault.lockCollateral(5 ether);
        assertEq(vault.lockedCollateral(), 5 ether);
        assertEq(vault.availableLiquidity(), 5 ether);

        vm.prank(engine);
        vault.releaseCollateral(3 ether);
        assertEq(vault.lockedCollateral(), 2 ether);
        assertEq(vault.availableLiquidity(), 8 ether);
    }

    function test_payWinner() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(engine);
        vault.lockCollateral(5 ether);

        uint256 winnerBal = winner.balance;
        vm.prank(engine);
        vault.payWinner(winner, 5 ether);

        assertEq(winner.balance - winnerBal, 5 ether);
        assertEq(vault.lockedCollateral(), 0);
        assertEq(vault.totalDeposited(), 5 ether);
    }

    function test_receiveWinnings() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(engine);
        vault.receiveWinnings{value: 3 ether}();

        assertEq(vault.totalDeposited(), 13 ether);
    }

    function test_lockCollateralUnauthorized() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(lp1);
        vm.expectRevert("Vault: unauthorized");
        vault.lockCollateral(5 ether);
    }

    function test_lockExceedsLiquidity() public {
        vm.prank(lp1);
        vault.deposit{value: 10 ether}();

        vm.prank(engine);
        vm.expectRevert("Vault: insufficient liquidity");
        vault.lockCollateral(11 ether);
    }
}
