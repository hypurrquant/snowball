// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IRiskManager
/// @notice Interface for the risk management module
interface IRiskManager {
    struct MarketConfig {
        bytes32 priceFeedId;
        uint256 maxPositionSize;     // Maximum single position size (USDC, 6 decimals)
        uint256 maxOpenInterest;     // Maximum total OI per side (USDC, 6 decimals)
        uint256 maxConcentrationBps; // Max single user OI ratio (2000 = 20%)
        uint256 minMaturity;         // Minimum maturity duration in seconds
        uint256 maxMaturity;         // Maximum maturity duration in seconds
        bool active;                 // Whether the market is active
    }

    /// @notice Validate a new position against risk parameters
    /// @param marketId The market identifier
    /// @param user The user creating the position
    /// @param notional The notional amount (USDC, 6 decimals)
    /// @param maturityTimestamp The maturity timestamp
    /// @param isLong Whether this is a long position
    function validateNewPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        uint256 maturityTimestamp,
        bool isLong
    ) external view;

    /// @notice Register a new position's notional in OI tracking
    /// @param marketId The market identifier
    /// @param user The user
    /// @param notional The notional amount
    /// @param isLong Whether long
    function registerPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        bool isLong
    ) external;

    /// @notice Deregister a position's notional from OI tracking (on settlement/cancel)
    /// @param marketId The market identifier
    /// @param user The user
    /// @param notional The notional amount
    /// @param isLong Whether long
    function deregisterPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        bool isLong
    ) external;

    /// @notice Get the market configuration
    /// @param marketId The market identifier
    /// @return The market configuration
    function getMarketConfig(bytes32 marketId) external view returns (MarketConfig memory);

    /// @notice Get the price feed ID for a market
    /// @param marketId The market identifier
    /// @return The price feed ID
    function getPriceFeedId(bytes32 marketId) external view returns (bytes32);
}
