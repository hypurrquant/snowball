// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DNToken
 * @notice Minimal ERC20 with burn-to-bridge functionality.
 *         Deployed on Sepolia — users burn here to mint on Creditcoin USC.
 *         Burn = transfer to address(1), so Transfer event is emitted for USC proof.
 */
contract DNToken {
    string public constant name = "DN Token";
    string public constant symbol = "DN";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public constant BURN_ADDRESS = address(1);

    /// @notice Contract owner — the only address allowed to call mint()
    address public owner;

    /// @notice Pending owner for two-step ownership transfer
    address public pendingOwner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey);
    event OwnershipProposed(address indexed proposedOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "DNToken: not owner");
        _;
    }

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

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
            require(allowed >= amount, "DNToken: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    /// @notice Step 1: current owner proposes a new owner address
    function proposeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "DNToken: zero address");
        pendingOwner = newOwner;
        emit OwnershipProposed(newOwner);
    }

    /// @notice Step 2: proposed owner accepts and becomes the new owner
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "DNToken: not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    /**
     * @notice Mint new DN tokens. Restricted to owner.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Burn tokens to bridge to Creditcoin USC.
     *         Tokens are sent to BURN_ADDRESS (address(1)) so a Transfer event is emitted for USC proof.
     *         totalSupply is decremented so circulating supply stays accurate.
     * @param amount Amount to burn and bridge
     * @param destinationChainKey USC chain key for the destination (unused on-chain, for indexing)
     */
    function bridgeBurn(uint256 amount, uint64 destinationChainKey) external returns (bool) {
        _transfer(msg.sender, BURN_ADDRESS, amount);
        totalSupply -= amount;
        emit BridgeBurn(msg.sender, amount, destinationChainKey);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(balanceOf[from] >= amount, "DNToken: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
