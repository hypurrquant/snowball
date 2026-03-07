// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title BridgeVault
 * @notice Locks USDC and emits deposit event. Simulates Wormhole outbound transfer for demo.
 */
contract BridgeVault {
    IERC20 public immutable usdc;

    event Deposited(address indexed user, uint256 amount, uint64 destinationChainKey);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 amount, uint64 destinationChainKey) external {
        require(amount > 0, "BridgeVault: zero amount");
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, destinationChainKey);
    }
}
