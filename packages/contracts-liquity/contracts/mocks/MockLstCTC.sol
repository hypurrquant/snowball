// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockLstCTC — Liquid Staked CTC mock for testnet
/// @dev Includes exchange rate for staking yield simulation
contract MockLstCTC is ERC20, Ownable {
    uint256 public exchangeRate = 1e18; // 1:1 initially

    constructor() ERC20("Liquid Staked CTC", "lstCTC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(uint256 amount) external {
        require(amount <= 100_000 ether, "Max 100k per faucet call");
        _mint(msg.sender, amount);
    }

    /// @dev Set exchange rate (how many CTC per 1 lstCTC)
    function setExchangeRate(uint256 _rate) external onlyOwner {
        exchangeRate = _rate;
    }

    function getExchangeRate() external view returns (uint256) {
        return exchangeRate;
    }
}
