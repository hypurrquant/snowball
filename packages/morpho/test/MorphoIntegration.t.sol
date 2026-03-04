// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";

import {Morpho} from "morpho-blue/Morpho.sol";
import {IMorpho, MarketParams, Id, Market} from "morpho-blue/interfaces/IMorpho.sol";
import {IIrm} from "morpho-blue/interfaces/IIrm.sol";
import {IOracle} from "morpho-blue/interfaces/IOracle.sol";
import {MarketParamsLib} from "morpho-blue/libraries/MarketParamsLib.sol";
import {SharesMathLib} from "morpho-blue/libraries/SharesMathLib.sol";

import {CreditcoinOracle} from "../src/adapters/CreditcoinOracle.sol";

/// @dev Simple mock ERC20 for testing
contract MockERC20 is Test {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @dev Simple mock IRM
contract MockIrm is IIrm {
    uint256 public constant RATE = 1585489599; // ~5% APY per second

    function borrowRate(MarketParams memory, Market memory) external pure override returns (uint256) {
        return RATE;
    }

    function borrowRateView(MarketParams memory, Market memory) external pure override returns (uint256) {
        return RATE;
    }
}

contract MorphoIntegrationTest is Test {
    using MarketParamsLib for MarketParams;

    Morpho public morpho;
    CreditcoinOracle public oracle;
    MockIrm public irm;
    MockERC20 public loanToken;
    MockERC20 public collToken;
    MarketParams public marketParams;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        // Deploy Morpho
        morpho = new Morpho(address(this));

        // Deploy mocks
        oracle = new CreditcoinOracle(1e36); // 1:1 price
        irm = new MockIrm();
        loanToken = new MockERC20("sbUSD", "sbUSD");
        collToken = new MockERC20("wCTC", "wCTC");

        // Enable IRM and LLTV
        morpho.enableIrm(address(irm));
        morpho.enableLltv(0.8e18); // 80% LLTV

        // Create market
        marketParams = MarketParams({
            loanToken: address(loanToken),
            collateralToken: address(collToken),
            oracle: address(oracle),
            irm: address(irm),
            lltv: 0.8e18
        });
        morpho.createMarket(marketParams);

        // Fund actors
        loanToken.mint(alice, 100_000e18);
        collToken.mint(bob, 100_000e18);

        vm.prank(alice);
        loanToken.approve(address(morpho), type(uint256).max);

        vm.prank(bob);
        collToken.approve(address(morpho), type(uint256).max);
    }

    function test_deployment() public view {
        assertEq(morpho.owner(), address(this));
        assertTrue(morpho.isIrmEnabled(address(irm)));
        assertTrue(morpho.isLltvEnabled(0.8e18));
    }

    function test_supplyAndBorrow() public {
        // Alice supplies loan tokens
        vm.prank(alice);
        (uint256 assetsSupplied,) = morpho.supply(marketParams, 10_000e18, 0, alice, "");
        assertEq(assetsSupplied, 10_000e18);

        // Bob supplies collateral and borrows
        vm.startPrank(bob);
        morpho.supplyCollateral(marketParams, 10_000e18, bob, "");
        (uint256 assetsBorrowed,) = morpho.borrow(marketParams, 5_000e18, 0, bob, bob);
        vm.stopPrank();

        assertEq(assetsBorrowed, 5_000e18);
        assertEq(loanToken.balanceOf(bob), 5_000e18);
    }

    function test_supplyBorrowRepay() public {
        // Alice supplies
        vm.prank(alice);
        morpho.supply(marketParams, 10_000e18, 0, alice, "");

        // Bob borrows
        vm.startPrank(bob);
        morpho.supplyCollateral(marketParams, 10_000e18, bob, "");
        morpho.borrow(marketParams, 5_000e18, 0, bob, bob);

        // Bob repays
        loanToken.approve(address(morpho), type(uint256).max);
        morpho.repay(marketParams, 5_000e18, 0, bob, "");
        vm.stopPrank();
    }

    function test_oracleAdapter() public view {
        assertEq(oracle.price(), 1e36);
    }

    function test_oraclePriceUpdate() public {
        oracle.setPrice(2e36); // 2:1 price
        assertEq(oracle.price(), 2e36);
    }

    function test_marketCreation() public view {
        Id marketId = marketParams.id();
        (,,,,uint128 lastUpdate,) = morpho.market(marketId);
        assertTrue(lastUpdate > 0, "Market should be initialized");
    }
}
