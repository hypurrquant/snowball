// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IMarketplace
/// @notice Interface for the Forward Position Marketplace
interface IMarketplace {
    struct Listing {
        address seller;
        uint256 askPrice;
        uint256 listedAt;
    }

    function list(uint256 tokenId, uint256 askPrice) external;
    function cancelListing(uint256 tokenId) external;
    function updatePrice(uint256 tokenId, uint256 newPrice) external;
    function buy(uint256 tokenId) external;
    function getListing(uint256 tokenId) external view returns (Listing memory);

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 askPrice);
    event Unlisted(uint256 indexed tokenId, address indexed seller);
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);

    error NotTokenOwner();
    error NotListingSeller();
    error ListingNotFound();
    error CannotBuyOwnListing();
    error PositionNotActive();
    error PositionLocked();
    error InvalidPrice();
    error SellerNoLongerOwns();
    error NotApproved();
    error PositionSettled();
    error PositionMatured();
}
