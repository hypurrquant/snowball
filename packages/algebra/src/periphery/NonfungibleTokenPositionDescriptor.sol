// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import './interfaces/INonfungibleTokenPositionDescriptor.sol';
import './interfaces/INonfungiblePositionManager.sol';

/// @title NonfungibleTokenPositionDescriptor (stub)
/// @notice Minimal implementation — returns empty tokenURI. Replace with full SVG descriptor for production.
contract NonfungibleTokenPositionDescriptor is INonfungibleTokenPositionDescriptor {
    function tokenURI(INonfungiblePositionManager, uint256) external pure override returns (string memory) {
        return "";
    }
}
