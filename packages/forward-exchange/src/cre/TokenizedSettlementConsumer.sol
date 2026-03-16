// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IMaturityTokenFactory} from "../tokenized/interfaces/IMaturityTokenFactory.sol";
import {IReceiver} from "./IReceiver.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TokenizedSettlementConsumer
/// @notice Receives CRE DON-signed settlement reports via KeystoneForwarder and settles tokenized series
/// @dev Bridge between Chainlink CRE workflow and the Tokenized Forward AMM
///      Implements IReceiver (ERC-165) per official CRE ReceiverTemplate pattern
contract TokenizedSettlementConsumer is IReceiver, AccessControl, Pausable {
    // ─── State ───────────────────────────────────────────────────────────

    /// @notice The MaturityTokenFactory contract
    IMaturityTokenFactory public immutable FACTORY;

    /// @notice The KeystoneForwarder address (updatable by admin)
    address public forwarder;

    /// @notice Expected workflow ID (bytes32(0) = disabled)
    bytes32 public expectedWorkflowId;

    /// @notice Expected workflow owner (address(0) = disabled)
    address public expectedAuthor;

    /// @notice Expected workflow name, SHA256-truncated to bytes10 (bytes10(0) = disabled)
    bytes10 public expectedWorkflowName;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Replay-protection: tracks keccak256(metadata ++ report) hashes already processed
    mapping(bytes32 => bool) public processedReports;

    // ─── Errors ──────────────────────────────────────────────────────────

    error UnauthorizedForwarder();
    error ZeroAddress();
    error InvalidSettlementRate();
    error InvalidWorkflowId(bytes32 received, bytes32 expected);
    error InvalidAuthor(address received, address expected);
    error InvalidWorkflowName(bytes10 received, bytes10 expected);
    error InvalidMetadataLength();
    error ReportAlreadyProcessed();

    // ─── Events ──────────────────────────────────────────────────────────

    event CRESeriesSettled(bytes32 indexed seriesId, int256 settlementRate);
    event ForwarderUpdated(address indexed previous, address indexed newForwarder);
    event ExpectedWorkflowIdUpdated(bytes32 indexed previous, bytes32 indexed newId);
    event ExpectedAuthorUpdated(address indexed previous, address indexed newAuthor);
    event ExpectedWorkflowNameUpdated(bytes10 indexed previous, bytes10 indexed newName);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _factory, address _forwarder, address _admin) {
        if (_factory == address(0) || _forwarder == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }

        FACTORY = IMaturityTokenFactory(_factory);
        forwarder = _forwarder;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ─── ERC-165 ────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return interfaceId == type(IReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    // ─── Core ────────────────────────────────────────────────────────────

    /// @notice Receives DON-signed report from KeystoneForwarder
    /// @param metadata CRE workflow metadata (workflowId, workflowName, workflowOwner)
    /// @param report ABI-encoded (bytes32 seriesId, int256 settlementRate)
    function onReport(bytes calldata metadata, bytes calldata report) external override whenNotPaused {
        if (msg.sender != forwarder) revert UnauthorizedForwarder();

        // Replay protection
        bytes32 reportHash = keccak256(abi.encode(metadata, report));
        if (processedReports[reportHash]) revert ReportAlreadyProcessed();
        processedReports[reportHash] = true;

        _validateMetadata(metadata);

        (bytes32 seriesId, int256 settlementRate) = abi.decode(report, (bytes32, int256));

        if (settlementRate <= 0) revert InvalidSettlementRate();

        FACTORY.settleSeriesFromConsumer(seriesId, settlementRate);

        emit CRESeriesSettled(seriesId, settlementRate);
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /// @notice Validates CRE metadata fields if configured
    function _validateMetadata(bytes calldata metadata) internal view {
        if (
            expectedWorkflowId == bytes32(0) && expectedAuthor == address(0)
                && expectedWorkflowName == bytes10(0)
        ) return;

        if (metadata.length < 62) revert InvalidMetadataLength();

        (bytes32 workflowId, bytes10 workflowName, address workflowOwner) = _decodeMetadata(metadata);

        if (expectedWorkflowId != bytes32(0) && workflowId != expectedWorkflowId) {
            revert InvalidWorkflowId(workflowId, expectedWorkflowId);
        }
        if (expectedAuthor != address(0) && workflowOwner != expectedAuthor) {
            revert InvalidAuthor(workflowOwner, expectedAuthor);
        }
        if (expectedWorkflowName != bytes10(0) && workflowName != expectedWorkflowName) {
            revert InvalidWorkflowName(workflowName, expectedWorkflowName);
        }
    }

    /// @notice Decodes CRE metadata: abi.encodePacked(workflowId, workflowName, workflowOwner)
    function _decodeMetadata(bytes calldata metadata)
        internal
        pure
        returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner)
    {
        assembly {
            workflowId := calldataload(metadata.offset)
            workflowName := calldataload(add(metadata.offset, 32))
            workflowOwner := shr(96, calldataload(add(metadata.offset, 42)))
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setForwarder(address _forwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_forwarder != address(0), "zero address");
        emit ForwarderUpdated(forwarder, _forwarder);
        forwarder = _forwarder;
    }

    function setExpectedWorkflowId(bytes32 _id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ExpectedWorkflowIdUpdated(expectedWorkflowId, _id);
        expectedWorkflowId = _id;
    }

    function setExpectedAuthor(address _author) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ExpectedAuthorUpdated(expectedAuthor, _author);
        expectedAuthor = _author;
    }

    function setExpectedWorkflowName(bytes10 _name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ExpectedWorkflowNameUpdated(expectedWorkflowName, _name);
        expectedWorkflowName = _name;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
