// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../Interfaces/IPriceFeed.sol";

/// @title CreditcoinPriceFeed — Mock IPriceFeed for Creditcoin testnet
/// @notice Implements the full IPriceFeed interface required by Liquity V2 src/
contract CreditcoinPriceFeed is IPriceFeed {
    uint256 public lastGoodPrice;
    /// @dev In Liquity V2, fetchPrice returns (price, newOracleFailureDetected).
    ///      false = healthy, true = failure detected
    bool public oracleFailure;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "CreditcoinPriceFeed: not owner");
        _;
    }

    constructor(uint256 _initialPrice) {
        owner = msg.sender;
        lastGoodPrice = _initialPrice;
        // oracleFailure defaults to false (healthy)
    }

    /// @notice Non-view fetchPrice — returns (price, newOracleFailureDetected)
    function fetchPrice() external override returns (uint256, bool) {
        return (lastGoodPrice, oracleFailure);
    }

    /// @notice Redemption price (same as spot for testnet)
    function fetchRedemptionPrice() external override returns (uint256, bool) {
        return (lastGoodPrice, oracleFailure);
    }

    /// @notice Admin function to set price
    function setPrice(uint256 _price) external onlyOwner {
        lastGoodPrice = _price;
        emit PriceUpdated(_price);
    }

    /// @notice Admin function to simulate oracle failure
    function setOracleFailure(bool _failure) external onlyOwner {
        oracleFailure = _failure;
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
