// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IAddressesRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AddressesRegistry — Per-branch address registry (Liquity V2 pattern)
contract AddressesRegistry is IAddressesRegistry, Ownable {
    address public override borrowerOperations;
    address public override troveManager;
    address public override stabilityPool;
    address public override activePool;
    address public override defaultPool;
    address public override gasPool;
    address public override collSurplusPool;
    address public override sortedTroves;
    address public override troveNFT;
    address public override priceFeed;
    address public override sbUSDToken;
    address public override collToken;
    uint256 public override CCR;
    uint256 public override MCR;

    bool public isInitialized;

    constructor(uint256 _mcr, uint256 _ccr) Ownable(msg.sender) {
        MCR = _mcr;
        CCR = _ccr;
    }

    function setAddresses(
        address _borrowerOperations,
        address _troveManager,
        address _stabilityPool,
        address _activePool,
        address _defaultPool,
        address _gasPool,
        address _collSurplusPool,
        address _sortedTroves,
        address _troveNFT,
        address _priceFeed,
        address _sbUSDToken,
        address _collToken
    ) external override onlyOwner {
        require(!isInitialized, "Already initialized");

        borrowerOperations = _borrowerOperations;
        troveManager = _troveManager;
        stabilityPool = _stabilityPool;
        activePool = _activePool;
        defaultPool = _defaultPool;
        gasPool = _gasPool;
        collSurplusPool = _collSurplusPool;
        sortedTroves = _sortedTroves;
        troveNFT = _troveNFT;
        priceFeed = _priceFeed;
        sbUSDToken = _sbUSDToken;
        collToken = _collToken;

        isInitialized = true;
    }
}
