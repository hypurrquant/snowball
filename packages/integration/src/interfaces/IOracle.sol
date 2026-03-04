// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title IOracle - Morpho Blue oracle interface
/// @dev Copied from packages/morpho/src/morpho-blue/interfaces/IOracle.sol
///      Returns the price of 1 asset of collateral token quoted in 1 asset of loan token,
///      scaled by 1e36.
interface IOracle {
    function price() external view returns (uint256);
}
