// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IOracle} from "../interfaces/IOracle.sol";
import {ISnowballOracle} from "../interfaces/ISnowballOracle.sol";

/// @title MorphoSnowballAdapter - Adapts SnowballOracle to Morpho Blue IOracle
/// @notice Converts the 1e18-scaled price from SnowballOracle to the 1e36 scale
///         required by Morpho Blue (ORACLE_PRICE_SCALE).
/// @dev This is a thin wrapper following the same pattern as MorphoOracleAdapter but
///      named explicitly for the Snowball ↔ Morpho integration. Use this contract as
///      the `oracle` parameter when creating a Morpho Blue market where the collateral
///      or loan asset price is sourced from SnowballOracle.
///
///      Scale conversion: price_1e36 = price_1e18 * 1e18
///
///      Reverts on zero or stale price so Morpho Blue transactions fail explicitly
///      rather than silently accepting a bad value.
contract MorphoSnowballAdapter is IOracle {
    ISnowballOracle public immutable oracle;
    address public immutable asset;
    uint256 public immutable maxPriceAge;

    constructor(address _oracle, address _asset, uint256 _maxPriceAge) {
        require(_oracle != address(0), "MorphoSnowball: zero oracle");
        require(_asset != address(0), "MorphoSnowball: zero asset");
        require(_maxPriceAge > 0, "MorphoSnowball: zero maxAge");
        oracle = ISnowballOracle(_oracle);
        asset = _asset;
        maxPriceAge = _maxPriceAge;
    }

    /// @notice Returns the asset price scaled to 1e36 for Morpho Blue.
    /// @dev Reverts if the oracle price is zero or stale.
    function price() external view override returns (uint256) {
        uint256 p = oracle.getPrice(asset);
        require(p > 0, "MorphoSnowball: zero price");
        require(oracle.isFresh(asset, maxPriceAge), "MorphoSnowball: stale price");
        return p * 1e18; // 1e18 → 1e36
    }
}
