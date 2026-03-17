// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {CREOracleAdapter} from "../src/oracle/CREOracleAdapter.sol";
import {OracleGuard} from "../src/oracle/OracleGuard.sol";
import {Vault} from "../src/infrastructure/Vault.sol";
import {RiskManager} from "../src/infrastructure/RiskManager.sol";
import {IRiskManager} from "../src/interfaces/IRiskManager.sol";
import {SettlementEngine} from "../src/infrastructure/SettlementEngine.sol";
import {Forward} from "../src/primitives/forward/Forward.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

/// @title BaseTest
/// @notice Shared test setup for all Forward Exchange tests (UUPS proxy pattern)
abstract contract BaseTest is Test {
    // ─── Contracts ───────────────────────────────────────────────────────
    CREOracleAdapter public creAdapter;
    OracleGuard public oracleGuard;
    Vault public vault;
    RiskManager public riskManager;
    SettlementEngine public settlementEngine;
    Forward public forward;
    ERC20Mock public usdc;

    // ─── Actors ──────────────────────────────────────────────────────────
    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public keeper = makeAddr("keeper");

    // ─── Constants ───────────────────────────────────────────────────────
    bytes32 public constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 public constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 public constant USD_KRW_MARKET = keccak256("USD/KRW");
    bytes32 public constant USD_JPY_MARKET = keccak256("USD/JPY");

    // USD/KRW ~1400, USD/JPY ~150 (prices in 18-decimal format)
    int256 public constant KRW_PRICE_18D = 1400e18;
    int256 public constant JPY_PRICE_18D = 150e18;

    uint256 public constant INITIAL_USDC = 1_000_000e6; // 1M USDC
    uint256 public constant NOTIONAL = 100_000e6;        // 100K USDC

    uint256 public constant SETTLEMENT_WINDOW = 1 hours;
    uint256 public constant MAX_STALENESS = 60; // 60 seconds
    uint256 public constant MAX_DEVIATION_BPS = 1000; // 10%

    function setUp() public virtual {
        vm.startPrank(admin);

        // 1. Deploy mock USDC
        usdc = new ERC20Mock("USD Coin", "USDC", 6);

        // 2. Deploy CREOracleAdapter (not upgradeable)
        creAdapter = new CREOracleAdapter(admin, MAX_STALENESS, MAX_DEVIATION_BPS);

        // 3. Deploy OracleGuard (not upgradeable)
        oracleGuard = new OracleGuard(address(creAdapter), admin);

        // 4. Deploy Vault (UUPS proxy)
        vault = Vault(address(new ERC1967Proxy(
            address(new Vault()),
            abi.encodeCall(Vault.initialize, (address(usdc), admin))
        )));

        // 5. Deploy RiskManager (UUPS proxy)
        riskManager = RiskManager(address(new ERC1967Proxy(
            address(new RiskManager()),
            abi.encodeCall(RiskManager.initialize, (admin))
        )));

        // 6. Deploy Forward (UUPS proxy)
        forward = Forward(address(new ERC1967Proxy(
            address(new Forward()),
            abi.encodeCall(Forward.initialize, (address(vault), address(riskManager), address(oracleGuard), admin))
        )));

        // 7. Deploy SettlementEngine (UUPS proxy)
        settlementEngine = SettlementEngine(address(new ERC1967Proxy(
            address(new SettlementEngine()),
            abi.encodeCall(SettlementEngine.initialize, (
                address(forward), address(oracleGuard), address(vault),
                address(riskManager), admin, SETTLEMENT_WINDOW
            ))
        )));

        // 8. Wire up roles
        vault.grantRole(vault.OPERATOR_ROLE(), address(forward));
        vault.grantRole(vault.OPERATOR_ROLE(), address(settlementEngine));
        forward.setSettlementEngine(address(settlementEngine));

        // RiskManager operators
        riskManager.setOperator(address(forward), true);
        riskManager.setOperator(address(settlementEngine), true);

        // 9. Configure markets
        riskManager.addMarket(USD_KRW_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_KRW_FEED_ID,
            maxPositionSize: 10_000_000e6,    // 10M USDC
            maxOpenInterest: 100_000_000e6,    // 100M USDC
            maxConcentrationBps: 2000,          // 20%
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));

        riskManager.addMarket(USD_JPY_MARKET, IRiskManager.MarketConfig({
            priceFeedId: USD_JPY_FEED_ID,
            maxPositionSize: 10_000_000e6,
            maxOpenInterest: 100_000_000e6,
            maxConcentrationBps: 2000,
            minMaturity: 1 days,
            maxMaturity: 365 days,
            active: true
        }));

        // 10. Seed oracle last known prices
        creAdapter.seedLastKnownPrice(USD_KRW_FEED_ID, KRW_PRICE_18D);
        creAdapter.seedLastKnownPrice(USD_JPY_FEED_ID, JPY_PRICE_18D);

        vm.stopPrank();

        // 11. Fund users with USDC
        _fundUser(alice, INITIAL_USDC);
        _fundUser(bob, INITIAL_USDC);
        _fundUser(carol, INITIAL_USDC);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _fundUser(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _depositToVault(address user, uint256 amount) internal {
        vm.prank(user);
        vault.deposit(amount);
    }

    /// @dev Seed a price in the CRE oracle adapter (18-decimal format)
    function _seedOraclePrice(bytes32 feedId, int256 price18d) internal {
        vm.prank(admin);
        creAdapter.setPrice(feedId, price18d);
    }

    /// @dev Create empty price update data (CRE adapter ignores it)
    function _emptyPriceUpdate() internal pure returns (bytes[] memory) {
        return new bytes[](0);
    }

    /// @dev Create a standard forward offer: Alice goes long, Bob accepts short
    function _createAndAcceptForward(
        uint256 notional,
        int256 forwardRate,
        uint256 maturityTime
    ) internal returns (uint256 longTokenId, uint256 shortTokenId) {
        _depositToVault(alice, notional);
        _depositToVault(bob, notional);

        vm.prank(alice);
        (longTokenId, shortTokenId) = forward.createOffer(
            USD_KRW_MARKET,
            notional,
            forwardRate,
            maturityTime,
            true // Alice is long
        );

        vm.prank(bob);
        forward.acceptOffer(shortTokenId);
    }
}
