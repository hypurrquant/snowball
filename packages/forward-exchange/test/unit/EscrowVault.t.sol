// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {IEscrowVault} from "../../src/tokenized/interfaces/IEscrowVault.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract EscrowVaultTest is Test {
    EscrowVault public escrow;
    ERC20Mock public usdc;

    address public admin = makeAddr("admin");
    address public factory = makeAddr("factory");
    address public alice = makeAddr("alice");

    bytes32 public constant SERIES_ID = keccak256("test-series");

    function setUp() public {
        usdc = new ERC20Mock("USDC", "USDC", 6);
        escrow = new EscrowVault(address(usdc), admin);

        // Grant factory role
        bytes32 factoryRole = escrow.FACTORY_ROLE();
        vm.prank(admin);
        escrow.grantRole(factoryRole, factory);

        // Fund factory with USDC
        usdc.mint(factory, 1_000_000e6);
        vm.prank(factory);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_DepositFor_Success() public {
        vm.prank(factory);
        escrow.depositFor(SERIES_ID, 1000e6);

        assertEq(escrow.seriesBalance(SERIES_ID), 1000e6);
        assertEq(escrow.totalEscrowed(), 1000e6);
        assertEq(usdc.balanceOf(address(escrow)), 1000e6);
    }

    function test_DepositFor_RevertsWhen_NotFactory() public {
        vm.prank(alice);
        vm.expectRevert();
        escrow.depositFor(SERIES_ID, 1000e6);
    }

    function test_DepositFor_RevertsWhen_ZeroAmount() public {
        vm.prank(factory);
        vm.expectRevert(IEscrowVault.ZeroAmount.selector);
        escrow.depositFor(SERIES_ID, 0);
    }

    function test_ReleaseToUser_Success() public {
        vm.prank(factory);
        escrow.depositFor(SERIES_ID, 1000e6);

        vm.prank(admin);
        escrow.authorizeForSeries(SERIES_ID, factory);

        vm.prank(factory);
        escrow.releaseToUser(SERIES_ID, alice, 500e6);

        assertEq(escrow.seriesBalance(SERIES_ID), 500e6);
        assertEq(usdc.balanceOf(alice), 500e6);
    }

    function test_ReleaseToUser_RevertsWhen_InsufficientBalance() public {
        vm.prank(factory);
        escrow.depositFor(SERIES_ID, 100e6);

        vm.prank(admin);
        escrow.authorizeForSeries(SERIES_ID, factory);

        vm.prank(factory);
        vm.expectRevert(abi.encodeWithSelector(
            IEscrowVault.InsufficientBalance.selector,
            SERIES_ID, 200e6, 100e6
        ));
        escrow.releaseToUser(SERIES_ID, alice, 200e6);
    }

    function test_ReleaseToFactory_Success() public {
        vm.prank(factory);
        escrow.depositFor(SERIES_ID, 1000e6);

        vm.prank(admin);
        escrow.authorizeForSeries(SERIES_ID, factory);

        uint256 balBefore = usdc.balanceOf(factory);
        vm.prank(factory);
        escrow.releaseToFactory(SERIES_ID, 500e6);

        assertEq(usdc.balanceOf(factory) - balBefore, 500e6);
        assertEq(escrow.seriesBalance(SERIES_ID), 500e6);
    }
}
