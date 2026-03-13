// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

contract RiskManagerTest is BaseTest {
    function test_AddMarket_Success() public {
        IRiskManager.MarketConfig memory config = riskManager.getMarketConfig(USD_KRW_MARKET);
        assertEq(config.priceFeedId, USD_KRW_FEED_ID);
        assertTrue(config.active);
        assertEq(config.maxConcentrationBps, 2000);
    }

    function test_AddMarket_RevertsWhen_AlreadyExists() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(
            RiskManager.MarketAlreadyExists.selector, USD_KRW_MARKET
        ));
        riskManager.addMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 1e6,
            maxOpenInterest: 1e6,
            maxConcentrationBps: 2000,
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));
    }

    function test_ValidateNewPosition_Success() public view {
        riskManager.validateNewPosition(
            USD_KRW_MARKET,
            alice,
            NOTIONAL,
            block.timestamp + 30 days,
            true
        );
    }

    function test_ValidateNewPosition_RevertsWhen_MarketInactive() public {
        vm.prank(admin);
        riskManager.deactivateMarket(USD_KRW_MARKET);

        vm.expectRevert(abi.encodeWithSelector(
            RiskManager.MarketNotActive.selector, USD_KRW_MARKET
        ));
        riskManager.validateNewPosition(
            USD_KRW_MARKET, alice, NOTIONAL, block.timestamp + 30 days, true
        );
    }

    function test_ValidateNewPosition_RevertsWhen_PositionTooLarge() public {
        vm.expectRevert(abi.encodeWithSelector(
            RiskManager.PositionTooLarge.selector, 11_000_000e6, 10_000_000e6
        ));
        riskManager.validateNewPosition(
            USD_KRW_MARKET, alice, 11_000_000e6, block.timestamp + 30 days, true
        );
    }

    function test_ValidateNewPosition_RevertsWhen_MaturityTooShort() public {
        vm.expectRevert();
        riskManager.validateNewPosition(
            USD_KRW_MARKET, alice, NOTIONAL, block.timestamp + 1 hours, true
        );
    }

    function test_ValidateNewPosition_RevertsWhen_MaturityTooLong() public {
        vm.expectRevert();
        riskManager.validateNewPosition(
            USD_KRW_MARKET, alice, NOTIONAL, block.timestamp + 400 days, true
        );
    }

    function test_RegisterDeregister_OI() public {
        vm.startPrank(admin);
        riskManager.setOperator(admin, true);
        riskManager.registerPosition(USD_KRW_MARKET, alice, NOTIONAL, true);
        assertEq(riskManager.getOpenInterest(USD_KRW_MARKET, true), NOTIONAL);
        assertEq(riskManager.getUserOpenInterest(USD_KRW_MARKET, alice, true), NOTIONAL);

        riskManager.deregisterPosition(USD_KRW_MARKET, alice, NOTIONAL, true);
        assertEq(riskManager.getOpenInterest(USD_KRW_MARKET, true), 0);
        assertEq(riskManager.getUserOpenInterest(USD_KRW_MARKET, alice, true), 0);
        vm.stopPrank();
    }

    function test_UpdateMarket_Success() public {
        vm.prank(admin);
        riskManager.updateMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 5_000_000e6,
            maxOpenInterest: 50_000_000e6,
            maxConcentrationBps: 3000,
            minMaturity: 1 days,
            maxMaturity: 180 days,
            active: true
        }));

        IRiskManager.MarketConfig memory config = riskManager.getMarketConfig(USD_KRW_MARKET);
        assertEq(config.maxPositionSize, 5_000_000e6);
        assertEq(config.maxConcentrationBps, 3000);
    }

    function test_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        riskManager.addMarket(keccak256("TEST"), IRiskManager.MarketConfig({
            priceFeedId: bytes32(uint256(1)),
            maxPositionSize: 1e6,
            maxOpenInterest: 1e6,
            maxConcentrationBps: 2000,
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));
    }

    function test_GetMarketCount() public view {
        assertEq(riskManager.getMarketCount(), 2); // USD/KRW + USD/JPY
    }
}
