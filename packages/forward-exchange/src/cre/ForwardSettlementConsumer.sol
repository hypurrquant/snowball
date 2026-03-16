// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IForward} from "../interfaces/IForward.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRiskManager} from "../interfaces/IRiskManager.sol";
import {IReceiver} from "./IReceiver.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title ForwardSettlementConsumer
/// @notice Receives CRE DON-signed settlement reports via KeystoneForwarder and settles forward positions
/// @dev Bridge between Chainlink CRE workflow and the Forward Exchange protocol (UUPS upgradeable)
///      Implements IReceiver (ERC-165) per official CRE ReceiverTemplate pattern
contract ForwardSettlementConsumer is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IReceiver
{
    // ─── Types ───────────────────────────────────────────────────────────

    struct SettlementReport {
        uint256 positionId;   // Long token ID (even)
        int256 settlementRate; // Settlement exchange rate (18 decimals)
        // pnl, winner, loser are intentionally removed; derived on-chain in _processSettlement
    }

    // ─── State (original — do NOT reorder for storage compatibility) ─────

    /// @notice The Forward contract
    IForward public FORWARD;

    /// @notice The Vault contract
    IVault public VAULT;

    /// @notice The Risk Manager
    IRiskManager public RISK_MANAGER;

    /// @notice The KeystoneForwarder address (only sender allowed to call onReport)
    address public FORWARDER;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ─── State (new — appended for V2 upgrade) ─────────────────────────

    /// @notice Expected workflow ID (bytes32(0) = disabled)
    bytes32 public expectedWorkflowId;

    /// @notice Expected workflow owner (address(0) = disabled)
    address public expectedAuthor;

    /// @notice Expected workflow name, SHA256-truncated to bytes10 (bytes10(0) = disabled)
    bytes10 public expectedWorkflowName;

    // ─── State (new — appended for V3 upgrade) ─────────────────────────

    /// @notice Replay-protection: tracks keccak256(metadata ++ report) hashes already processed
    mapping(bytes32 => bool) public processedReports;

    /// @notice Maximum seconds after maturity within which settlement is accepted (0 = disabled)
    uint256 public maxSettlementWindow;

    // ─── Errors ──────────────────────────────────────────────────────────

    error UnauthorizedForwarder();
    error InvalidPositionId();
    error PositionNotFound();
    error PositionAlreadySettled();
    error PositionNotActive();
    error MaturityNotReached();
    error InvalidSettlementRate();
    error ZeroAddress();
    error InvalidWorkflowId(bytes32 received, bytes32 expected);
    error InvalidAuthor(address received, address expected);
    error InvalidWorkflowName(bytes10 received, bytes10 expected);
    error InvalidMetadataLength();
    error ReportAlreadyProcessed();
    error SettlementTooLate();

    // ─── Events ──────────────────────────────────────────────────────────

    event CRESettlement(
        uint256 indexed positionId, int256 settlementRate, int256 pnl, address winner, address loser
    );
    event ForwarderUpdated(address indexed previous, address indexed newForwarder);
    event ExpectedWorkflowIdUpdated(bytes32 indexed previous, bytes32 indexed newId);
    event ExpectedAuthorUpdated(address indexed previous, address indexed newAuthor);
    event ExpectedWorkflowNameUpdated(bytes10 indexed previous, bytes10 indexed newName);
    event MaxSettlementWindowUpdated(uint256 oldValue, uint256 newValue);

    // ─── Constructor ─────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ────────────────────────────────────────────────────

    function initialize(
        address _forward,
        address _vault,
        address _riskManager,
        address _forwarder,
        address _admin
    ) external initializer {
        if (
            _forward == address(0) || _vault == address(0) || _riskManager == address(0)
                || _forwarder == address(0) || _admin == address(0)
        ) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();

        FORWARD = IForward(_forward);
        VAULT = IVault(_vault);
        RISK_MANAGER = IRiskManager(_riskManager);
        FORWARDER = _forwarder;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ─── UUPS ──────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ─── ERC-165 ────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return interfaceId == type(IReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    // ─── Core ────────────────────────────────────────────────────────────

    /// @notice Receives DON-signed report from KeystoneForwarder
    /// @param metadata CRE workflow metadata (workflowId, workflowName, workflowOwner)
    /// @param report ABI-encoded SettlementReport
    function onReport(bytes calldata metadata, bytes calldata report) external override whenNotPaused {
        if (msg.sender != FORWARDER) revert UnauthorizedForwarder();

        // Replay protection
        bytes32 reportHash = keccak256(abi.encode(metadata, report));
        if (processedReports[reportHash]) revert ReportAlreadyProcessed();
        processedReports[reportHash] = true;

        _validateMetadata(metadata);

        SettlementReport memory s = abi.decode(report, (SettlementReport));
        _processSettlement(s);
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /// @notice Validates CRE metadata fields if configured
    function _validateMetadata(bytes calldata metadata) internal view {
        if (
            expectedWorkflowId == bytes32(0) && expectedAuthor == address(0)
                && expectedWorkflowName == bytes10(0)
        ) return;

        if (metadata.length < 74) revert InvalidMetadataLength();

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
        // Metadata layout (encodePacked by KeystoneForwarder):
        // offset 0,  size 32: workflowId (bytes32)
        // offset 32, size 10: workflowName (bytes10)
        // offset 42, size 20: workflowOwner (address)
        assembly {
            workflowId := calldataload(metadata.offset)
            workflowName := calldataload(add(metadata.offset, 32))
            workflowOwner := shr(96, calldataload(add(metadata.offset, 42)))
        }
    }

    /// @notice Compute PnL for the long side: (settlementRate - forwardRate) * notional / 1e18
    /// @dev notional is 6-decimal USDC; rates are 18-decimal. Result is 6-decimal signed USDC.
    function calculatePnL(uint256 notional, int256 forwardRate, int256 settlementRate)
        public
        pure
        returns (int256)
    {
        return (settlementRate - forwardRate) * int256(notional) / 1e18;
    }

    function _processSettlement(SettlementReport memory s) internal {
        // Normalize to Long token ID
        uint256 longTokenId = (s.positionId % 2 == 0) ? s.positionId : s.positionId - 1;
        if (longTokenId < 2) revert InvalidPositionId();
        uint256 shortTokenId = longTokenId + 1;

        // Validate position state
        IForward.ForwardPosition memory pos = FORWARD.getPosition(longTokenId);
        if (pos.notional == 0) revert PositionNotFound();
        if (pos.settled) revert PositionAlreadySettled();
        if (pos.counterparty == address(0)) revert PositionNotActive();
        if (block.timestamp < pos.maturityTime) revert MaturityNotReached();
        if (s.settlementRate <= 0) revert InvalidSettlementRate();

        // Settlement window check
        if (maxSettlementWindow > 0 && block.timestamp > pos.maturityTime + maxSettlementWindow) {
            revert SettlementTooLate();
        }

        // Compute PnL locally for event emission only (no state changes here).
        int256 pnl = calculatePnL(pos.notional, pos.forwardRate, s.settlementRate);

        // Delegate all state changes (vault settlement, OI deregistration, mark-settled,
        // and NFT burning) to Forward.settleFromConsumer so the logic lives in one place.
        FORWARD.settleFromConsumer(longTokenId, s.settlementRate);

        emit CRESettlement(longTokenId, s.settlementRate, pnl, address(0), address(0));
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setForwarder(address _forwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_forwarder != address(0), "zero address");
        emit ForwarderUpdated(FORWARDER, _forwarder);
        FORWARDER = _forwarder;
    }

    function setMaxSettlementWindow(uint256 _window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit MaxSettlementWindowUpdated(maxSettlementWindow, _window);
        maxSettlementWindow = _window;
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
