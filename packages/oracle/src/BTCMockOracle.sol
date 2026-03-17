// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IBTCMockOracle} from "./interfaces/IBTCMockOracle.sol";

/// @title BTCMockOracle
/// @notice Mock oracle for BTC price on Creditcoin Testnet (replaces Pyth/Chainlink)
/// @dev Prices are stored in 1e18 scale. An operator (backend bot) pushes prices.
contract BTCMockOracle is IBTCMockOracle, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public price;
    uint256 public lastUpdated;
    uint256 public constant MAX_PRICE_AGE = 120; // 2 minutes

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /// @inheritdoc IBTCMockOracle
    function updatePrice(uint256 _price) external onlyRole(OPERATOR_ROLE) {
        require(_price > 0, "BTCMockOracle: zero price");
        price = _price;
        lastUpdated = block.timestamp;
        emit PriceUpdated(_price, block.timestamp);
    }

    /// @inheritdoc IBTCMockOracle
    /// @dev Returns price in 1e18 scale (same as stored) and a freshness flag.
    function fetchPrice() external view returns (uint256, bool) {
        bool isFresh = (block.timestamp - lastUpdated) <= MAX_PRICE_AGE;
        return (price, isFresh); // price is in 1e18 scale
    }

    /// @inheritdoc IBTCMockOracle
    /// @dev Returns price in 1e36 scale as required by Morpho Blue (price stored at 1e18, multiplied by 1e18).
    function getPrice() external view returns (uint256) {
        require(
            lastUpdated > 0 && (block.timestamp - lastUpdated) <= MAX_PRICE_AGE,
            "BTCMockOracle: stale price"
        );
        return price * 1e18; // 1e18 (stored) * 1e18 = 1e36 scale for Morpho Blue
    }

    /// @inheritdoc IBTCMockOracle
    /// @dev Returns price in 1e18 scale (same as fetchPrice, ignores updateData).
    function verifyAndGetPrice(bytes calldata, uint256) external view returns (uint256) {
        require(
            lastUpdated > 0 && (block.timestamp - lastUpdated) <= MAX_PRICE_AGE,
            "BTCMockOracle: stale price"
        );
        return price; // price is in 1e18 scale, consistent with fetchPrice()
    }
}
