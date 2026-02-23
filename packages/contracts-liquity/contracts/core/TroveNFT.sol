// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/// @title TroveNFT — ERC-721 representing trove ownership
contract TroveNFT is ERC721Enumerable {
    address public troveManager;
    address public borrowerOperations;
    uint256 private _nextTokenId;

    modifier onlyAuthorized() {
        require(
            msg.sender == troveManager || msg.sender == borrowerOperations,
            "TroveNFT: not authorized"
        );
        _;
    }

    constructor() ERC721("Snowball Trove", "sTROVE") {}

    function setAddresses(address _troveManager, address _borrowerOperations) external {
        require(troveManager == address(0), "Already set");
        troveManager = _troveManager;
        borrowerOperations = _borrowerOperations;
    }

    function mint(address _owner, uint256 _troveId) external onlyAuthorized {
        _mint(_owner, _troveId);
    }

    function burn(uint256 _troveId) external onlyAuthorized {
        _burn(_troveId);
    }
}
