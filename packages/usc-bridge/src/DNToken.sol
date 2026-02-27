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

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey);

    constructor(uint256 initialSupply) {
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

    /**
     * @notice Burn tokens to bridge to Creditcoin USC.
     *         Tokens are sent to BURN_ADDRESS (address(1)).
     *         The Transfer event serves as proof for USC verification.
     * @param amount Amount to burn and bridge
     * @param destinationChainKey USC chain key for the destination (unused on-chain, for indexing)
     */
    function bridgeBurn(uint256 amount, uint64 destinationChainKey) external returns (bool) {
        _transfer(msg.sender, BURN_ADDRESS, amount);
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
