// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {SnowballYieldVaultV2} from "../src/SnowballYieldVaultV2.sol";
import {ISnowballStrategy} from "../src/interfaces/ISnowballStrategy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAsset is ERC20 {
    constructor() ERC20("Mock Asset", "MOCK") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockStrategy is ISnowballStrategy {
    IERC20 public wantToken;
    address public override vault;
    uint256 internal _balance;

    constructor(address _want, address _vault) {
        wantToken = IERC20(_want);
        vault = _vault;
    }

    function want() external view override returns (address) { return address(wantToken); }
    function beforeDeposit() external override {}
    function deposit() external override {
        // Only count newly received tokens (total held minus already tracked)
        uint256 held = wantToken.balanceOf(address(this));
        uint256 newTokens = held - _balance;
        _balance += newTokens;
    }
    function withdraw(uint256 _amount) external override {
        if (_amount > _balance) _amount = _balance;
        _balance -= _amount;
        wantToken.transfer(vault, _amount);
    }
    function balanceOf() external view override returns (uint256) { return _balance; }
    function balanceOfWant() external view override returns (uint256) { return wantToken.balanceOf(address(this)); }
    function balanceOfPool() external view override returns (uint256) { return _balance; }
    function harvest() external override {}
    function retireStrat() external override {
        uint256 bal = wantToken.balanceOf(address(this));
        if (bal > 0) wantToken.transfer(vault, bal);
        _balance = 0;
    }
    function panic() external override {}
    function pause() external override {}
    function unpause() external override {}
    function paused() external pure override returns (bool) { return false; }
    function rewardsAvailable() external pure override returns (uint256) { return 0; }
    function callReward() external pure override returns (uint256) { return 0; }
    function depositFee() external pure override returns (uint256) { return 0; }
    function withdrawFee() external pure override returns (uint256) { return 0; }
}

contract SnowballYieldVaultV2Test is Test {
    SnowballYieldVaultV2 vault;
    MockAsset asset;
    MockStrategy strategy;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        asset = new MockAsset();
        vault = new SnowballYieldVaultV2(IERC20(address(asset)), "Snow Vault", "svMOCK");
        strategy = new MockStrategy(address(asset), address(vault));
        vault.setStrategy(address(strategy));

        // Fund users
        asset.mint(alice, 10000e18);
        asset.mint(bob, 10000e18);

        vm.prank(alice);
        asset.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        asset.approve(address(vault), type(uint256).max);
    }

    // ─── ERC-4626 standard functions ─────────────────────

    function test_deposit_and_shares() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1000e18, alice);

        assertGt(shares, 0);
        assertEq(vault.balanceOf(alice), shares);
    }

    function test_mint_shares() public {
        // Preview how many assets needed for 1000 shares
        uint256 assetsNeeded = vault.previewMint(1000e18);

        vm.prank(alice);
        uint256 assets = vault.mint(1000e18, alice);

        assertEq(assets, assetsNeeded);
        assertEq(vault.balanceOf(alice), 1000e18);
    }

    function test_withdraw_assets() public {
        vm.startPrank(alice);
        vault.deposit(1000e18, alice);

        uint256 shares = vault.withdraw(500e18, alice, alice);
        vm.stopPrank();

        assertGt(shares, 0);
        assertGe(asset.balanceOf(alice), 9500e18); // got back 500
    }

    function test_redeem_shares() public {
        vm.startPrank(alice);
        vault.deposit(1000e18, alice);
        uint256 totalShares = vault.balanceOf(alice);

        uint256 assets = vault.redeem(totalShares, alice, alice);
        vm.stopPrank();

        assertGt(assets, 0);
        assertEq(vault.balanceOf(alice), 0);
    }

    function test_previewDeposit() public {
        uint256 shares = vault.previewDeposit(1000e18);
        assertGt(shares, 0);
    }

    function test_previewWithdraw() public {
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        uint256 shares = vault.previewWithdraw(500e18);
        assertGt(shares, 0);
    }

    function test_previewRedeem() public {
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        uint256 assets = vault.previewRedeem(vault.balanceOf(alice));
        assertGt(assets, 0);
    }

    function test_previewMint() public {
        uint256 assets = vault.previewMint(1000e18);
        assertGt(assets, 0);
    }

    // ─── totalAssets includes strategy ───────────────────

    function test_totalAssets_includes_strategy() public {
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        // After deposit, earn() pushes to strategy
        assertEq(vault.totalAssets(), 1000e18);
        // Idle should be ~0, strategy should hold ~1000e18
        assertEq(asset.balanceOf(address(vault)), 0);
    }

    // ─── getPricePerFullShare compatibility ──────────────

    function test_getPricePerFullShare_initial() public {
        assertEq(vault.getPricePerFullShare(), 1e18);
    }

    function test_getPricePerFullShare_after_deposit() public {
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        // Should still be ~1e18 (no yield yet)
        uint256 ppfs = vault.getPricePerFullShare();
        assertApproxEqAbs(ppfs, 1e18, 1); // allow rounding of 1 wei
    }

    // ─── Strategy timelock ──────────────────────────────

    function test_setStrategy_onlyOnce() public {
        // Strategy already set in setUp
        MockStrategy newStrat = new MockStrategy(address(asset), address(vault));
        vm.expectRevert("!already");
        vault.setStrategy(address(newStrat));
    }

    function test_proposeStrat_and_upgradeStrat() public {
        MockStrategy newStrat = new MockStrategy(address(asset), address(vault));

        // First deposit some assets
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        // Propose
        vault.proposeStrat(address(newStrat));

        // Cannot upgrade before delay
        vm.expectRevert("!delay");
        vault.upgradeStrat();

        // Warp past delay
        vm.warp(block.timestamp + 48 hours + 1);
        vault.upgradeStrat();

        assertEq(address(vault.strategy()), address(newStrat));
    }

    function test_proposeStrat_onlyOwner() public {
        MockStrategy newStrat = new MockStrategy(address(asset), address(vault));
        vm.prank(alice);
        vm.expectRevert();
        vault.proposeStrat(address(newStrat));
    }

    // ─── Token recovery ─────────────────────────────────

    function test_inCaseTokensGetStuck() public {
        MockAsset stuckToken = new MockAsset();
        stuckToken.mint(address(vault), 100e18);

        vault.inCaseTokensGetStuck(address(stuckToken));
        assertEq(stuckToken.balanceOf(address(this)), 100e18);
    }

    function test_inCaseTokensGetStuck_rejectsAsset() public {
        vm.expectRevert("!token");
        vault.inCaseTokensGetStuck(address(asset));
    }

    // ─── Multi-user deposit/withdraw ────────────────────

    function test_multiUser_deposit_withdraw() public {
        vm.prank(alice);
        vault.deposit(1000e18, alice);

        vm.prank(bob);
        vault.deposit(2000e18, bob);

        assertEq(vault.totalAssets(), 3000e18);

        // Bob withdraws 1000 assets
        vm.prank(bob);
        vault.withdraw(1000e18, bob, bob);

        // After withdrawing 1000 from 3000, 2000 remain
        assertApproxEqAbs(vault.totalAssets(), 2000e18, 2);
    }
}
