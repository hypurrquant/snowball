// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";

contract SettlementTest is BaseTest {
    function test_CalculatePnL_LongWins() public view {
        // Forward rate: 1400 KRW/USD, Settlement rate: 1450 KRW/USD
        // Long wins when rate goes up (S_T > F_0)
        // PnL = notional * (1450 - 1400) / 1400
        int256 pnl = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1450e18);
        assertTrue(pnl > 0);

        int256 expected = int256(NOTIONAL) * 50e18 / 1400e18;
        assertEq(pnl, expected);
    }

    function test_CalculatePnL_ShortWins() public view {
        // Forward rate: 1400, Settlement rate: 1350
        // Long USD loses when KRW strengthens (rate goes down)
        int256 pnl = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1350e18);
        assertTrue(pnl < 0);
    }

    function test_CalculatePnL_NoChange() public view {
        int256 pnl = settlementEngine.calculatePnL(NOTIONAL, 1400e18, 1400e18);
        assertEq(pnl, 0);
    }

    function testFuzz_CalculatePnL_Symmetry(
        uint256 notional,
        uint256 forwardRateRaw,
        uint256 settlementRateRaw
    ) public view {
        notional = bound(notional, 1e6, 10_000_000e6);
        forwardRateRaw = bound(forwardRateRaw, 100, 10_000);
        settlementRateRaw = bound(settlementRateRaw, 100, 10_000);
        int256 forwardRate = int256(forwardRateRaw) * 1e18;
        int256 settlementRate = int256(settlementRateRaw) * 1e18;

        int256 pnl = settlementEngine.calculatePnL(notional, forwardRate, settlementRate);

        if (settlementRate > forwardRate) {
            assertTrue(pnl > 0, "Long should profit when settlement > forward");
        } else if (settlementRate < forwardRate) {
            assertTrue(pnl < 0, "Long should lose when settlement < forward");
        } else {
            assertEq(pnl, 0, "Zero PnL when rates equal");
        }
    }

    function testFuzz_CalculatePnL_ConsistentSign(
        uint256 notional,
        uint256 forwardRateRaw,
        uint256 settlementRateRaw
    ) public view {
        notional = bound(notional, 1e6, 10_000_000e6);
        forwardRateRaw = bound(forwardRateRaw, 100, 10_000);
        settlementRateRaw = bound(settlementRateRaw, 100, 10_000);
        int256 forwardRate = int256(forwardRateRaw) * 1e18;
        int256 settlementRate = int256(settlementRateRaw) * 1e18;

        int256 pnl = settlementEngine.calculatePnL(notional, forwardRate, settlementRate);

        // PnL magnitude increases with notional
        if (notional > 1e6 && forwardRate != settlementRate) {
            int256 halfPnl = settlementEngine.calculatePnL(notional / 2, forwardRate, settlementRate);
            // Due to integer division, approximate check
            int256 absPnl = pnl < 0 ? -pnl : pnl;
            int256 absHalfPnl = halfPnl < 0 ? -halfPnl : halfPnl;
            assertTrue(absPnl >= absHalfPnl, "PnL should scale with notional");
        }
    }

    function test_Settle_RevertsWhen_BeforeMaturity() public {
        uint256 maturity = block.timestamp + 30 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, 1400e18, maturity);

        _seedOraclePrice(USD_KRW_FEED_ID, KRW_PRICE_18D);
        bytes[] memory updateData = _emptyPriceUpdate();
        vm.expectRevert();
        forward.settle(longId, updateData);
    }

    function test_Settle_RevertsWhen_DirectCallToEngine() public {
        bytes[] memory updateData = _emptyPriceUpdate();
        vm.expectRevert(SettlementEngine.NotForward.selector);
        settlementEngine.settle(2, updateData);
    }
}
