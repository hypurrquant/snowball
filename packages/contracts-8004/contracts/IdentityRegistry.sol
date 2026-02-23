// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title IdentityRegistry — ERC-8004 Agent Identity (ERC-721 + metadata)
/// @dev Each agent gets an NFT identity with on-chain metadata URI
contract IdentityRegistry is ERC721URIStorage, Ownable {
    uint256 private _nextAgentId = 1;

    struct AgentInfo {
        string name;
        string agentType; // "cdp-provider", "consumer", etc.
        address endpoint; // A2A endpoint address (or off-chain URL stored in tokenURI)
        uint256 registeredAt;
        bool isActive;
    }

    mapping(uint256 => AgentInfo) public agents;
    mapping(address => uint256[]) public ownerAgents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string agentType);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentActivated(uint256 indexed agentId);

    constructor() ERC721("Snowball Agent Identity", "sAGENT") Ownable(msg.sender) {}

    function registerAgent(
        string calldata _name,
        string calldata _agentType,
        address _endpoint,
        string calldata _tokenURI
    ) external returns (uint256 agentId) {
        agentId = _nextAgentId++;

        _mint(msg.sender, agentId);
        _setTokenURI(agentId, _tokenURI);

        agents[agentId] = AgentInfo({
            name: _name,
            agentType: _agentType,
            endpoint: _endpoint,
            registeredAt: block.timestamp,
            isActive: true
        });

        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, _name, _agentType);
    }

    function deactivateAgent(uint256 _agentId) external {
        require(ownerOf(_agentId) == msg.sender, "Not agent owner");
        agents[_agentId].isActive = false;
        emit AgentDeactivated(_agentId);
    }

    function activateAgent(uint256 _agentId) external {
        require(ownerOf(_agentId) == msg.sender, "Not agent owner");
        agents[_agentId].isActive = true;
        emit AgentActivated(_agentId);
    }

    function getAgentInfo(uint256 _agentId) external view returns (AgentInfo memory) {
        return agents[_agentId];
    }

    function getOwnerAgents(address _owner) external view returns (uint256[] memory) {
        return ownerAgents[_owner];
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
