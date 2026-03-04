// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {ISnowballOracle} from "../interfaces/ISnowballOracle.sol";

/// @title LiquityPriceFeedAdapter - Adapts SnowballOracle to Liquity IPriceFeed
/// @notice Returns price at 1e18 precision. If oracle is stale, returns lastGoodPrice
///         with oracleFailure=true. Constructor requires initial price to avoid zero fallback.
contract LiquityPriceFeedAdapter is IPriceFeed {
    ISnowballOracle public immutable oracle;
    address public immutable asset;
    uint256 public immutable maxPriceAge;

    uint256 public override lastGoodPrice;

    constructor(address _oracle, address _asset, uint256 _maxPriceAge) {
        require(_oracle != address(0), "LiquityAdapter: zero oracle");
        require(_asset != address(0), "LiquityAdapter: zero asset");
        require(_maxPriceAge > 0, "LiquityAdapter: zero maxAge");
        oracle = ISnowballOracle(_oracle);
        asset = _asset;
        maxPriceAge = _maxPriceAge;

        // M-1 fix: require initial price to prevent zero lastGoodPrice
        uint256 initialPrice = ISnowballOracle(_oracle).getPrice(_asset);
        require(initialPrice > 0, "LiquityAdapter: no initial price");
        lastGoodPrice = initialPrice;
    }

    /// @notice Fetch price from SnowballOracle. Non-view to match Liquity interface.
    function fetchPrice() external override returns (uint256 price, bool oracleFailure) {
        return _fetchPriceInternal();
    }

    /// @notice Redemption price uses the same logic as fetchPrice.
    function fetchRedemptionPrice() external override returns (uint256 price, bool oracleFailure) {
        return _fetchPriceInternal();
    }

    function _fetchPriceInternal() internal returns (uint256 price, bool oracleFailure) {
        uint256 currentPrice = oracle.getPrice(asset);
        bool fresh = oracle.isFresh(asset, maxPriceAge);

        if (fresh && currentPrice > 0) {
            lastGoodPrice = currentPrice;
            return (currentPrice, false);
        }

        // Oracle stale or zero — return cached price with failure flag
        return (lastGoodPrice, true);
    }
}
