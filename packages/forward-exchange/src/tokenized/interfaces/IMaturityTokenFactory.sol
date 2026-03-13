// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IMaturityTokenFactory
/// @notice Interface for creating and managing maturity token series
interface IMaturityTokenFactory {
    // ─── Structs ───

    struct Series {
        bytes32 marketId;
        uint256 maturityTime;
        int256 forwardRate;
        address fToken;
        address sfToken;
        bool settled;
    }

    // ─── Errors ───
    error ZeroAmount();
    error ZeroAddress();
    error SeriesAlreadyExists(bytes32 seriesId);
    error SeriesNotFound(bytes32 seriesId);
    error SeriesAlreadySettled(bytes32 seriesId);
    error SeriesNotMature(bytes32 seriesId);
    error InvalidMaturity();
    error InvalidForwardRate();

    // ─── Events ───
    event SeriesCreated(
        bytes32 indexed seriesId,
        bytes32 indexed marketId,
        uint256 maturityTime,
        int256 forwardRate,
        address fToken,
        address sfToken
    );
    event Minted(bytes32 indexed seriesId, address indexed user, uint256 amount, uint256 usdcCost);
    event SeriesSettled(bytes32 indexed seriesId, int256 settlementRate);

    // ─── Mutative ───

    /// @notice Create a new maturity token series
    /// @param marketId Market identifier (e.g., keccak256("USD/KRW"))
    /// @param maturityTime Unix timestamp of maturity
    /// @param forwardRate Forward exchange rate (18 decimals)
    /// @return seriesId The unique series identifier
    function createSeries(
        bytes32 marketId,
        uint256 maturityTime,
        int256 forwardRate
    ) external returns (bytes32 seriesId);

    /// @notice Mint fToken + sfToken pair by depositing USDC
    /// @param seriesId The series to mint for
    /// @param amount Number of token pairs to mint (18 decimals)
    function mint(bytes32 seriesId, uint256 amount) external;

    /// @notice Settle a matured series using oracle price
    /// @param seriesId The series to settle
    /// @param priceUpdate Oracle price update data
    function settleSeries(bytes32 seriesId, bytes[] calldata priceUpdate) external payable;

    /// @notice Settle a matured series via CRE consumer (no oracle call)
    /// @param seriesId The series to settle
    /// @param settlementRate The settlement exchange rate (18 decimals)
    function settleSeriesFromConsumer(bytes32 seriesId, int256 settlementRate) external;

    // ─── Views ───

    function getSeries(bytes32 seriesId) external view returns (Series memory);
    function getSeriesId(bytes32 marketId, uint256 maturityTime, int256 forwardRate) external pure returns (bytes32);
    function getActiveSeriesIds() external view returns (bytes32[] memory);
}
