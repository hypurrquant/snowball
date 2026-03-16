// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ISnowballOracle} from "../interfaces/ISnowballOracle.sol";

/// @title SnowballOracle - Single source of truth for asset prices
/// @notice Multi-asset oracle storing prices at 1e18 precision.
///         Adapters (Liquity, Morpho) read from this contract.
///         Includes deviation bounds and admin-role renunciation protection.
contract SnowballOracle is ISnowballOracle, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant DEFAULT_MAX_PRICE_AGE = 120; // 2 minutes
    uint256 public constant BPS_DIVISOR = 10000;

    /// @notice Maximum allowed price deviation per update (basis points).
    uint256 public maxDeviationBps = 500; // 5%

    mapping(address asset => uint256 price) internal _prices;
    mapping(address asset => uint256 timestamp) internal _lastUpdatedAt;

    event MaxDeviationUpdated(uint256 newDeviationBps);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /// @notice Bootstrap the initial price for an asset (admin only).
    /// @dev Must be called before any operator can update the price via updatePrice().
    function bootstrapPrice(address asset, uint256 price_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(asset != address(0), "SnowballOracle: zero address");
        require(price_ > 0, "SnowballOracle: zero price");
        require(_prices[asset] == 0, "SnowballOracle: already bootstrapped");

        _prices[asset] = price_;
        _lastUpdatedAt[asset] = block.timestamp;
        emit PriceUpdated(asset, price_, block.timestamp);
    }

    /// @inheritdoc ISnowballOracle
    function updatePrice(address asset, uint256 price_) external onlyRole(OPERATOR_ROLE) {
        require(asset != address(0), "SnowballOracle: zero address");
        require(price_ > 0, "SnowballOracle: zero price");
        require(_prices[asset] > 0, "SnowballOracle: price not bootstrapped");

        // Deviation check: enforce bounds against the existing price
        uint256 oldPrice = _prices[asset];
        uint256 deviation = oldPrice > price_
            ? oldPrice - price_
            : price_ - oldPrice;
        require(
            deviation * BPS_DIVISOR / oldPrice <= maxDeviationBps,
            "SnowballOracle: deviation too large"
        );

        _prices[asset] = price_;
        _lastUpdatedAt[asset] = block.timestamp;
        emit PriceUpdated(asset, price_, block.timestamp);
    }

    /// @inheritdoc ISnowballOracle
    function getPrice(address asset) external view returns (uint256) {
        return _prices[asset];
    }

    /// @inheritdoc ISnowballOracle
    function lastUpdatedAt(address asset) external view returns (uint256) {
        return _lastUpdatedAt[asset];
    }

    /// @inheritdoc ISnowballOracle
    function isFresh(address asset, uint256 maxAge) external view returns (bool) {
        uint256 updated = _lastUpdatedAt[asset];
        if (updated == 0) return false;
        return block.timestamp - updated <= maxAge;
    }

    /// @notice Update the maximum allowed price deviation (admin only).
    function setMaxDeviation(uint256 _bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_bps >= 10 && _bps <= 500, "SnowballOracle: invalid deviation");
        maxDeviationBps = _bps;
        emit MaxDeviationUpdated(_bps);
    }

    /// @dev Prevent renouncing DEFAULT_ADMIN_ROLE to avoid bricking role management.
    function renounceRole(bytes32 role, address callerConfirmation) public override {
        require(role != DEFAULT_ADMIN_ROLE, "SnowballOracle: cannot renounce admin");
        super.renounceRole(role, callerConfirmation);
    }
}
