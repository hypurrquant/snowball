// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISnowballOptions {
    enum Direction { Over, Under }
    enum RoundStatus { Open, Locked, Settled }

    struct FilledOrder {
        address overUser;
        address underUser;
        uint256 amount;       // each side's stake (1:1 match)
        bool settled;
    }

    struct Round {
        uint256 roundId;
        uint256 lockPrice;    // price at round lock (1e18)
        uint256 closePrice;   // price at settlement (1e18)
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        uint256 duration;     // round duration in seconds
        RoundStatus status;
        uint256 totalOverAmount;
        uint256 totalUnderAmount;
        uint256 orderCount;
    }

    event RoundStarted(uint256 indexed roundId, uint256 lockPrice, uint256 lockTimestamp, uint256 duration);
    event OrderFilled(uint256 indexed roundId, uint256 indexed orderId, address overUser, address underUser, uint256 amount);
    event RoundExecuted(uint256 indexed roundId, uint256 closePrice);
    event OrderSettled(uint256 indexed roundId, uint256 indexed orderId, address winner, uint256 payout);
    event CommissionFeeUpdated(uint256 oldFee, uint256 newFee);

    function submitFilledOrders(
        uint256 roundId,
        address[] calldata overUsers,
        address[] calldata underUsers,
        uint256[] calldata amounts
    ) external;

    function startRound(uint256 duration) external;
    function executeRound(uint256 roundId) external;
    function settleOrders(uint256 roundId, uint256 batchSize) external;

    function currentRoundId() external view returns (uint256);
    function getRound(uint256 roundId) external view returns (Round memory);
    function getOrder(uint256 roundId, uint256 orderId) external view returns (FilledOrder memory);
    function commissionFee() external view returns (uint256);
}
