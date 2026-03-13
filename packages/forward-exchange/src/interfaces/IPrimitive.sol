// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IPrimitive
/// @notice Common interface for all financial primitives (Forward, Option, IRS, CCS)
interface IPrimitive {
    /// @notice Lock a position for structured product integration (prevents transfer)
    /// @param tokenId The position NFT token ID
    function lock(uint256 tokenId) external;

    /// @notice Unlock a previously locked position
    /// @param tokenId The position NFT token ID
    function unlock(uint256 tokenId) external;

    /// @notice Settle a position at maturity
    /// @param tokenId The position NFT token ID
    /// @param priceUpdate Oracle price update data
    function settle(uint256 tokenId, bytes[] calldata priceUpdate) external payable;

    /// @notice Get the current fair value (mark-to-market) of a position
    /// @param tokenId The position NFT token ID
    /// @return value The fair value in USDC terms (6 decimals)
    function fairValue(uint256 tokenId) external view returns (int256 value);

    /// @notice Get the maturity timestamp of a position
    /// @param tokenId The position NFT token ID
    /// @return The maturity timestamp
    function maturity(uint256 tokenId) external view returns (uint256);

    /// @notice Check if a position has been settled
    /// @param tokenId The position NFT token ID
    /// @return True if settled
    function isSettled(uint256 tokenId) external view returns (bool);
}
