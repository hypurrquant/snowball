// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AaveOracleAdapter} from "./AaveOracleAdapter.sol";

/// @title AaveOracleAdapterFactory - Deploys AaveOracleAdapter instances
/// @notice Convenience factory for deploying one or many AaveOracleAdapter contracts
///         in a single transaction. Emits an event for each adapter created so that
///         deployment can be tracked off-chain (e.g., by a deployment script).
contract AaveOracleAdapterFactory {
    event AdapterDeployed(
        address indexed adapter,
        address indexed snowballOracle,
        address indexed asset,
        uint256 maxPriceAge
    );

    /// @notice Deploy a single AaveOracleAdapter.
    /// @param snowballOracle Address of the SnowballOracle.
    /// @param asset          Address of the asset whose price the adapter exposes.
    /// @param maxPriceAge    Maximum acceptable age (seconds) of the oracle price.
    /// @return adapter       Address of the newly deployed AaveOracleAdapter.
    function deployAdapter(
        address snowballOracle,
        address asset,
        uint256 maxPriceAge
    ) external returns (address adapter) {
        adapter = address(new AaveOracleAdapter(snowballOracle, asset, maxPriceAge));
        emit AdapterDeployed(adapter, snowballOracle, asset, maxPriceAge);
    }

    /// @notice Deploy AaveOracleAdapter instances for multiple assets in one transaction.
    /// @param snowballOracle Address of the SnowballOracle shared by all adapters.
    /// @param assets         Ordered list of asset addresses.
    /// @param maxPriceAge    Maximum acceptable age (seconds) applied to all adapters.
    /// @return adapters      Addresses of the newly deployed adapters, in the same order
    ///                       as `assets`.
    function deployAdapters(
        address snowballOracle,
        address[] calldata assets,
        uint256 maxPriceAge
    ) external returns (address[] memory adapters) {
        uint256 len = assets.length;
        require(len > 0, "AaveAdapterFactory: empty assets");
        adapters = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            address adapter = address(new AaveOracleAdapter(snowballOracle, assets[i], maxPriceAge));
            adapters[i] = adapter;
            emit AdapterDeployed(adapter, snowballOracle, assets[i], maxPriceAge);
        }
    }
}
