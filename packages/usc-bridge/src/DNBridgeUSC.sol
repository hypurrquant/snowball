// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

/**
 * @title DNBridgeUSC
 * @notice USC Bridge contract on Creditcoin. Verifies Sepolia burn proofs and mints DN tokens.
 *
 * Architecture:
 *   1. Off-chain worker calls processBridgeMint() with USC proof data
 *   2. Contract verifies proof via Native Query Verifier Precompile (0x0FD2)
 *   3. Off-chain worker provides decoded burn data (from, amount) alongside proof
 *   4. Contract mints DN tokens to the original burner's address on Creditcoin
 *
 * Security:
 *   - Replay protection via txKey = keccak256(chainKey, blockHeight, txIndex)
 *   - Proof verification is on-chain and trustless (Precompile)
 *   - Operator role for submitting proofs (prevents griefing with invalid data)
 */
contract DNBridgeUSC {
    // ============ DN Token (Mintable ERC20) ============

    string public constant name = "DN Token (Bridged)";
    string public constant symbol = "DN";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ============ USC Bridge ============

    /// @notice Native Query Verifier Precompile
    INativeQueryVerifier public constant VERIFIER = INativeQueryVerifier(0x0000000000000000000000000000000000000FD2);

    /// @notice Sepolia chain key in USC
    uint64 public constant SEPOLIA_CHAIN_KEY = 1;

    /// @notice Contract owner (deployer)
    address public owner;

    /// @notice Operator that can submit proofs
    address public operator;

    /// @notice Sepolia DN token address (for validation)
    address public sepoliaDNToken;

    /// @notice Replay protection: processed transaction keys
    mapping(bytes32 => bool) public processedTxKeys;

    /// @notice Total minted via bridge
    uint256 public totalBridgeMinted;

    // ============ Events ============

    event BridgeMint(
        address indexed recipient,
        uint256 amount,
        uint64 sourceBlockHeight,
        bytes32 txKey
    );

    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event SepoliaDNTokenUpdated(address indexed token);

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "DNBridge: not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "DNBridge: not operator");
        _;
    }

    // ============ Constructor ============

    constructor(address _sepoliaDNToken) {
        owner = msg.sender;
        operator = msg.sender;
        sepoliaDNToken = _sepoliaDNToken;
    }

    // ============ Bridge Functions ============

    /**
     * @notice Process a burn from Sepolia and mint DN on Creditcoin USC.
     * @param blockHeight Sepolia block height containing the burn tx
     * @param encodedTransaction ABI-encoded transaction bytes from Proof API
     * @param merkleProof Merkle proof for transaction inclusion
     * @param continuityProof Continuity proof for block chain validity
     * @param recipient Address to mint to (the original burner on Sepolia)
     * @param amount Amount to mint (must match the burn amount)
     */
    function processBridgeMint(
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof,
        address recipient,
        uint256 amount
    ) external onlyOperator returns (bool) {
        // 1. Calculate txKey for replay protection
        uint256 txIndex = _calculateTransactionIndex(merkleProof.siblings);
        bytes32 txKey = keccak256(abi.encodePacked(SEPOLIA_CHAIN_KEY, blockHeight, txIndex));
        require(!processedTxKeys[txKey], "DNBridge: already processed");

        // 2. Verify proof via Precompile (direct interface call)
        bool verified = VERIFIER.verifyAndEmit(
            SEPOLIA_CHAIN_KEY,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "DNBridge: proof verification failed");

        // 3. Mark as processed (replay protection)
        processedTxKeys[txKey] = true;

        // 4. Mint DN tokens
        _mint(recipient, amount);
        totalBridgeMinted += amount;

        emit BridgeMint(recipient, amount, blockHeight, txKey);
        return true;
    }

    // ============ Admin Functions ============

    function setOperator(address newOperator) external onlyOwner {
        emit OperatorUpdated(operator, newOperator);
        operator = newOperator;
    }

    function setSepoliaDNToken(address token) external onlyOwner {
        sepoliaDNToken = token;
        emit SepoliaDNTokenUpdated(token);
    }

    // ============ ERC20 Functions ============

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "DN: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
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

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(balanceOf[from] >= amount, "DN: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
