// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ValidationRegistry — ERC-8004 Agent Validation & Certification
/// @dev Manages agent validation status, certifications, and compliance
contract ValidationRegistry is Ownable {
    enum ValidationStatus {
        Unvalidated,
        Pending,
        Validated,
        Suspended,
        Revoked
    }

    struct Validation {
        ValidationStatus status;
        address validator;
        uint256 validatedAt;
        uint256 expiresAt;
        string certificationURI; // IPFS/Arweave link to validation details
    }

    // agentId => Validation
    mapping(uint256 => Validation) public validations;
    // Authorized validators
    mapping(address => bool) public validators;

    address public identityRegistry;

    event AgentValidated(uint256 indexed agentId, address indexed validator, uint256 expiresAt);
    event AgentSuspended(uint256 indexed agentId, address indexed validator);
    event AgentRevoked(uint256 indexed agentId, address indexed validator);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = _identityRegistry;
        validators[msg.sender] = true;
    }

    modifier onlyValidator() {
        require(validators[msg.sender], "Not a validator");
        _;
    }

    function addValidator(address _validator) external onlyOwner {
        validators[_validator] = true;
        emit ValidatorAdded(_validator);
    }

    function removeValidator(address _validator) external onlyOwner {
        validators[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    function validateAgent(
        uint256 _agentId,
        uint256 _validityPeriod,
        string calldata _certificationURI
    ) external onlyValidator {
        validations[_agentId] = Validation({
            status: ValidationStatus.Validated,
            validator: msg.sender,
            validatedAt: block.timestamp,
            expiresAt: block.timestamp + _validityPeriod,
            certificationURI: _certificationURI
        });

        emit AgentValidated(_agentId, msg.sender, block.timestamp + _validityPeriod);
    }

    function suspendAgent(uint256 _agentId) external onlyValidator {
        validations[_agentId].status = ValidationStatus.Suspended;
        emit AgentSuspended(_agentId, msg.sender);
    }

    function revokeAgent(uint256 _agentId) external onlyValidator {
        validations[_agentId].status = ValidationStatus.Revoked;
        emit AgentRevoked(_agentId, msg.sender);
    }

    function isValidated(uint256 _agentId) external view returns (bool) {
        Validation memory v = validations[_agentId];
        return v.status == ValidationStatus.Validated && v.expiresAt > block.timestamp;
    }

    function getValidation(uint256 _agentId) external view returns (Validation memory) {
        return validations[_agentId];
    }
}
