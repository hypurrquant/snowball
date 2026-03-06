// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC — Mock USDC token for Creditcoin testnet
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /// @notice Faucet for testnet — anyone can mint
    function faucet(uint256 amount) external {
        require(amount <= 100_000 ether, "Max 100k per faucet call");
        _mint(msg.sender, amount);
    }

    /// @notice Owner-style mint (for deploy scripts)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
