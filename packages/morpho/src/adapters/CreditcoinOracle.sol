// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IOracle} from "morpho-blue/interfaces/IOracle.sol";

/// @title CreditcoinOracle — Morpho Blue oracle adapter for Creditcoin testnet
/// @notice Wraps a simple price setter into the IOracle interface expected by Morpho Blue
/// @dev Price is scaled to 1e36 as required by Morpho Blue (ORACLE_PRICE_SCALE)
contract CreditcoinOracle is IOracle {
    uint256 public constant ORACLE_PRICE_SCALE = 1e36;

    uint256 internal _price;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "CreditcoinOracle: not owner");
        _;
    }

    /// @param initialPrice The initial price at 1e36 scale
    constructor(uint256 initialPrice) {
        owner = msg.sender;
        _price = initialPrice;
    }

    /// @notice Returns the price at 1e36 scale as required by Morpho Blue
    function price() external view override returns (uint256) {
        return _price;
    }

    /// @notice Set price (1e36 scale). For testnet use.
    function setPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "CreditcoinOracle: zero price");
        _price = newPrice;
        emit PriceUpdated(newPrice);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CreditcoinOracle: zero address");
        owner = newOwner;
    }
}
