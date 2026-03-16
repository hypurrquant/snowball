// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title BridgeVault
 * @notice Locks USDC and emits deposit event. Simulates Wormhole outbound transfer for demo.
 */
contract BridgeVault {
    IERC20 public immutable usdc;

    /// @notice Contract owner, set at deployment
    address public owner;

    /// @notice Pending owner for two-step ownership transfer
    address public pendingOwner;

    event Deposited(address indexed user, uint256 amount, uint64 destinationChainKey);
    event Withdrawn(address indexed to, uint256 amount);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);
    event OwnershipProposed(address indexed proposedOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "BridgeVault: not owner");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    /// @notice Step 1: current owner proposes a new owner address
    function proposeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BridgeVault: zero address");
        pendingOwner = newOwner;
        emit OwnershipProposed(newOwner);
    }

    /// @notice Step 2: proposed owner accepts and becomes the new owner
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "BridgeVault: not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    function deposit(uint256 amount, uint64 destinationChainKey) external {
        require(amount > 0, "BridgeVault: zero amount");
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, destinationChainKey);
    }

    /// @notice Withdraw USDC from the vault to `to`. Owner only.
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "BridgeVault: zero address");
        usdc.transfer(to, amount);
        emit Withdrawn(to, amount);
    }

    /// @notice Rescue arbitrary ERC-20 tokens accidentally sent to this contract. Owner only.
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "BridgeVault: zero address");
        IERC20(token).transfer(to, amount);
        emit TokenRescued(token, to, amount);
    }
}
