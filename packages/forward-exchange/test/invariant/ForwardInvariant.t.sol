// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {IForward} from "../../src/interfaces/IForward.sol";

/// @title ForwardInvariantHandler
/// @notice Handler for invariant testing - generates random valid actions
contract ForwardInvariantHandler is BaseTest {
    uint256 public totalDeposited;
    uint256[] public activePositionIds;

    function setUp() public override {
        super.setUp();

        // Pre-deposit large amounts
        _depositToVault(alice, INITIAL_USDC);
        _depositToVault(bob, INITIAL_USDC);
        totalDeposited = INITIAL_USDC * 2;
    }

    function handler_createAndAcceptOffer(uint256 notionalSeed) external {
        uint256 notional = bound(notionalSeed, 1e6, 100_000e6);

        uint256 aliceFree = vault.freeBalance(alice);
        uint256 bobFree = vault.freeBalance(bob);
        if (aliceFree < notional || bobFree < notional) return;

        uint256 maturity = block.timestamp + 30 days;

        vm.prank(alice);
        try forward.createOffer(USD_KRW_MARKET, notional, 1400e18, maturity, true)
            returns (uint256 longId, uint256 shortId)
        {
            vm.prank(bob);
            try forward.acceptOffer(shortId) {
                activePositionIds.push(longId);
            } catch {
                // Cancel if accept fails
                vm.prank(alice);
                forward.cancelOffer(longId);
            }
        } catch {}
    }

    function handler_cancelOffer(uint256 notionalSeed) external {
        uint256 notional = bound(notionalSeed, 1e6, 50_000e6);
        uint256 aliceFree = vault.freeBalance(alice);
        if (aliceFree < notional) return;

        vm.prank(alice);
        try forward.createOffer(USD_KRW_MARKET, notional, 1400e18, block.timestamp + 30 days, true)
            returns (uint256 longId, uint256)
        {
            vm.prank(alice);
            forward.cancelOffer(longId);
        } catch {}
    }

    function getActivePositionCount() external view returns (uint256) {
        return activePositionIds.length;
    }
}

/// @title ForwardInvariantTest
/// @notice Invariant tests for the Forward Exchange protocol
contract ForwardInvariantTest is Test {
    ForwardInvariantHandler public handler;

    function setUp() public {
        handler = new ForwardInvariantHandler();
        handler.setUp();

        // Target the handler for invariant testing
        targetContract(address(handler));

        // Only target handler functions
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = ForwardInvariantHandler.handler_createAndAcceptOffer.selector;
        selectors[1] = ForwardInvariantHandler.handler_cancelOffer.selector;

        targetSelector(FuzzSelector({
            addr: address(handler),
            selectors: selectors
        }));
    }

    /// @notice Invariant: Total USDC in vault >= sum of all locked balances
    function invariant_VaultSolvency() public view {
        uint256 vaultBalance = handler.usdc().balanceOf(address(handler.vault()));
        uint256 aliceFree = handler.vault().freeBalance(handler.alice());
        uint256 aliceLocked = handler.vault().lockedBalance(handler.alice());
        uint256 bobFree = handler.vault().freeBalance(handler.bob());
        uint256 bobLocked = handler.vault().lockedBalance(handler.bob());

        uint256 totalAccounted = aliceFree + aliceLocked + bobFree + bobLocked;

        assertGe(vaultBalance, totalAccounted, "Vault balance must cover all user balances");
    }

    /// @notice Invariant: User free balance + locked balance = total deposited - withdrawn
    function invariant_UserBalanceConsistency() public view {
        // For each user, their vault token balance should equal free + locked
        uint256 aliceTotal = handler.vault().freeBalance(handler.alice()) +
            handler.vault().lockedBalance(handler.alice());
        uint256 bobTotal = handler.vault().freeBalance(handler.bob()) +
            handler.vault().lockedBalance(handler.bob());

        // Total should equal what was deposited
        assertEq(aliceTotal + bobTotal, handler.totalDeposited(), "Total balances must equal deposits");
    }
}
