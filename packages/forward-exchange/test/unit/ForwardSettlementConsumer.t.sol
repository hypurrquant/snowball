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

        // PnL: notional * (1450 - 1400) / 1450 = 100000e6 * 50e18 / 1450e18
        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;

        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

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
        int256 pnl = int256(NOTIONAL) * (settlementRate - FORWARD_RATE) / settlementRate;
        // pnl is negative

        // Short wins: winner=bob, loser=alice
        bytes memory report = _buildReport(longId, settlementRate, pnl, bob, alice);

        vm.prank(forwarder);
        consumer.onReport("", report);

        assertTrue(forward.isSettled(longId));
    }

    function test_onReport_RevertsWhenNotForwarder() public {
        (uint256 longId,) = _createMaturedPosition();

        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

        vm.prank(alice); // Not the forwarder
        vm.expectRevert(ForwardSettlementConsumer.UnauthorizedForwarder.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenAlreadySettled() public {
        (uint256 longId,) = _createMaturedPosition();

        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

        // First settlement
        vm.prank(forwarder);
        consumer.onReport("", report);

        // Second attempt should fail (Forward.settleFromConsumer checks settled)
        vm.prank(forwarder);
        vm.expectRevert(IForward.PositionAlreadySettled.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenNotMatured() public {
        uint256 maturityTime = block.timestamp + 1 days;
        (uint256 longId,) = _createAndAcceptForward(NOTIONAL, FORWARD_RATE, maturityTime);
        // Do NOT warp past maturity

        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

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

        int256 pnl = 1000e6;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

        vm.prank(forwarder);
        vm.expectRevert(ForwardSettlementConsumer.PositionNotActive.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenInvalidSettlementRate() public {
        (uint256 longId,) = _createMaturedPosition();

        bytes memory report = _buildReport(longId, 0, 0, alice, bob);

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

        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

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

        int256 pnl = int256(NOTIONAL) * (SETTLEMENT_RATE - FORWARD_RATE) / SETTLEMENT_RATE;
        bytes memory report = _buildReport(longId, SETTLEMENT_RATE, pnl, alice, bob);

        vm.prank(forwarder);
        vm.expectEmit(true, false, false, true);
        emit ForwardSettlementConsumer.CRESettlement(longId, SETTLEMENT_RATE, pnl, alice, bob);
        consumer.onReport("", report);
    }
}
