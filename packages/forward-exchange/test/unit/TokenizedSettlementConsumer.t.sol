// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MaturityTokenFactory} from "../../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {TokenizedSettlementConsumer} from "../../src/cre/TokenizedSettlementConsumer.sol";
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";
import {IReceiver} from "../../src/cre/IReceiver.sol";

contract TokenizedSettlementConsumerTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;
    TokenizedSettlementConsumer public consumer;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public forwarder = makeAddr("forwarder");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");

    int256 public constant FORWARD_RATE = 1400e18;
    uint256 public constant POOL_LIFETIME = 90 days;

    uint256 public maturityTime;
    bytes32 public seriesId;

    function setUp() public {
        maturityTime = block.timestamp + POOL_LIFETIME;

        vm.startPrank(admin);

        // Deploy dependencies
        usdc = new ERC20Mock("USDC", "USDC", 6);
        creAdapter = new CREOracleAdapter(admin, 60, 1000);
        oracleGuard = new OracleGuard(address(creAdapter), admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);

        // Deploy tokenized system
        escrow = new EscrowVault(address(usdc), admin);
        factory = new MaturityTokenFactory(
            address(usdc), address(escrow), address(oracleGuard), admin
        );

        // Grant roles to factory
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);

        // Create series
        seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        // Deploy consumer
        consumer = new TokenizedSettlementConsumer(
            address(factory), forwarder, admin
        );

        // Grant CRE_CONSUMER_ROLE to consumer
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), address(consumer));

        vm.stopPrank();

        // Fund and mint tokens for alice
        usdc.mint(alice, 1_000_000e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
        vm.prank(alice);
        factory.mint(seriesId, 1000e18);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _buildReport(bytes32 _seriesId, int256 settlementRate) internal pure returns (bytes memory) {
        return abi.encode(_seriesId, settlementRate);
    }

    // ─── Tests ───────────────────────────────────────────────────────────

    function test_onReport_SettlesSeries() public {
        vm.warp(maturityTime);

        int256 settlementRate = 1300e18; // KRW strengthened
        bytes memory report = _buildReport(seriesId, settlementRate);

        vm.prank(forwarder);
        consumer.onReport("", report);

        // Verify series is settled
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        assertTrue(s.settled);

        // Verify tokens are settled
        assertTrue(MaturityToken(s.fToken).isSettled());
        assertTrue(MaturityToken(s.sfToken).isSettled());

        // fToken = S_T/F_0 = 1300/1400 ≈ 0.9286 → 928571 (6dec)
        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        assertApproxEqAbs(fRate, 928571, 1);

        // sfToken = 2 - 1300/1400 ≈ 1.0714 → 1071428 (6dec)
        uint256 sfRate = MaturityToken(s.sfToken).redemptionRate();
        assertApproxEqAbs(sfRate, 1071428, 1);

        // Sum = 2 USDC
        assertApproxEqAbs(fRate + sfRate, 2e6, 2);
    }

    function test_onReport_EmitsEvent() public {
        vm.warp(maturityTime);

        int256 settlementRate = 1300e18;
        bytes memory report = _buildReport(seriesId, settlementRate);

        vm.prank(forwarder);
        vm.expectEmit(true, false, false, true);
        emit TokenizedSettlementConsumer.CRESeriesSettled(seriesId, settlementRate);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenNotForwarder() public {
        vm.warp(maturityTime);

        bytes memory report = _buildReport(seriesId, 1300e18);

        vm.prank(alice);
        vm.expectRevert(TokenizedSettlementConsumer.UnauthorizedForwarder.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenAlreadySettled() public {
        vm.warp(maturityTime);

        bytes memory report = _buildReport(seriesId, 1300e18);

        // First settlement
        vm.prank(forwarder);
        consumer.onReport("", report);

        // Second attempt with different metadata (different hash to bypass replay protection)
        // but same series ID — should fail because series is already settled
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(IMaturityTokenFactory.SeriesAlreadySettled.selector, seriesId));
        consumer.onReport("v2", report);
    }

    function test_onReport_RevertsWhenNotMature() public {
        // Do NOT warp to maturity
        bytes memory report = _buildReport(seriesId, 1300e18);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(IMaturityTokenFactory.SeriesNotMature.selector, seriesId));
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenSeriesNotFound() public {
        vm.warp(maturityTime);

        bytes32 fakeSeriesId = keccak256("fake");
        bytes memory report = _buildReport(fakeSeriesId, 1300e18);

        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(IMaturityTokenFactory.SeriesNotFound.selector, fakeSeriesId));
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenInvalidRate() public {
        vm.warp(maturityTime);

        bytes memory report = _buildReport(seriesId, 0);

        vm.prank(forwarder);
        vm.expectRevert(TokenizedSettlementConsumer.InvalidSettlementRate.selector);
        consumer.onReport("", report);
    }

    function test_onReport_RevertsWhenNegativeRate() public {
        vm.warp(maturityTime);

        bytes memory report = _buildReport(seriesId, -100e18);

        vm.prank(forwarder);
        vm.expectRevert(TokenizedSettlementConsumer.InvalidSettlementRate.selector);
        consumer.onReport("", report);
    }

    function test_constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(TokenizedSettlementConsumer.ZeroAddress.selector);
        new TokenizedSettlementConsumer(address(0), forwarder, admin);

        vm.expectRevert(TokenizedSettlementConsumer.ZeroAddress.selector);
        new TokenizedSettlementConsumer(address(factory), address(0), admin);

        vm.expectRevert(TokenizedSettlementConsumer.ZeroAddress.selector);
        new TokenizedSettlementConsumer(address(factory), forwarder, address(0));
    }

    function test_supportsInterface_IReceiver() public view {
        assertTrue(consumer.supportsInterface(type(IReceiver).interfaceId));
    }

    function test_setForwarder() public {
        address newForwarder = makeAddr("newForwarder");
        vm.prank(admin);
        consumer.setForwarder(newForwarder);
        assertEq(consumer.forwarder(), newForwarder);
    }

    function test_redeemAfterCRESettlement() public {
        vm.warp(maturityTime);

        // Settle via CRE
        bytes memory report = _buildReport(seriesId, 1300e18);
        vm.prank(forwarder);
        consumer.onReport("", report);

        // Alice redeems fTokens
        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        uint256 aliceFTokens = MaturityToken(s.fToken).balanceOf(alice);
        assertEq(aliceFTokens, 1000e18);

        uint256 fRate = MaturityToken(s.fToken).redemptionRate();
        uint256 expectedUsdc = aliceFTokens * fRate / 1e18;

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        MaturityToken(s.fToken).redeem(aliceFTokens);

        assertApproxEqAbs(usdc.balanceOf(alice) - balBefore, expectedUsdc, 1);
    }
}
