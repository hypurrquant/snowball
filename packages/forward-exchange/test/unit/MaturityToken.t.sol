// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {IMaturityToken} from "../../src/tokenized/interfaces/IMaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";

contract MaturityTokenTest is Test {
    ERC20Mock public usdc;
    EscrowVault public escrow;
    MaturityToken public fToken;
    MaturityToken public sfToken;

    address public admin = makeAddr("admin");
    address public factory = makeAddr("factory");
    address public alice = makeAddr("alice");

    bytes32 public constant MARKET_ID = keccak256("USD/KRW");
    bytes32 public constant SERIES_ID = keccak256("test-series");
    uint256 public constant MATURITY = 1719792000; // some future timestamp
    int256 public constant FORWARD_RATE = 1400e18; // 1400 KRW/USD

    function setUp() public {
        usdc = new ERC20Mock("USDC", "USDC", 6);
        escrow = new EscrowVault(address(usdc), admin);

        // Grant factory role on escrow
        bytes32 factoryRole = escrow.FACTORY_ROLE();
        vm.prank(admin);
        escrow.grantRole(factoryRole, factory);

        // Deploy fToken and sfToken from factory
        vm.startPrank(factory);

        fToken = new MaturityToken(
            "fKRW-JUN26", "fKRW-JUN26",
            MARKET_ID, MATURITY, FORWARD_RATE,
            true, // isLong
            SERIES_ID, address(escrow), factory
        );

        sfToken = new MaturityToken(
            "sfKRW-JUN26", "sfKRW-JUN26",
            MARKET_ID, MATURITY, FORWARD_RATE,
            false, // isLong
            SERIES_ID, address(escrow), factory
        );

        fToken.setCounterpart(address(sfToken));
        sfToken.setCounterpart(address(fToken));

        vm.stopPrank();

        // Grant FACTORY_ROLE on escrow to both tokens (for redeem → releaseToUser)
        bytes32 fRole = escrow.FACTORY_ROLE();
        vm.startPrank(admin);
        escrow.grantRole(fRole, address(fToken));
        escrow.grantRole(fRole, address(sfToken));
        // Authorize both tokens for the series so they can call releaseToUser
        escrow.authorizeForSeries(SERIES_ID, address(fToken));
        escrow.authorizeForSeries(SERIES_ID, address(sfToken));
        vm.stopPrank();

        // Fund escrow for redemption
        usdc.mint(factory, 1_000_000e6);
        vm.prank(factory);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(factory);
        escrow.depositFor(SERIES_ID, 200_000e6); // 200K USDC for 100K pairs
    }

    function test_Mint_Success() public {
        vm.prank(factory);
        fToken.mint(alice, 100e18);

        assertEq(fToken.balanceOf(alice), 100e18);
    }

    function test_Mint_RevertsWhen_NotMinter() public {
        vm.prank(alice);
        vm.expectRevert();
        fToken.mint(alice, 100e18);
    }

    function test_Settle_FToken_EqualRate() public {
        // F_0 = 1400, S_T = 1400 → fToken = 1400/1400 = 1.0 → 1e6 USDC
        vm.prank(factory);
        fToken.settle(1400e18);

        assertTrue(fToken.isSettled());
        assertEq(fToken.redemptionRate(), 1e6); // 1 USDC
    }

    function test_Settle_FToken_KRWStrengthens() public {
        // F_0 = 1400, S_T = 1200 → fToken = S_T/F_0 = 1200/1400 ≈ 0.8571 → 857142 (6dec)
        vm.prank(factory);
        fToken.settle(1200e18);

        assertTrue(fToken.isSettled());
        assertEq(fToken.redemptionRate(), 857142); // ~0.857 USDC
    }

    function test_Settle_SFToken_KRWStrengthens() public {
        // F_0 = 1400, S_T = 1200 → sfToken = 2 - 1200/1400 ≈ 1.1429 → 1142857 (6dec)
        vm.prank(factory);
        sfToken.settle(1200e18);

        assertTrue(sfToken.isSettled());
        assertEq(sfToken.redemptionRate(), 1142857); // ~1.143 USDC
    }

    function test_Settle_FToken_KRWWeakens() public {
        // F_0 = 1400, S_T = 1600 → fToken = 1600/1400 ≈ 1.1429 → 1142857 (6dec)
        vm.prank(factory);
        fToken.settle(1600e18);

        assertEq(fToken.redemptionRate(), 1142857);
    }

    function test_Settle_SFToken_KRWWeakens() public {
        // F_0 = 1400, S_T = 1600 → sfToken = 2 - 1600/1400 ≈ 0.8571 → 857142 (6dec)
        vm.prank(factory);
        sfToken.settle(1600e18);

        assertEq(sfToken.redemptionRate(), 857142);
    }

    function test_Settle_SFToken_ExtremeWeakening() public {
        // S_T = 3000 → ratio = 3000/1400 = 2.143 → sfToken = 2 - 2.143 → capped at 0
        vm.prank(factory);
        sfToken.settle(3000e18);

        assertEq(sfToken.redemptionRate(), 0);
    }

    function test_Settle_FToken_CappedAt2USDC() public {
        // S_T = 3000 → fToken = 3000/1400 = 2.143 → capped at 2.0 USDC
        vm.prank(factory);
        fToken.settle(3000e18);

        assertEq(fToken.redemptionRate(), 2e6);
    }

    function test_Settle_RevertsWhen_AlreadySettled() public {
        vm.prank(factory);
        fToken.settle(1400e18);

        vm.prank(factory);
        vm.expectRevert(IMaturityToken.AlreadySettled.selector);
        fToken.settle(1400e18);
    }

    function test_Redeem_Success() public {
        // Mint and settle
        vm.prank(factory);
        fToken.mint(alice, 100e18);
        vm.prank(factory);
        fToken.settle(1400e18); // 1:1 → 1 USDC each

        // Alice redeems
        vm.prank(alice);
        fToken.redeem(100e18);

        assertEq(fToken.balanceOf(alice), 0);
        assertEq(usdc.balanceOf(alice), 100e6); // 100 USDC
    }

    function test_Redeem_RevertsWhen_NotSettled() public {
        vm.prank(factory);
        fToken.mint(alice, 100e18);

        vm.prank(alice);
        vm.expectRevert(IMaturityToken.NotSettled.selector);
        fToken.redeem(100e18);
    }

    function test_SumOfPayouts_Equals2USDC() public {
        // Verify fKRW + sfKRW = 2 USDC per pair at any settlement rate
        int256[4] memory rates = [int256(1200e18), 1400e18, 1600e18, 800e18];

        for (uint256 i = 0; i < rates.length; i++) {
            MaturityToken f = new MaturityToken(
                "f", "f", MARKET_ID, MATURITY, FORWARD_RATE,
                true, SERIES_ID, address(escrow), address(this)
            );
            MaturityToken sf = new MaturityToken(
                "sf", "sf", MARKET_ID, MATURITY, FORWARD_RATE,
                false, SERIES_ID, address(escrow), address(this)
            );

            f.settle(rates[i]);
            sf.settle(rates[i]);

            uint256 sum = f.redemptionRate() + sf.redemptionRate();
            // Sum should be 2e6 (within rounding tolerance of 1 unit)
            assertApproxEqAbs(sum, 2e6, 1, "Sum of payouts should equal 2 USDC");
        }
    }
}
