// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IPrimitive.sol";

/// @title IForward
/// @notice Interface for the Forward Exchange primitive
interface IForward is IPrimitive {
    struct ForwardPosition {
        bytes32 marketId;       // Market ID (e.g., USD/KRW, USD/JPY)
        uint256 notional;       // Notional amount (USDC, 6 decimals)
        int256 forwardRate;     // Agreed forward rate (18 decimals)
        uint256 maturityTime;   // Maturity timestamp
        uint256 collateral;     // Locked collateral amount (USDC, 6 decimals)
        address counterparty;   // Counterparty address (0 if open offer)
        address originalOwner;  // Original collateral depositor (for OI tracking)
        bool isLong;            // Long USD = true
        bool settled;           // Settlement completed
        bool locked;            // Locked for structured product
    }

    /// @notice Create a new forward offer
    /// @param marketId The market identifier
    /// @param notional The notional amount (USDC, 6 decimals)
    /// @param forwardRate The proposed forward rate (18 decimals)
    /// @param maturityTime The maturity timestamp
    /// @param isLong Whether the offer is long USD
    /// @return longTokenId The Long position NFT token ID
    /// @return shortTokenId The Short position NFT token ID
    function createOffer(
        bytes32 marketId,
        uint256 notional,
        int256 forwardRate,
        uint256 maturityTime,
        bool isLong
    ) external returns (uint256 longTokenId, uint256 shortTokenId);

    /// @notice Accept an existing forward offer
    /// @param tokenId The token ID of the offer to accept
    function acceptOffer(uint256 tokenId) external;

    /// @notice Cancel an unmatched forward offer
    /// @param tokenId The token ID of the offer to cancel
    function cancelOffer(uint256 tokenId) external;

    /// @notice CRE Consumer settles a position (PnL computed on-chain from DON-reported rate)
    /// @param tokenId The position token ID
    /// @param settlementRate The settlement exchange rate reported by the DON (18 decimals)
    function settleFromConsumer(uint256 tokenId, int256 settlementRate) external;

    /// @notice Get position details
    /// @param tokenId The position NFT token ID
    /// @return The forward position data
    function getPosition(uint256 tokenId) external view returns (ForwardPosition memory);

    /// @notice Get the paired token ID (Long ↔ Short)
    /// @param tokenId The token ID
    /// @return The paired token ID
    function getPairedTokenId(uint256 tokenId) external pure returns (uint256);

    // Events
    event OfferCreated(
        uint256 indexed longTokenId,
        uint256 indexed shortTokenId,
        bytes32 indexed marketId,
        address creator,
        uint256 notional,
        int256 forwardRate,
        uint256 maturityTime,
        bool creatorIsLong
    );

    event OfferAccepted(
        uint256 indexed longTokenId,
        uint256 indexed shortTokenId,
        address indexed acceptor
    );

    event OfferCancelled(uint256 indexed tokenId, address indexed creator);

    event PositionSettled(
        uint256 indexed longTokenId,
        uint256 indexed shortTokenId,
        int256 settlementRate,
        int256 pnl
    );

    event PositionLocked(uint256 indexed tokenId, address indexed locker);
    event PositionUnlocked(uint256 indexed tokenId, address indexed unlocker);

    // Errors
    error PositionNotFound();
    error PositionAlreadySettled();
    error PositionAlreadyLocked();
    error PositionNotLocked();
    error PositionNotActive();
    error OfferAlreadyAccepted();
    error NotOfferCreator();
    error CannotAcceptOwnOffer();
    error MaturityNotReached();
    error InvalidNotional();
    error InvalidForwardRate();
    error InvalidMaturity();
    error InvalidMarket();
    error TransferWhileLocked();
    error PositionIsLocked();
}
