// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReputationRegistry — ERC-8004 Agent Reputation tracking
/// @dev Tracks agent performance scores, reviews, and metrics
contract ReputationRegistry is Ownable {
    struct ReputationData {
        uint64 totalInteractions;
        uint64 successfulInteractions;
        int128 reputationScore; // Scaled by 1e2 (e.g., 480 = 4.80)
        uint8 decimals;
    }

    struct Review {
        address reviewer;
        uint256 agentId;
        int128 score; // 1-5 scaled by 1e2
        string comment;
        uint256 timestamp;
    }

    // agentId => tag => ReputationData
    mapping(uint256 => mapping(string => ReputationData)) public reputations;
    // agentId => Review[]
    mapping(uint256 => Review[]) public reviews;

    address public identityRegistry;

    event ReputationUpdated(uint256 indexed agentId, string tag, int128 newScore);
    event ReviewSubmitted(uint256 indexed agentId, address indexed reviewer, int128 score);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = _identityRegistry;
    }

    function submitReview(
        uint256 _agentId,
        int128 _score,
        string calldata _comment,
        string calldata _tag
    ) external {
        require(_score >= 100 && _score <= 500, "Score must be 1.00-5.00 (100-500)");

        reviews[_agentId].push(Review({
            reviewer: msg.sender,
            agentId: _agentId,
            score: _score,
            comment: _comment,
            timestamp: block.timestamp
        }));

        // Update reputation
        ReputationData storage rep = reputations[_agentId][_tag];
        rep.totalInteractions++;
        rep.decimals = 2;

        // Running average
        int128 total = rep.reputationScore * int128(int64(rep.totalInteractions - 1)) + _score;
        rep.reputationScore = total / int128(int64(rep.totalInteractions));

        emit ReviewSubmitted(_agentId, msg.sender, _score);
        emit ReputationUpdated(_agentId, _tag, rep.reputationScore);
    }

    function recordInteraction(
        uint256 _agentId,
        string calldata _tag,
        bool _success
    ) external onlyOwner {
        ReputationData storage rep = reputations[_agentId][_tag];
        rep.totalInteractions++;
        if (_success) {
            rep.successfulInteractions++;
        }
    }

    function getSummary(
        uint256 _agentId,
        address[] calldata, /* _clients — unused in simplified version */
        string calldata _tag1,
        string calldata _tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 decimals) {
        ReputationData memory rep1 = reputations[_agentId][_tag1];
        ReputationData memory rep2 = reputations[_agentId][_tag2];

        count = rep1.totalInteractions + rep2.totalInteractions;
        if (count == 0) return (0, 0, 2);

        summaryValue = (rep1.reputationScore + rep2.reputationScore) / 2;
        decimals = 2;
    }

    function getReviews(uint256 _agentId) external view returns (Review[] memory) {
        return reviews[_agentId];
    }

    function getReputation(uint256 _agentId, string calldata _tag) external view returns (ReputationData memory) {
        return reputations[_agentId][_tag];
    }

    function getSuccessRate(uint256 _agentId, string calldata _tag) external view returns (uint256) {
        ReputationData memory rep = reputations[_agentId][_tag];
        if (rep.totalInteractions == 0) return 0;
        return (uint256(uint64(rep.successfulInteractions)) * 10000) / uint256(uint64(rep.totalInteractions));
    }
}
