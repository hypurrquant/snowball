// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============ Interfaces ============

interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }
    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }
    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

interface IReputationRegistry {
    function submitReview(
        uint256 _agentId,
        int128 _score,
        string calldata _comment,
        string calldata _tag
    ) external;
}

/**
 * @title AaveCreditImporter
 * @notice Imports Aave V3 credit history from Ethereum (Sepolia) to Creditcoin via USC.
 *
 * Architecture:
 *   1. Off-chain worker detects Aave events (Repay, Supply, Liquidation) on Ethereum
 *   2. USC attests the Ethereum block containing the transaction
 *   3. Worker calls importCredit() with USC proof + decoded event data
 *   4. Contract verifies proof via Native Query Verifier Precompile (0x0FD2)
 *   5. Contract submits a review to ERC-8004 ReputationRegistry
 *
 * Security:
 *   - Replay protection via txKey = keccak256(chainKey, blockHeight, txIndex)
 *   - Proof verification is on-chain and trustless (Precompile)
 *   - Operator role for submitting proofs (prevents griefing with invalid data)
 */
contract AaveCreditImporter {
    // ============ Constants ============

    /// @notice Native Query Verifier Precompile
    INativeQueryVerifier public constant VERIFIER =
        INativeQueryVerifier(0x0000000000000000000000000000000000000FD2);

    /// @notice Sepolia chain key in USC
    uint64 public constant SEPOLIA_CHAIN_KEY = 1;

    /// @notice Credit score by event type (scaled 1e2: 400 = 4.00/5.00)
    int128 public constant SCORE_REPAY = 400;
    int128 public constant SCORE_SUPPLY = 350;
    int128 public constant SCORE_LIQUIDATION = 150;

    // ============ State ============

    /// @notice Contract owner (deployer)
    address public owner;

    /// @notice Operator that can submit proofs
    address public operator;

    /// @notice ERC-8004 ReputationRegistry
    IReputationRegistry public reputationRegistry;

    /// @notice Replay protection: processed transaction keys
    mapping(bytes32 => bool) public processedTxKeys;

    /// @notice Credit import records
    struct CreditRecord {
        address user;
        uint256 agentId;
        uint8 eventType; // 0=Repay, 1=Supply, 2=Liquidation
        uint256 amount;
        int128 score;
        uint64 sourceBlockHeight;
        bytes32 txKey;
        uint256 timestamp;
    }

    CreditRecord[] public creditRecords;
    mapping(address => uint256[]) public userRecordIndices;

    // ============ Events ============

    event CreditImported(
        address indexed user,
        uint256 indexed agentId,
        uint8 eventType,
        uint256 amount,
        int128 score,
        bytes32 txKey
    );

    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "AaveCredit: not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "AaveCredit: not operator");
        _;
    }

    // ============ Constructor ============

    constructor(address _reputationRegistry) {
        owner = msg.sender;
        operator = msg.sender;
        reputationRegistry = IReputationRegistry(_reputationRegistry);
    }

    // ============ Core Functions ============

    /**
     * @notice Import Aave credit history from Ethereum via USC proof.
     * @param blockHeight Sepolia block height containing the Aave tx
     * @param encodedTransaction ABI-encoded transaction bytes from Proof API
     * @param merkleProof Merkle proof for transaction inclusion
     * @param continuityProof Continuity proof for block chain validity
     * @param user Address of the Aave user on Ethereum
     * @param agentId ERC-8004 agent ID to receive the credit score
     * @param eventType 0=Repay, 1=Supply, 2=Liquidation
     * @param amount Token amount involved in the Aave event
     */
    function importCredit(
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof,
        address user,
        uint256 agentId,
        uint8 eventType,
        uint256 amount
    ) external onlyOperator returns (bool) {
        require(eventType <= 2, "AaveCredit: invalid event type");

        // 1. Calculate txKey for replay protection
        uint256 txIndex = _calculateTransactionIndex(merkleProof.siblings);
        bytes32 txKey = keccak256(abi.encodePacked(SEPOLIA_CHAIN_KEY, blockHeight, txIndex));
        require(!processedTxKeys[txKey], "AaveCredit: already processed");

        // 2. Verify proof via Precompile
        bool verified = VERIFIER.verifyAndEmit(
            SEPOLIA_CHAIN_KEY,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "AaveCredit: proof verification failed");

        // 3. Mark as processed (replay protection)
        processedTxKeys[txKey] = true;

        // 4. Calculate credit score based on event type
        int128 score = _getScore(eventType);

        // 5. Submit review to ERC-8004 ReputationRegistry
        string memory comment = _buildComment(eventType, amount);
        reputationRegistry.submitReview(agentId, score, comment, "aave-credit");

        // 6. Store credit record
        uint256 recordIndex = creditRecords.length;
        creditRecords.push(CreditRecord({
            user: user,
            agentId: agentId,
            eventType: eventType,
            amount: amount,
            score: score,
            sourceBlockHeight: blockHeight,
            txKey: txKey,
            timestamp: block.timestamp
        }));
        userRecordIndices[user].push(recordIndex);

        emit CreditImported(user, agentId, eventType, amount, score, txKey);
        return true;
    }

    // ============ Admin Functions ============

    function setOperator(address newOperator) external onlyOwner {
        emit OperatorUpdated(operator, newOperator);
        operator = newOperator;
    }

    // ============ View Functions ============

    function getUserRecords(address user) external view returns (uint256[] memory) {
        return userRecordIndices[user];
    }

    function getRecord(uint256 index) external view returns (CreditRecord memory) {
        return creditRecords[index];
    }

    function totalRecords() external view returns (uint256) {
        return creditRecords.length;
    }

    // ============ Internal Functions ============

    function _calculateTransactionIndex(
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings
    ) internal pure returns (uint256) {
        uint256 index = 0;
        for (uint256 i = 0; i < siblings.length; i++) {
            if (siblings[i].isLeft) {
                index |= (1 << i);
            }
        }
        return index;
    }

    function _getScore(uint8 eventType) internal pure returns (int128) {
        if (eventType == 0) return SCORE_REPAY;
        if (eventType == 1) return SCORE_SUPPLY;
        return SCORE_LIQUIDATION;
    }

    function _buildComment(uint8 eventType, uint256 /* amount */) internal pure returns (string memory) {
        string memory action;
        if (eventType == 0) action = "Repay";
        else if (eventType == 1) action = "Supply";
        else action = "Liquidation";

        return string(abi.encodePacked(
            "Aave V3 ", action, " - verified via USC proof"
        ));
    }
}
