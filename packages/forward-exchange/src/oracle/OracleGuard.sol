// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title OracleGuard
/// @notice Circuit-breaker wrapper around oracle adapters
/// @dev Routes price requests to primary adapter, falls back to secondary if primary fails
contract OracleGuard is IOracleAdapter, Ownable2Step, Pausable {
    /// @notice Primary oracle adapter
    IOracleAdapter public primaryAdapter;

    /// @notice Secondary (fallback) oracle adapter
    IOracleAdapter public secondaryAdapter;

    /// @notice Whether to allow fallback to secondary adapter
    bool public fallbackEnabled;

    // Errors
    error ZeroAddress();
    error PrimaryFailed();
    error FallbackDisabled();
    error OracleGuardPaused();

    // Events
    event PrimaryAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);
    event SecondaryAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);
    event FallbackEnabledUpdated(bool enabled);
    event FallbackUsed(bytes32 indexed feedId);

    constructor(
        address _primaryAdapter,
        address _owner
    ) Ownable(_owner) {
        if (_primaryAdapter == address(0) || _owner == address(0)) revert ZeroAddress();
        primaryAdapter = IOracleAdapter(_primaryAdapter);
    }

    /// @inheritdoc IOracleAdapter
    function getPrice(
        bytes32 feedId,
        bytes[] calldata priceUpdate
    ) external payable override whenNotPaused returns (int256 price, uint256 timestamp) {
        try primaryAdapter.getPrice{value: msg.value}(feedId, priceUpdate) returns (
            int256 _price, uint256 _timestamp
        ) {
            return (_price, _timestamp);
        } catch {
            return _useFallback(feedId, priceUpdate, 0, false);
        }
    }

    /// @inheritdoc IOracleAdapter
    function getSettlementPrice(
        bytes32 feedId,
        bytes[] calldata priceUpdate,
        uint64 settlementTime
    ) external payable override whenNotPaused returns (int256 price, uint256 timestamp) {
        try primaryAdapter.getSettlementPrice{value: msg.value}(feedId, priceUpdate, settlementTime) returns (
            int256 _price, uint256 _timestamp
        ) {
            return (_price, _timestamp);
        } catch {
            return _useFallback(feedId, priceUpdate, settlementTime, true);
        }
    }

    /// @inheritdoc IOracleAdapter
    function getUpdateFee(bytes[] calldata priceUpdate) external view override returns (uint256 fee) {
        return primaryAdapter.getUpdateFee(priceUpdate);
    }

    /// @notice Set the primary oracle adapter
    function setPrimaryAdapter(address _adapter) external onlyOwner {
        if (_adapter == address(0)) revert ZeroAddress();
        address old = address(primaryAdapter);
        primaryAdapter = IOracleAdapter(_adapter);
        emit PrimaryAdapterUpdated(old, _adapter);
    }

    /// @notice Set the secondary (fallback) oracle adapter
    /// @dev Pass address(0) to disable the fallback. Fallback is only used when fallbackEnabled
    ///      is true AND secondaryAdapter != address(0), so setting zero effectively disables it.
    function setSecondaryAdapter(address _adapter) external onlyOwner {
        if (_adapter == address(0) && fallbackEnabled) {
            // Implicitly disable fallback when clearing the adapter to avoid a broken state
            fallbackEnabled = false;
            emit FallbackEnabledUpdated(false);
        }
        address old = address(secondaryAdapter);
        secondaryAdapter = IOracleAdapter(_adapter);
        emit SecondaryAdapterUpdated(old, _adapter);
    }

    /// @notice Enable or disable fallback to secondary adapter
    function setFallbackEnabled(bool _enabled) external onlyOwner {
        fallbackEnabled = _enabled;
        emit FallbackEnabledUpdated(_enabled);
    }

    /// @notice Pause the oracle guard (emergency)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the oracle guard
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Internal ────────────────────────────────────────────────────────

    function _useFallback(
        bytes32 feedId,
        bytes[] calldata priceUpdate,
        uint64 settlementTime,
        bool isSettlement
    ) internal returns (int256, uint256) {
        if (!fallbackEnabled || address(secondaryAdapter) == address(0)) {
            revert PrimaryFailed();
        }

        emit FallbackUsed(feedId);

        if (isSettlement) {
            return secondaryAdapter.getSettlementPrice{value: msg.value}(feedId, priceUpdate, settlementTime);
        } else {
            return secondaryAdapter.getPrice{value: msg.value}(feedId, priceUpdate);
        }
    }
}
