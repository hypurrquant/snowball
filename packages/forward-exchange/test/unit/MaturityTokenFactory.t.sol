// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC20Mock} from "../mocks/ERC20Mock.sol";
import {MaturityTokenFactory} from "../../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {MaturityToken} from "../../src/tokenized/MaturityToken.sol";
import {EscrowVault} from "../../src/tokenized/EscrowVault.sol";
import {OracleGuard} from "../../src/oracle/OracleGuard.sol";
import {CREOracleAdapter} from "../../src/oracle/CREOracleAdapter.sol";

contract MaturityTokenFactoryTest is Test {
    ERC20Mock public usdc;
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    EscrowVault public escrow;
    MaturityTokenFactory public factory;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public nonAdmin = makeAddr("nonAdmin");

    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");
    int256 public constant FORWARD_RATE = 1400e18;

    uint256 public maturityTime;

    function setUp() public {
        maturityTime = block.timestamp + 90 days;

        vm.startPrank(admin);

        usdc = new ERC20Mock("USDC", "USDC", 6);
        creAdapter = new CREOracleAdapter(admin, 60, 1000);
        oracleGuard = new OracleGuard(address(creAdapter), admin);
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, 1400e18);

        escrow = new EscrowVault(address(usdc), admin);
        factory = new MaturityTokenFactory(address(usdc), address(escrow), address(oracleGuard), admin);

        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);

        vm.stopPrank();

        usdc.mint(alice, 10_000_000e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
    }

    // ─── Constructor ─────────────────────────────────────────────────

    function test_Constructor_RevertsWhen_ZeroAddress() public {
        vm.expectRevert();
        new MaturityTokenFactory(address(0), address(escrow), address(oracleGuard), admin);
    }

    // ─── createSeries ────────────────────────────────────────────────

    function test_CreateSeries_Success() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        IMaturityTokenFactory.Series memory s = factory.getSeries(sid);
        assertEq(s.marketId, USD_KRW_MARKET);
        assertEq(s.maturityTime, maturityTime);
        assertEq(s.forwardRate, FORWARD_RATE);
        assertFalse(s.settled);
        assertTrue(s.fToken != address(0));
        assertTrue(s.sfToken != address(0));
    }

    function test_CreateSeries_TokenCounterpartsLinked() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        IMaturityTokenFactory.Series memory s = factory.getSeries(sid);
        assertEq(MaturityToken(s.fToken).counterpart(), s.sfToken);
        assertEq(MaturityToken(s.sfToken).counterpart(), s.fToken);
    }

    function test_CreateSeries_RevertsWhen_PastMaturity() public {
        vm.prank(admin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, block.timestamp - 1, FORWARD_RATE);
    }

    function test_CreateSeries_RevertsWhen_ZeroRate() public {
        vm.prank(admin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, maturityTime, 0);
    }

    function test_CreateSeries_RevertsWhen_NegativeRate() public {
        vm.prank(admin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, maturityTime, -1);
    }

    function test_CreateSeries_RevertsWhen_Duplicate() public {
        vm.prank(admin);
        factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.prank(admin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
    }

    function test_CreateSeries_RevertsWhen_NotCreatorRole() public {
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
    }

    function test_CreateSeries_AddedToActiveList() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        bytes32[] memory active = factory.getActiveSeriesIds();
        assertEq(active.length, 1);
        assertEq(active[0], sid);
    }

    // ─── mint ────────────────────────────────────────────────────────

    function test_Mint_Success() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        IMaturityTokenFactory.Series memory s = factory.getSeries(sid);

        vm.prank(alice);
        factory.mint(sid, 1000e18);

        assertEq(MaturityToken(s.fToken).balanceOf(alice), 1000e18);
        assertEq(MaturityToken(s.sfToken).balanceOf(alice), 1000e18);
        assertEq(escrow.seriesBalance(sid), 2000e6); // 1000 tokens * 2 USDC each
    }

    function test_Mint_RevertsWhen_ZeroAmount() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.prank(alice);
        vm.expectRevert();
        factory.mint(sid, 0);
    }

    function test_Mint_RevertsWhen_SeriesNotFound() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.mint(keccak256("nonexistent"), 100e18);
    }

    function test_Mint_RevertsWhen_SeriesSettled() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);
        factory.settleSeries(sid, new bytes[](0));

        vm.prank(alice);
        vm.expectRevert();
        factory.mint(sid, 100e18);
    }

    function test_Mint_USDCCostCorrect() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        factory.mint(sid, 500e18);

        // 500 tokens * 2 USDC = 1000 USDC (6 dec)
        assertEq(aliceBefore - usdc.balanceOf(alice), 1000e6);
    }

    // ─── settleSeries ────────────────────────────────────────────────

    function test_SettleSeries_Success() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1350e18);
        factory.settleSeries(sid, new bytes[](0));

        IMaturityTokenFactory.Series memory s = factory.getSeries(sid);
        assertTrue(s.settled);
    }

    function test_SettleSeries_RemovedFromActiveList() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);
        factory.settleSeries(sid, new bytes[](0));

        assertEq(factory.getActiveSeriesIds().length, 0);
    }

    function test_SettleSeries_RevertsWhen_NotMature() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.expectRevert();
        factory.settleSeries(sid, new bytes[](0));
    }

    function test_SettleSeries_RevertsWhen_AlreadySettled() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);
        factory.settleSeries(sid, new bytes[](0));

        vm.expectRevert();
        factory.settleSeries(sid, new bytes[](0));
    }

    // ─── settleSeriesFromConsumer ─────────────────────────────────────

    function test_SettleSeriesFromConsumer_Success() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        address consumer = makeAddr("consumer");
        vm.startPrank(admin);
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), consumer);
        vm.stopPrank();

        vm.warp(maturityTime);
        vm.prank(consumer);
        factory.settleSeriesFromConsumer(sid, 1350e18);

        assertTrue(factory.getSeries(sid).settled);
    }

    function test_SettleSeriesFromConsumer_RevertsWhen_NotConsumer() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.warp(maturityTime);
        vm.prank(nonAdmin);
        vm.expectRevert();
        factory.settleSeriesFromConsumer(sid, 1350e18);
    }

    function test_SettleSeriesFromConsumer_RevertsWhen_ZeroRate() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        address consumer = makeAddr("consumer");
        vm.startPrank(admin);
        factory.grantRole(factory.CRE_CONSUMER_ROLE(), consumer);
        vm.stopPrank();

        vm.warp(maturityTime);
        vm.prank(consumer);
        vm.expectRevert();
        factory.settleSeriesFromConsumer(sid, 0);
    }

    // ─── Pause ───────────────────────────────────────────────────────

    function test_Pause_BlocksCreateSeries() public {
        vm.prank(admin);
        factory.pause();

        vm.prank(admin);
        vm.expectRevert();
        factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
    }

    function test_Pause_BlocksMint() public {
        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);

        vm.prank(admin);
        factory.pause();

        vm.prank(alice);
        vm.expectRevert();
        factory.mint(sid, 100e18);
    }

    function test_Unpause_AllowsOperations() public {
        vm.prank(admin);
        factory.pause();

        vm.prank(admin);
        factory.unpause();

        vm.prank(admin);
        bytes32 sid = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        assertTrue(sid != bytes32(0));
    }

    // ─── getSeriesId ─────────────────────────────────────────────────

    function test_GetSeriesId_Deterministic() public view {
        bytes32 id1 = factory.getSeriesId(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        bytes32 id2 = factory.getSeriesId(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        assertEq(id1, id2);
    }

    function test_GetSeriesId_DifferentForDifferentParams() public view {
        bytes32 id1 = factory.getSeriesId(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        bytes32 id2 = factory.getSeriesId(USD_KRW_MARKET, maturityTime + 1, FORWARD_RATE);
        assertTrue(id1 != id2);
    }

    // ─── Multiple Series ─────────────────────────────────────────────

    function test_MultipleSeries_ActiveTracking() public {
        vm.startPrank(admin);
        bytes32 sid1 = factory.createSeries(USD_KRW_MARKET, maturityTime, 1400e18);
        bytes32 sid2 = factory.createSeries(USD_KRW_MARKET, maturityTime + 1 days, 1410e18);
        bytes32 sid3 = factory.createSeries(USD_KRW_MARKET, maturityTime + 2 days, 1420e18);
        vm.stopPrank();

        assertEq(factory.getActiveSeriesIds().length, 3);

        // Settle one
        vm.warp(maturityTime);
        vm.prank(admin);
        creAdapter.setPrice(USD_KRW_FEED_ID, 1400e18);
        factory.settleSeries(sid1, new bytes[](0));

        assertEq(factory.getActiveSeriesIds().length, 2);
    }
}
