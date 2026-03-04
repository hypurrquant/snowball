// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IOracle} from "../interfaces/IOracle.sol";
import {ISnowballOracle} from "../interfaces/ISnowballOracle.sol";

/// @title MorphoOracleAdapter - Adapts SnowballOracle to Morpho IOracle
/// @notice Converts 1e18 price from SnowballOracle to 1e36 for Morpho Blue.
///         Reverts if the price is zero or stale.
contract MorphoOracleAdapter is IOracle {
    ISnowballOracle public immutable oracle;
    address public immutable asset;
    uint256 public immutable maxPriceAge;

    constructor(address _oracle, address _asset, uint256 _maxPriceAge) {
        require(_oracle != address(0), "MorphoAdapter: zero oracle");
        require(_asset != address(0), "MorphoAdapter: zero asset");
        require(_maxPriceAge > 0, "MorphoAdapter: zero maxAge");
        oracle = ISnowballOracle(_oracle);
        asset = _asset;
        maxPriceAge = _maxPriceAge;
    }

    /// @notice Returns price scaled to 1e36 for Morpho Blue compatibility.
    /// @dev Reverts if the oracle price is zero or stale.
    function price() external view override returns (uint256) {
        uint256 p = oracle.getPrice(asset);
        require(p > 0, "MorphoAdapter: zero price");
        require(oracle.isFresh(asset, maxPriceAge), "MorphoAdapter: stale price");
        return p * 1e18; // 1e18 → 1e36
    }
}
