// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../BaseTest.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ForwardSettlementConsumer} from "../../src/cre/ForwardSettlementConsumer.sol";
import {IForward} from "../../src/interfaces/IForward.sol";
import {IReceiver} from "../../src/cre/IReceiver.sol";

contract ForwardSettlementConsumerTest is BaseTest {
    ForwardSettlementConsumer public consumer;
    address public forwarder = makeAddr("forwarder");

    int256 constant FORWARD_RATE = 1400e18;   // USD/KRW = 1400
    int256 constant SETTLEMENT_RATE = 1450e18; // USD/KRW = 1450 (KRW weakened → Long wins)

    function setUp() public override {
        super.setUp();

        vm.startPrank(admin);

        // Deploy consumer (UUPS proxy)
        consumer = ForwardSettlementConsumer(address(new ERC1967Proxy(
            address(new ForwardSettlementConsumer()),
            abi.encodeCall(ForwardSettlementConsumer.initialize, (
                address(forward), address(vault), address(riskManager), forwarder, admin
            ))
        )));

        // Grant roles: consumer needs OPERATOR_ROLE on vault, CRE_CONSUMER_ROLE on forward
        vault.grantRole(vault.OPERATOR_ROLE(), address(consumer));
        forward.grantRole(forward.CRE_CONSUMER_ROLE(), address(consumer));
        riskManager.setOperator(address(consumer), true);

        vm.stopPrank();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _createMaturedPosition() internal returns (uint256 longId, uint256 shortId) {
        uint256 maturityTime = block.timestamp + 1 days;
        (longId, shortId) = _createAndAcceptForward(NOTIONAL, FORWARD_RATE, maturityTime);
        // Warp past maturity
        vm.warp(maturityTime + 1);
    }

    function _buildReport(
        uint256 positionId,
        int256 settlementRate,
        int256 /* pnl */,
        address /* winner */,
        address /* loser */
    ) internal pure returns (bytes memory) {
        return abi.encode(
            ForwardSettlementConsumer.SettlementReport({
                positionId: positionId,
                settlementRate: settlementRate
            })
        );
    }

    // ─── Tests ───────────────────────────────────────────────────────────

    function test_onReport_SettlesPosition_LongWins() public {
        (uint256 longId,) = _createMaturedPosition();

        // PnL computed by SettlementEngine: notional * (settlementRate - forwardRate) / forwardRate
        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / FORWARD_RATE;

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        uint256 aliceFreeBefore = vault.freeBalance(alice);
        uint256 bobFreeBefore = vault.freeBalance(bob);

        vm.prank(forwarder);
        consumer.onReport("", report);

        // Verify position is settled
        assertTrue(forward.isSettled(longId));

        // Verify collateral redistribution
        uint256 absPnl = uint256(pnl);
        assertEq(vault.freeBalance(alice), aliceFreeBefore + NOTIONAL + absPnl);
        assertEq(vault.freeBalance(bob), bobFreeBefore + NOTIONAL - absPnl);
    }

    function test_onReport_SettlesPosition_ShortWins() public {
        (uint256 longId,) = _createMaturedPosition();

        // Settlement rate < forward rate → Short wins
        int256 settlementRate = 1350e18;

        // winner/loser determined on-chain; just pass settlementRate
        bytes memory report = _buildReport(longId, settlementRate, 0, address(0), address(0));

        vm.prank(forwarder);
        consumer.onReport("", report);

        assertTrue(forward.isSettled(longId));
    }

    function test_onReport_RevertsWhenNotForwarder() public {
        (uint256 longId,) = _createMaturedPosition();

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        vm.prank(alice); // Not the forwarder
        vm.expectRevert(ForwardSettlementConsumer.UnauthorizedForwarder.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenAlreadySettled() public {
        (uint256 longId,) = _createMaturedPosition();

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        // First settlement
        vm.prank(forwarder);
        consumer.onReport("", report);

        // Second attempt with different metadata (different hash to bypass replay protection)
        // but same position ID — should fail because position is already settled
        vm.prank(forwarder);
        vm.expectRevert(ForwardSettlementConsumer.PositionAlreadySettled.selector);
        consumer.onReport("v2", report);
    }

    function test_onReport_RevertsWhenNotMatured() public {
        uint256 maturityTime = block.timestamp + 1 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, FORWARD_RATE, maturityTime);
        // Do NOT warp past maturity

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        vm.prank(forwarder);
        vm.expectRevert(ForwardSettlementConsumer.MaturityNotReached.selector);
        consumer.onReport("", report);
    }

    function test_settleFromConsumer_RevertsWithoutRole() public {
        (uint256 longId,) = _createMaturedPosition();

        // Try calling settleFromConsumer directly without CRE_CONSUMER_ROLE
        vm.prank(alice);
        vm.expectRevert();
        forward.settleFromConsumer(longId, int256(1350e18));
    }

    function test_onReport_RevertsWhenPositionNotActive() public {
        // Create offer but don't accept it
        _depositToVault(alice, NOTIONAL);
        vm.prank(alice);
        (uint256 longId,) = forward.createOffer(
            USD_KRW_MARKET, NOTIONAL, FORWARD_RATE, block.timestamp + 1 days, true
        );

        vm.warp(block.timestamp + 1 days + 1);

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        vm.prank(forwarder);
        vm.expectRevert(ForwardSettlementConsumer.PositionNotActive.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenInvalidSettlementRate() public {
        (uint256 longId,) = _createMaturedPosition();

        bytes memory report = _buildReport(longId, 0, 0, address(0), address(0));

        vm.prank(forwarder);
        vm.expectRevert(ForwardSettlementConsumer.InvalidSettlementRate.selector);
        consumer.onReport("", report);
    }

    function test_onReport_DeregistersOI() public {
        (uint256 longId,) = _createMaturedPosition();

        uint256 longOIBefore = riskManager.getOpenInterest(USD_KRW_MARKET, true);
        uint256 shortOIBefore = riskManager.getOpenInterest(USD_KRW_MARKET, false);
        assertEq(longOIBefore, NOTIONAL);
        assertEq(shortOIBefore, NOTIONAL);

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        vm.prank(forwarder);
        consumer.onReport("", report);

        assertEq(riskManager.getOpenInterest(USD_KRW_MARKET, true), 0);
        assertEq(riskManager.getOpenInterest(USD_KRW_MARKET, false), 0);
    }

    function test_initialize_RevertsOnZeroAddress() public {
        ForwardSettlementConsumer impl = new ForwardSettlementConsumer();

        vm.expectRevert(ForwardSettlementConsumer.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(ForwardSettlementConsumer.initialize, (
            address(0), address(vault), address(riskManager), forwarder, admin
        )));

        vm.expectRevert(ForwardSettlementConsumer.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(ForwardSettlementConsumer.initialize, (
            address(forward), address(0), address(riskManager), forwarder, admin
        )));

        vm.expectRevert(ForwardSettlementConsumer.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(ForwardSettlementConsumer.initialize, (
            address(forward), address(vault), address(0), forwarder, admin
        )));

        vm.expectRevert(ForwardSettlementConsumer.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(ForwardSettlementConsumer.initialize, (
            address(forward), address(vault), address(riskManager), address(0), admin
        )));

        vm.expectRevert(ForwardSettlementConsumer.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), abi.encodeCall(ForwardSettlementConsumer.initialize, (
            address(forward), address(vault), address(riskManager), forwarder, address(0)
        )));
    }

    function test_supportsInterface_IReceiver() public view {
        assertTrue(consumer.supportsInterface(type(IReceiver).interfaceId));
    }

    function test_setForwarder() public {
        address newForwarder = makeAddr("newForwarder");
        vm.prank(admin);
        consumer.setForwarder(newForwarder);
        assertEq(consumer.FORWARDER(), newForwarder);
    }

    function test_onReport_EmitsCRESettlementEvent() public {
        (uint256 longId,) = _createMaturedPosition();

        // PnL now computed on-chain: (settlementRate - forwardRate) * notional / 1e18
        int256 pnl = (SETTLEMENT_RATE - FORWARD_RATE) * int256(NOTIONAL) / 1e18;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, 0, address(0), address(0));

        vm.prank(forwarder);
        vm.expectEmit(true, false, false, true);
        // winner and loser are always address(0) — computed on-chain but not emitted
        emit ForwardSettlementConsumer.CRESettlement(longId, SETTLEMENT_RATE, pnl, address(0), address(0));
        consumer.onReport("", report);
    }
}
