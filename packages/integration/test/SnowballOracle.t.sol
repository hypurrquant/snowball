// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {SnowballOracle} from "../src/oracle/SnowballOracle.sol";
import {LiquityPriceFeedAdapter} from "../src/oracle/LiquityPriceFeedAdapter.sol";
import {MorphoOracleAdapter} from "../src/oracle/MorphoOracleAdapter.sol";
import {ISnowballOracle} from "../src/interfaces/ISnowballOracle.sol";

contract SnowballOracleTest is Test {
    SnowballOracle oracle;
    LiquityPriceFeedAdapter liquityAdapter;
    MorphoOracleAdapter morphoAdapter;

    address admin = address(this);
    address operator = makeAddr("operator");
    address asset1 = makeAddr("WCTC");
    address asset2 = makeAddr("sbUSD");
    address nobody = makeAddr("nobody");

    uint256 constant PRICE_1E18 = 50000e18; // $50,000 at 1e18
    uint256 constant MAX_AGE = 120; // 2 minutes

    function setUp() public {
        oracle = new SnowballOracle(admin);
        oracle.grantRole(oracle.OPERATOR_ROLE(), operator);

        // Bootstrap initial price (admin-only, required before updatePrice)
        oracle.bootstrapPrice(asset1, PRICE_1E18);

        liquityAdapter = new LiquityPriceFeedAdapter(address(oracle), asset1, MAX_AGE);
        morphoAdapter = new MorphoOracleAdapter(address(oracle), asset1, MAX_AGE);
    }

    // ─── SnowballOracle tests ────────────────────────────

    function test_updatePrice() public {
        vm.prank(operator);
        oracle.updatePrice(asset1, PRICE_1E18);

        assertEq(oracle.getPrice(asset1), PRICE_1E18);
        assertEq(oracle.lastUpdatedAt(asset1), block.timestamp);
    }

    function test_updatePrice_multiAsset() public {
        // Bootstrap asset2 first (admin), then operator can update
        oracle.bootstrapPrice(asset2, 1e18);

        assertEq(oracle.getPrice(asset1), PRICE_1E18);
        assertEq(oracle.getPrice(asset2), 1e18);
    }

    function test_updatePrice_revertsForNonOperator() public {
        vm.prank(nobody);
        vm.expectRevert();
        oracle.updatePrice(asset1, PRICE_1E18);
    }

    function test_updatePrice_revertsForZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert("SnowballOracle: zero address");
        oracle.updatePrice(address(0), PRICE_1E18);
    }

    function test_updatePrice_revertsForZeroPrice() public {
        vm.prank(operator);
        vm.expectRevert("SnowballOracle: zero price");
        oracle.updatePrice(asset1, 0);
    }

    function test_updatePrice_deviationCheck() public {
        // Price is 50000e18. 10% deviation = 5000e18.
        // Trying to set price to 44000e18 (12% drop) should fail.
        vm.prank(operator);
        vm.expectRevert("SnowballOracle: deviation too large");
        oracle.updatePrice(asset1, 44000e18);
    }

    function test_updatePrice_withinDeviation() public {
        // 5% increase is within 10% cap
        vm.prank(operator);
        oracle.updatePrice(asset1, 52500e18); // +5%
        assertEq(oracle.getPrice(asset1), 52500e18);
    }

    function test_renounceAdminRole_reverts() public {
        bytes32 adminRole = oracle.DEFAULT_ADMIN_ROLE();
        vm.expectRevert("SnowballOracle: cannot renounce admin");
        oracle.renounceRole(adminRole, admin);
    }

    function test_renounceOperatorRole_allowed() public {
        bytes32 operatorRole = oracle.OPERATOR_ROLE();
        vm.prank(operator);
        oracle.renounceRole(operatorRole, operator);
    }

    function test_setMaxDeviation() public {
        oracle.setMaxDeviation(500); // 5%
        assertEq(oracle.maxDeviationBps(), 500);
    }

    function test_isFresh_true() public {
        assertTrue(oracle.isFresh(asset1, MAX_AGE));
    }

    function test_isFresh_false_stale() public {
        vm.warp(block.timestamp + MAX_AGE + 1);
        assertFalse(oracle.isFresh(asset1, MAX_AGE));
    }

    function test_isFresh_false_neverUpdated() public {
        assertFalse(oracle.isFresh(asset2, MAX_AGE)); // asset2 never updated
    }

    function test_emitsPriceUpdated() public {
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit ISnowballOracle.PriceUpdated(asset1, PRICE_1E18, block.timestamp);
        oracle.updatePrice(asset1, PRICE_1E18);
    }

    // ─── LiquityPriceFeedAdapter tests ───────────────────

    function test_liquity_fetchPrice_fresh() public {
        (uint256 price, bool failure) = liquityAdapter.fetchPrice();
        assertEq(price, PRICE_1E18);
        assertFalse(failure);
    }

    function test_liquity_fetchPrice_stale() public {
        liquityAdapter.fetchPrice(); // cache lastGoodPrice

        vm.warp(block.timestamp + MAX_AGE + 1);
        (uint256 price, bool failure) = liquityAdapter.fetchPrice();
        assertEq(price, PRICE_1E18); // returns cached
        assertTrue(failure);
    }

    function test_liquity_initialPrice_nonZero() public view {
        assertEq(liquityAdapter.lastGoodPrice(), PRICE_1E18);
    }

    function test_liquity_constructor_revertsNoPrice() public {
        SnowballOracle newOracle = new SnowballOracle(admin);
        address newAsset = makeAddr("NEW");
        vm.expectRevert("LiquityAdapter: no initial price");
        new LiquityPriceFeedAdapter(address(newOracle), newAsset, MAX_AGE);
    }

    function test_liquity_fetchRedemptionPrice() public {
        (uint256 price, bool failure) = liquityAdapter.fetchRedemptionPrice();
        assertEq(price, PRICE_1E18);
        assertFalse(failure);
    }

    function test_liquity_lastGoodPrice_cached() public {
        liquityAdapter.fetchPrice();
        assertEq(liquityAdapter.lastGoodPrice(), PRICE_1E18);
    }

    // ─── MorphoOracleAdapter tests ───────────────────────

    function test_morpho_price_converts_to_1e36() public {
        uint256 morphoPrice = morphoAdapter.price();
        assertEq(morphoPrice, PRICE_1E18 * 1e18); // 1e36
    }

    function test_morpho_price_revertsWhenStale() public {
        vm.warp(block.timestamp + MAX_AGE + 1);
        vm.expectRevert("MorphoAdapter: stale price");
        morphoAdapter.price();
    }

    function test_morpho_price_revertsWhenZero() public {
        // Create adapter for an asset with no price
        SnowballOracle newOracle = new SnowballOracle(admin);
        address newAsset = makeAddr("NOPRICE");
        MorphoOracleAdapter adapter = new MorphoOracleAdapter(address(newOracle), newAsset, MAX_AGE);
        vm.expectRevert("MorphoAdapter: zero price");
        adapter.price();
    }
}
