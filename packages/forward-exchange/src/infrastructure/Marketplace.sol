// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IMarketplace} from "../interfaces/IMarketplace.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IForward} from "../interfaces/IForward.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @title Marketplace
/// @notice Secondary market for trading active Forward positions (ERC-721 NFTs) for USDC
/// @dev Uses Vault internal transfers for USDC settlement, CEI pattern + nonReentrant
contract Marketplace is Initializable, AccessControlUpgradeable, ReentrancyGuard, PausableUpgradeable, UUPSUpgradeable, IMarketplace {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice The Forward contract (ERC-721)
    IForward public FORWARD;

    /// @notice The Vault contract (USDC collateral)
    IVault public VAULT;

    /// @notice Active listings: tokenId => Listing
    mapping(uint256 => Listing) private _listings;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _forward, address _vault, address _admin) external initializer {
        if (_forward == address(0) || _vault == address(0) || _admin == address(0)) {
            revert InvalidPrice(); // reuse for zero-address check in initializer
        }

        __AccessControl_init();

        __Pausable_init();

        FORWARD = IForward(_forward);
        VAULT = IVault(_vault);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /// @notice List a Forward position for sale
    /// @param tokenId The NFT token ID to list
    /// @param askPrice The asking price in USDC (6 decimals)
    function list(uint256 tokenId, uint256 askPrice) external override whenNotPaused {
        if (askPrice == 0) revert InvalidPrice();

        // Caller must own the NFT
        IERC721 nft = IERC721(address(FORWARD));
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        // Position must be active (matched), not settled, not locked, not matured
        IForward.ForwardPosition memory pos = FORWARD.getPosition(tokenId);
        if (pos.counterparty == address(0)) revert PositionNotActive();
        if (pos.settled) revert PositionSettled();
        if (pos.locked) revert PositionLocked();
        if (block.timestamp >= pos.maturityTime) revert PositionMatured();

        // Marketplace must be approved to transfer the NFT
        if (
            nft.getApproved(tokenId) != address(this) &&
            !nft.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        _listings[tokenId] = Listing({
            seller: msg.sender,
            askPrice: askPrice,
            listedAt: block.timestamp
        });

        emit Listed(tokenId, msg.sender, askPrice);
    }

    /// @notice Cancel an active listing
    /// @param tokenId The NFT token ID to delist
    function cancelListing(uint256 tokenId) external override whenNotPaused {
        Listing memory listing = _listings[tokenId];
        if (listing.seller == address(0)) revert ListingNotFound();
        if (listing.seller != msg.sender) revert NotListingSeller();

        delete _listings[tokenId];

        emit Unlisted(tokenId, msg.sender);
    }

    /// @notice Update the ask price of an active listing
    /// @param tokenId The NFT token ID
    /// @param newPrice The new asking price in USDC (6 decimals)
    function updatePrice(uint256 tokenId, uint256 newPrice) external override whenNotPaused {
        if (newPrice == 0) revert InvalidPrice();

        Listing storage listing = _listings[tokenId];
        if (listing.seller == address(0)) revert ListingNotFound();
        if (listing.seller != msg.sender) revert NotListingSeller();

        listing.askPrice = newPrice;

        emit PriceUpdated(tokenId, newPrice);
    }

    /// @notice Buy a listed position (CEI pattern)
    /// @param tokenId The NFT token ID to buy
    function buy(uint256 tokenId) external override nonReentrant whenNotPaused {
        Listing memory listing = _listings[tokenId];

        // ── Checks ──────────────────────────────────────────────────────
        if (listing.seller == address(0)) revert ListingNotFound();
        if (msg.sender == listing.seller) revert CannotBuyOwnListing();

        // Position must still be active and not settled/locked/matured
        IForward.ForwardPosition memory pos = FORWARD.getPosition(tokenId);
        if (pos.settled) revert PositionSettled();
        if (pos.locked) revert PositionLocked();
        if (block.timestamp >= pos.maturityTime) revert PositionMatured();

        // Seller must still own the NFT (stale listing protection)
        IERC721 nft = IERC721(address(FORWARD));
        if (nft.ownerOf(tokenId) != listing.seller) revert SellerNoLongerOwns();

        // Marketplace must still be approved
        if (
            nft.getApproved(tokenId) != address(this) &&
            !nft.isApprovedForAll(listing.seller, address(this))
        ) revert NotApproved();

        // ── Effects ─────────────────────────────────────────────────────
        uint256 price = listing.askPrice;
        address seller = listing.seller;
        delete _listings[tokenId];

        // ── Interactions ────────────────────────────────────────────────
        // Fix #7: Transfer NFT first to prevent seller front-running with approval revocation
        // after USDC has already been sent.
        nft.transferFrom(seller, msg.sender, tokenId);

        // Transfer USDC from buyer to seller via Vault internal balance
        VAULT.internalTransfer(msg.sender, seller, price);

        emit Sold(tokenId, seller, msg.sender, price);
    }

    /// @notice Get listing details for a token
    /// @param tokenId The NFT token ID
    /// @return The listing data (seller is zero address if not listed)
    function getListing(uint256 tokenId) external view override returns (Listing memory) {
        return _listings[tokenId];
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Pause the marketplace (emergency)
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause the marketplace
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @dev Authorize upgrade to a new implementation (admin only)
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
