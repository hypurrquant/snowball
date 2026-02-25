// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBTCMockOracle {
    event PriceUpdated(uint256 price, uint256 timestamp);

    /// @notice Update the BTC price (1e18 scale)
    function updatePrice(uint256 _price) external;

    /// @notice Liquity-compatible: returns (price, isFresh)
    function fetchPrice() external view returns (uint256, bool);

    /// @notice Morpho-compatible: returns price in 1e36 scale
    function getPrice() external view returns (uint256);

    /// @notice Pyth-compatible: returns price in 1e18 scale (ignores updateData)
    function verifyAndGetPrice(bytes calldata updateData, uint256 maxAge) external view returns (uint256);

    function price() external view returns (uint256);
    function lastUpdated() external view returns (uint256);
    function MAX_PRICE_AGE() external view returns (uint256);
}
