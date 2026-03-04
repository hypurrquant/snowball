// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../Interfaces/IInterestRouter.sol";

/// @title MockInterestRouter — No-op interest router for testnet
contract MockInterestRouter is IInterestRouter {
    // IInterestRouter is an empty interface, no methods needed
    receive() external payable {}
}
