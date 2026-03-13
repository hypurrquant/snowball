// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IReceiver - receives Chainlink CRE DON-signed reports
/// @notice Matches the official Chainlink CRE ReceiverTemplate interface
/// @dev Consumers must also implement ERC-165 supportsInterface for this interfaceId
interface IReceiver {
    /// @notice Handles incoming CRE reports via KeystoneForwarder.
    /// @dev If this function call reverts, it can be retried with a higher gas
    /// limit. The receiver is responsible for discarding stale reports.
    /// @param metadata Report's metadata (workflowId, workflowName, workflowOwner).
    /// @param report Workflow report.
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
