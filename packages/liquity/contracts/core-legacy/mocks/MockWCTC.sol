// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockWCTC — Wrapped CTC mock for testnet
contract MockWCTC is ERC20, Ownable {
    constructor() ERC20("Wrapped CTC", "wCTC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @dev Allow anyone to mint on testnet for testing
    function faucet(uint256 amount) external {
        require(amount <= 100_000 ether, "Max 100k per faucet call");
        _mint(msg.sender, amount);
    }
}
