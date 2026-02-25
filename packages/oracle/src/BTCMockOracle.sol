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
    function fetchPrice() external view returns (uint256, bool) {
        bool isFresh = (block.timestamp - lastUpdated) <= MAX_PRICE_AGE;
        return (price, isFresh);
    }

    /// @inheritdoc IBTCMockOracle
    function getPrice() external view returns (uint256) {
        require(
            lastUpdated > 0 && (block.timestamp - lastUpdated) <= MAX_PRICE_AGE,
            "BTCMockOracle: stale price"
        );
        return price * 1e18; // scale to 1e36
    }

    /// @inheritdoc IBTCMockOracle
    function verifyAndGetPrice(bytes calldata, uint256) external view returns (uint256) {
        require(
            lastUpdated > 0 && (block.timestamp - lastUpdated) <= MAX_PRICE_AGE,
            "BTCMockOracle: stale price"
        );
        return price;
    }
}
