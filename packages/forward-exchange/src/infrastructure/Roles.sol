// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Roles
/// @notice Central role definitions for the protocol
library Roles {
    /// @notice Vault: can lock/unlock/settle collateral
    bytes32 internal constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice Emergency pause
    bytes32 internal constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Settlement execution
    bytes32 internal constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    /// @notice Structured product integration (lock/unlock positions)
    bytes32 internal constant STRUCTURED_PRODUCT_ROLE = keccak256("STRUCTURED_PRODUCT_ROLE");

    /// @notice Marketplace: can transfer internal balances
    bytes32 internal constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
}
