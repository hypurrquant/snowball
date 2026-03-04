// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {SnowballYieldVault} from "../src/SnowballYieldVault.sol";
import {SnowballStrategyBase} from "../src/SnowballStrategyBase.sol";
import {ISnowballLend} from "../src/interfaces/ISnowballLend.sol";
import {IStabilityPool} from "../src/interfaces/IStabilityPool.sol";
import {ISwapRouter} from "../src/interfaces/ISwapRouter.sol";
import {StrategySbUSDMorpho} from "../src/strategies/StrategySbUSDMorpho.sol";
import {StrategySbUSDStabilityPool} from "../src/strategies/StrategySbUSDStabilityPool.sol";

// ─── Mock contracts ──────────────────────────────────────────

contract MockERC20 is ERC20 {
    uint8 private _dec;

    constructor(string memory name_, string memory symbol_, uint8 dec_) ERC20(name_, symbol_) {
        _dec = dec_;
    }

    function decimals() public view override returns (uint8) { return _dec; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Minimal mock SwapRouter that swaps 1:1 using test mints.
contract MockSwapRouter is ISwapRouter {
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable override returns (uint256) {
        // Pull input tokens
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        // Mint output tokens 1:1 (mock behavior)
        MockERC20(params.tokenOut).mint(params.recipient, params.amountIn);
        return params.amountIn;
    }
}

/// @dev Minimal mock StabilityPool
contract MockStabilityPool is IStabilityPool {
    MockERC20 public token;
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public collGains;

    constructor(address _token) {
        token = MockERC20(_token);
    }

    function provideToSP(uint256 _amount, bool) external override {
        token.transferFrom(msg.sender, address(this), _amount);
        deposits[msg.sender] += _amount;
    }

    function withdrawFromSP(uint256 _amount, bool _doClaim) external override {
        if (_amount > 0) {
            deposits[msg.sender] -= _amount;
            token.transfer(msg.sender, _amount);
        }
        if (_doClaim && collGains[msg.sender] > 0) {
            uint256 gain = collGains[msg.sender];
            collGains[msg.sender] = 0;
            // Coll gains would be in native token — simplified for test
        }
    }

    function claimAllCollGains() external override {
        collGains[msg.sender] = 0;
    }

    function getCompoundedBoldDeposit(address _depositor) external view override returns (uint256) {
        return deposits[_depositor];
    }

    function getDepositorCollGain(address _depositor) external view override returns (uint256) {
        return collGains[_depositor];
    }

    // Test helper
    function setCollGain(address user, uint256 amount) external {
        collGains[user] = amount;
    }
}

/// @dev Minimal mock Morpho Blue that stores positions
contract MockMorpho is ISnowballLend {
    struct MockPosition {
        uint256 supplyShares;
    }

    struct MockMarket {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    mapping(bytes32 => mapping(address => MockPosition)) internal _positions;
    mapping(bytes32 => MockMarket) internal _markets;
    mapping(bytes32 => address) internal _loanTokens;

    function initMarket(bytes32 id, address loanToken) external {
        _markets[id] = MockMarket(0, 0, 0, 0, uint128(block.timestamp), 0);
        _loanTokens[id] = loanToken;
    }

    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256,
        address onBehalf,
        bytes memory
    ) external override returns (uint256, uint256) {
        bytes32 id = _id(marketParams);
        IERC20(marketParams.loanToken).transferFrom(msg.sender, address(this), assets);

        uint256 shares;
        if (_markets[id].totalSupplyShares == 0) {
            shares = assets;
        } else {
            shares = (assets * uint256(_markets[id].totalSupplyShares)) / uint256(_markets[id].totalSupplyAssets);
        }

        _markets[id].totalSupplyAssets += uint128(assets);
        _markets[id].totalSupplyShares += uint128(shares);
        _positions[id][onBehalf].supplyShares += shares;

        return (assets, shares);
    }

    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external override returns (uint256, uint256) {
        bytes32 id = _id(marketParams);

        if (assets == 0 && shares > 0) {
            assets = (shares * uint256(_markets[id].totalSupplyAssets)) / uint256(_markets[id].totalSupplyShares);
        } else if (shares == 0 && assets > 0) {
            shares = (assets * uint256(_markets[id].totalSupplyShares)) / uint256(_markets[id].totalSupplyAssets);
            if (shares == 0) shares = 1;
        }

        _markets[id].totalSupplyAssets -= uint128(assets);
        _markets[id].totalSupplyShares -= uint128(shares);
        _positions[id][onBehalf].supplyShares -= shares;

        IERC20(marketParams.loanToken).transfer(receiver, assets);
        return (assets, shares);
    }

    function position(bytes32 id, address user) external view override returns (uint256, uint128, uint128) {
        return (_positions[id][user].supplyShares, 0, 0);
    }

    function market(bytes32 id) external view override returns (uint128, uint128, uint128, uint128, uint128, uint128) {
        MockMarket storage m = _markets[id];
        return (m.totalSupplyAssets, m.totalSupplyShares, m.totalBorrowAssets, m.totalBorrowShares, m.lastUpdate, m.fee);
    }

    function accrueInterest(MarketParams memory) external override {
        // no-op in mock
    }

    // Test helper: simulate interest accrual
    function addInterest(bytes32 id, uint128 amount) external {
        _markets[id].totalSupplyAssets += amount;
    }

    function _id(MarketParams memory mp) internal pure returns (bytes32 id) {
        assembly {
            id := keccak256(mp, 160)
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────

contract YieldVaultTest is Test {
    MockERC20 sbUSD;
    MockERC20 wCTC;
    MockSwapRouter router;
    SnowballYieldVault vault;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        sbUSD = new MockERC20("sbUSD", "sbUSD", 18);
        wCTC = new MockERC20("wCTC", "wCTC", 18);
        router = new MockSwapRouter();
        vault = new SnowballYieldVault(IERC20(address(sbUSD)), "Snowball sbUSD Vault", "mooSbUSD");
    }

    function test_vaultDeployment() public view {
        assertEq(address(vault.want()), address(sbUSD));
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.balance(), 0);
    }
}

contract StabilityPoolStrategyTest is Test {
    MockERC20 sbUSD;
    MockERC20 wCTC;
    MockSwapRouter router;
    MockStabilityPool sp;
    SnowballYieldVault vault;
    StrategySbUSDStabilityPool strategy;

    address alice = makeAddr("alice");

    function setUp() public {
        sbUSD = new MockERC20("sbUSD", "sbUSD", 18);
        wCTC = new MockERC20("wCTC", "wCTC", 18);
        router = new MockSwapRouter();
        sp = new MockStabilityPool(address(sbUSD));

        vault = new SnowballYieldVault(IERC20(address(sbUSD)), "Snowball sbUSD Vault", "mooSbUSD");
        strategy = new StrategySbUSDStabilityPool(
            address(vault),
            address(sbUSD),
            address(wCTC),
            address(router),
            3000,           // 0.3% fee tier
            address(this),  // strategist
            address(this),  // treasury
            address(sp)
        );

        vault.setStrategy(address(strategy));

        // Fund alice
        sbUSD.mint(alice, 100_000e18);
        vm.prank(alice);
        sbUSD.approve(address(vault), type(uint256).max);
    }

    function test_depositAndWithdraw() public {
        // Deposit (first deposit loses DEAD_SHARES=1000 to anti-inflation)
        vm.prank(alice);
        vault.deposit(10_000e18);

        uint256 deadShares = vault.DEAD_SHARES();
        assertEq(vault.balanceOf(alice), 10_000e18 - deadShares, "shares minted");
        assertEq(sp.deposits(address(strategy)), 10_000e18, "deposited in SP");

        // Withdraw half of alice's shares
        uint256 aliceShares = vault.balanceOf(alice);
        uint256 halfShares = aliceShares / 2;
        vm.prank(alice);
        vault.withdraw(halfShares);

        assertEq(vault.balanceOf(alice), aliceShares - halfShares, "shares burned");
        assertGt(sbUSD.balanceOf(alice), 90_000e18, "got sbUSD back");
    }

    function test_emergencyPanic() public {
        vm.prank(alice);
        vault.deposit(10_000e18);

        // Owner panics
        strategy.panic();

        assertTrue(strategy.paused(), "strategy paused");
        assertEq(sp.deposits(address(strategy)), 0, "SP fully withdrawn");
        assertGt(sbUSD.balanceOf(address(strategy)), 0, "funds in strategy");
    }

    function test_retireStrat() public {
        vm.prank(alice);
        vault.deposit(10_000e18);

        // Create new strategy for upgrade
        StrategySbUSDStabilityPool newStrat = new StrategySbUSDStabilityPool(
            address(vault),
            address(sbUSD),
            address(wCTC),
            address(router),
            3000,
            address(this),
            address(this),
            address(sp)
        );

        // Propose and wait
        vault.proposeStrat(address(newStrat));
        vm.warp(block.timestamp + 48 hours + 1);
        vault.upgradeStrat();

        assertEq(address(vault.strategy()), address(newStrat));
    }
}

contract MorphoStrategyTest is Test {
    MockERC20 sbUSD;
    MockERC20 wCTC;
    MockSwapRouter router;
    MockMorpho morpho;
    SnowballYieldVault vault;
    StrategySbUSDMorpho strategy;
    ISnowballLend.MarketParams mp;
    bytes32 marketId;

    address alice = makeAddr("alice");

    function setUp() public {
        sbUSD = new MockERC20("sbUSD", "sbUSD", 18);
        wCTC = new MockERC20("wCTC", "wCTC", 18);
        router = new MockSwapRouter();
        morpho = new MockMorpho();

        mp = ISnowballLend.MarketParams({
            loanToken: address(sbUSD),
            collateralToken: address(wCTC),
            oracle: address(0xdead),
            irm: address(0xbeef),
            lltv: 0.8e18
        });

        // Compute market ID
        marketId = _computeId(mp);
        morpho.initMarket(marketId, address(sbUSD));

        vault = new SnowballYieldVault(IERC20(address(sbUSD)), "Snowball sbUSD Vault", "mooSbUSD");
        strategy = new StrategySbUSDMorpho(
            address(vault),
            address(sbUSD),
            address(wCTC),
            address(router),
            3000,
            address(this),
            address(this),
            address(morpho),
            mp
        );

        vault.setStrategy(address(strategy));

        sbUSD.mint(alice, 100_000e18);
        vm.prank(alice);
        sbUSD.approve(address(vault), type(uint256).max);
    }

    function test_morphoDeposit() public {
        vm.prank(alice);
        vault.deposit(10_000e18);

        uint256 deadShares = vault.DEAD_SHARES();
        assertEq(vault.balanceOf(alice), 10_000e18 - deadShares, "shares minted");
        assertEq(strategy.balanceOfPool(), 10_000e18, "pool balance");
    }

    function test_morphoWithdraw() public {
        vm.prank(alice);
        vault.deposit(10_000e18);

        uint256 aliceShares = vault.balanceOf(alice);
        uint256 halfShares = aliceShares / 2;
        vm.prank(alice);
        vault.withdraw(halfShares);

        assertEq(vault.balanceOf(alice), aliceShares - halfShares, "half shares remain");
    }

    function test_morphoEmergencyWithdraw() public {
        vm.prank(alice);
        vault.deposit(10_000e18);

        strategy.panic();

        assertTrue(strategy.paused());
        assertEq(strategy.balanceOfPool(), 0);
        assertEq(sbUSD.balanceOf(address(strategy)), 10_000e18);
    }

    function test_marketIdComputation() public view {
        assertEq(strategy.marketId(), marketId);
    }

    function _computeId(ISnowballLend.MarketParams memory _mp) internal pure returns (bytes32 id) {
        assembly {
            id := keccak256(_mp, 160)
        }
    }
}
