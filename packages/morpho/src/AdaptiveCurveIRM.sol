// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

// Snowball IRM -- Adaptive Curve Interest Rate Model
// Fork of morpho-blue-irm (GPL-2.0)

/**
 * @title AdaptiveCurveIRM
 * @notice Adaptive interest rate model that adjusts based on utilization.
 *         Rate increases when utilization > target, decreases when below.
 */
contract AdaptiveCurveIRM {
    int256 internal constant CURVE_STEEPNESS = 4e18;
    int256 internal constant ADJUSTMENT_SPEED = int256(50e18) / 365 days;
    int256 internal constant TARGET_UTILIZATION = 0.9e18;
    int256 internal constant INITIAL_RATE_AT_TARGET = int256(0.1e18) / 365 days;
    int256 internal constant MIN_RATE_AT_TARGET = int256(0.001e18) / 365 days;
    int256 internal constant MAX_RATE_AT_TARGET = int256(2e18) / 365 days;

    mapping(bytes32 => int256) public rateAtTarget;

    event BorrowRateUpdate(bytes32 indexed id, uint256 avgBorrowRate, int256 rateAtTarget);

    constructor(address snowballLend) {}

    function borrowRate(
        bytes32 id,
        uint256 totalSupplyAssets,
        uint256 totalBorrowAssets,
        uint256 lastUpdate
    ) external returns (uint256) {
        uint256 utilization = totalSupplyAssets == 0
            ? 0
            : (totalBorrowAssets * 1e18) / totalSupplyAssets;
        int256 err = int256(utilization) - TARGET_UTILIZATION;
        int256 elapsed = int256(block.timestamp - lastUpdate);
        int256 currentRateAtTarget = rateAtTarget[id];
        if (currentRateAtTarget == 0) currentRateAtTarget = INITIAL_RATE_AT_TARGET;

        int256 newRateAtTarget = currentRateAtTarget + (ADJUSTMENT_SPEED * err * elapsed) / 1e18;
        if (newRateAtTarget < MIN_RATE_AT_TARGET) newRateAtTarget = MIN_RATE_AT_TARGET;
        if (newRateAtTarget > MAX_RATE_AT_TARGET) newRateAtTarget = MAX_RATE_AT_TARGET;
        rateAtTarget[id] = newRateAtTarget;

        uint256 borrowRateValue;
        if (utilization <= uint256(TARGET_UTILIZATION)) {
            borrowRateValue = uint256(newRateAtTarget) * utilization / uint256(TARGET_UTILIZATION);
        } else {
            uint256 excessUtil = utilization - uint256(TARGET_UTILIZATION);
            uint256 maxUtil = 1e18 - uint256(TARGET_UTILIZATION);
            borrowRateValue = uint256(newRateAtTarget)
                + uint256(newRateAtTarget) * uint256(CURVE_STEEPNESS) * excessUtil / maxUtil / 1e18;
        }

        emit BorrowRateUpdate(id, borrowRateValue, newRateAtTarget);
        return borrowRateValue;
    }

    function borrowRateView(
        bytes32 id,
        uint256 totalSupplyAssets,
        uint256 totalBorrowAssets
    ) external view returns (uint256) {
        uint256 utilization = totalSupplyAssets == 0
            ? 0
            : (totalBorrowAssets * 1e18) / totalSupplyAssets;
        int256 currentRateAtTarget = rateAtTarget[id];
        if (currentRateAtTarget == 0) currentRateAtTarget = INITIAL_RATE_AT_TARGET;

        if (utilization <= uint256(TARGET_UTILIZATION)) {
            return uint256(currentRateAtTarget) * utilization / uint256(TARGET_UTILIZATION);
        } else {
            uint256 excessUtil = utilization - uint256(TARGET_UTILIZATION);
            uint256 maxUtil = 1e18 - uint256(TARGET_UTILIZATION);
            return uint256(currentRateAtTarget)
                + uint256(currentRateAtTarget) * uint256(CURVE_STEEPNESS) * excessUtil / maxUtil / 1e18;
        }
    }
}
