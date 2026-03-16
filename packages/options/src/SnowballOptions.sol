// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISnowballOptions} from "./interfaces/ISnowballOptions.sol";
import {IOptionsClearingHouse} from "./interfaces/IOptionsClearingHouse.sol";
import {IOptionsVault} from "./interfaces/IOptionsVault.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title SnowballOptions
/// @notice Binary options engine — manages rounds, orders, and settlement (native CTC)
contract SnowballOptions is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuard,
    ISnowballOptions
{
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant MAX_EXECUTION_DELAY = 300; // 5 minutes
    uint256 public constant MAX_COMMIT_DELAY = 300;    // 5 minutes to commit close price

    IOptionsClearingHouse public clearingHouse;
    IOptionsVault public vault;
    IPriceOracle public oracle;

    uint256 public currentRoundId;
    uint256 public commissionFee; // basis points (500 = 5%)

    bool private _paused;

    mapping(uint256 => Round) private _rounds;
    mapping(uint256 => mapping(uint256 => FilledOrder)) private _orders;
    mapping(uint256 => uint256) private _nextUnsettledIndex; // roundId => next index to settle
    mapping(uint256 => uint256) private _settledCount;       // roundId => number of settled orders

    address private _admin;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _clearingHouse,
        address _vault,
        address _oracle,
        uint256 _commissionFee
    ) external initializer {
        require(_clearingHouse != address(0), "Options: zero clearingHouse");
        require(_vault != address(0), "Options: zero vault");
        require(_oracle != address(0), "Options: zero oracle");
        _admin = admin;
        _roles[ADMIN_ROLE][admin] = true;
        _roles[OPERATOR_ROLE][admin] = true;
        clearingHouse = IOptionsClearingHouse(_clearingHouse);
        vault = IOptionsVault(_vault);
        oracle = IPriceOracle(_oracle);
        commissionFee = _commissionFee;
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Options: unauthorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Options: not admin");
        _;
    }

    modifier whenNotPaused() {
        require(!_paused, "Options: paused");
        _;
    }

    function grantRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function pause() external onlyAdmin {
        _paused = true;
    }

    function unpause() external onlyAdmin {
        _paused = false;
    }

    function paused() external view returns (bool) {
        return _paused;
    }

    // ─── Round Management ───

    function startRound(uint256 duration) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(duration >= 60, "Options: min 60s duration");

        // If there's a previous round, it must be settled
        if (currentRoundId > 0) {
            require(
                _rounds[currentRoundId].status == RoundStatus.Settled,
                "Options: previous round not settled"
            );
        }

        currentRoundId++;

        (uint256 price, bool isFresh) = oracle.fetchPrice();
        require(isFresh, "Options: stale oracle price");

        _rounds[currentRoundId] = Round({
            roundId: currentRoundId,
            lockPrice: price,
            closePrice: 0,
            lockTimestamp: block.timestamp,
            closeTimestamp: block.timestamp + duration,
            duration: duration,
            status: RoundStatus.Open,
            totalOverAmount: 0,
            totalUnderAmount: 0,
            orderCount: 0,
            commissionFee: commissionFee
        });

        emit RoundStarted(currentRoundId, price, block.timestamp, duration);
    }

    // ─── Order Submission (Relayer) ───

    function submitFilledOrders(
        uint256 roundId,
        address[] calldata overUsers,
        address[] calldata underUsers,
        uint256[] calldata amounts
    ) external onlyRole(RELAYER_ROLE) whenNotPaused nonReentrant {
        require(overUsers.length == underUsers.length && underUsers.length == amounts.length, "Options: length mismatch");

        Round storage round = _rounds[roundId];
        require(round.status == RoundStatus.Open, "Options: round not open");
        require(block.timestamp < round.closeTimestamp, "Options: round expired");

        for (uint256 i = 0; i < overUsers.length; i++) {
            uint256 orderId = round.orderCount;
            uint256 amount = amounts[i];

            // Lock escrow for both sides
            clearingHouse.lockInEscrow(overUsers[i], amount);
            clearingHouse.lockInEscrow(underUsers[i], amount);

            _orders[roundId][orderId] = FilledOrder({
                overUser: overUsers[i],
                underUser: underUsers[i],
                amount: amount,
                settled: false
            });

            // totalOverAmount / totalUnderAmount are accumulated for off-chain indexing only;
            // they are intentionally not read by any on-chain settlement logic.
            round.totalOverAmount += amount;
            round.totalUnderAmount += amount;
            round.orderCount++;

            emit OrderFilled(roundId, orderId, overUsers[i], underUsers[i], amount);
        }
    }

    // ─── Round Execution ───

    /// @notice Commits the close price for a round. Anyone can call this after closeTimestamp.
    ///         Must be called before executeRound. Separates price observation from execution.
    function commitClosePrice(uint256 roundId) external {
        Round storage round = _rounds[roundId];
        require(round.status == RoundStatus.Open, "Options: round not open");
        require(block.timestamp >= round.closeTimestamp, "Options: round not expired");
        require(block.timestamp <= round.closeTimestamp + MAX_COMMIT_DELAY, "Options: commit window expired");
        require(round.closePrice == 0, "Options: close price already committed");

        (uint256 price, bool isFresh) = oracle.fetchPrice();
        require(isFresh, "Options: stale oracle price");

        round.closePrice = price;

        emit ClosePriceCommitted(roundId, price);
    }

    function executeRound(uint256 roundId) external onlyRole(OPERATOR_ROLE) {
        require(roundId == currentRoundId, "Options: not current round");
        Round storage round = _rounds[roundId];
        require(round.status == RoundStatus.Open, "Options: round not open");
        require(round.closePrice > 0, "Options: close price not committed");

        round.status = RoundStatus.Locked;

        emit RoundExecuted(roundId, round.closePrice);
    }

    function expireRound(uint256 roundId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(roundId == currentRoundId, "Options: not current round");
        Round storage round = _rounds[roundId];
        require(round.status == RoundStatus.Open, "Options: round not open");
        require(block.timestamp > round.closeTimestamp + MAX_EXECUTION_DELAY, "Options: execution window still open");

        round.status = RoundStatus.Settled;

        // Refund all participants
        uint256 count = round.orderCount;
        for (uint256 i = 0; i < count; i++) {
            FilledOrder storage order = _orders[roundId][i];
            if (!order.settled) {
                order.settled = true;
                clearingHouse.releaseFromEscrow(order.overUser, order.amount);
                clearingHouse.releaseFromEscrow(order.underUser, order.amount);
            }
        }

        emit RoundExpired(roundId);
    }

    // ─── Settlement ───

    function settleOrders(uint256 roundId, uint256 batchSize) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Round storage round = _rounds[roundId];
        require(round.status == RoundStatus.Locked, "Options: round not locked");

        uint256 startIndex = _nextUnsettledIndex[roundId];
        uint256 settled = 0;
        uint256 i = startIndex;

        for (; i < round.orderCount && settled < batchSize; i++) {
            FilledOrder storage order = _orders[roundId][i];

            order.settled = true;
            settled++;

            uint256 fee = (order.amount * round.commissionFee) / FEE_DENOMINATOR;
            uint256 payout = order.amount * 2 - fee;

            address winner;
            address loser;

            if (round.closePrice > round.lockPrice) {
                // Over wins
                winner = order.overUser;
                loser = order.underUser;
            } else if (round.closePrice < round.lockPrice) {
                // Under wins
                winner = order.underUser;
                loser = order.overUser;
            } else {
                // Draw — refund both
                clearingHouse.releaseFromEscrow(order.overUser, order.amount);
                clearingHouse.releaseFromEscrow(order.underUser, order.amount);
                emit OrderSettled(roundId, i, address(0), 0);
                continue;
            }

            // Collect fee from loser's escrow
            clearingHouse.collectFee(loser, fee);
            // Transfer remaining from loser to winner
            clearingHouse.settleEscrow(loser, winner, order.amount - fee);
            // Release winner's own escrow back
            clearingHouse.releaseFromEscrow(winner, order.amount);

            emit OrderSettled(roundId, i, winner, payout);
        }

        _nextUnsettledIndex[roundId] = i;
        _settledCount[roundId] += settled;

        if (_settledCount[roundId] == round.orderCount) {
            round.status = RoundStatus.Settled;
        }
    }

    // ─── Views ───

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function getOrder(uint256 roundId, uint256 orderId) external view returns (FilledOrder memory) {
        return _orders[roundId][orderId];
    }

    function setCommissionFee(uint256 newFee) external onlyAdmin {
        require(newFee <= 2000, "Options: fee too high"); // max 20%
        uint256 old = commissionFee;
        commissionFee = newFee;
        emit CommissionFeeUpdated(old, newFee);
    }

    function setOracle(address _oracle) external onlyAdmin {
        require(_oracle != address(0), "Options: zero oracle");
        oracle = IPriceOracle(_oracle);
    }

    // ─── UUPS ───

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _admin, "Options: not admin");
    }
}
