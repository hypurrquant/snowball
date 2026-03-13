// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FXPool} from "./FXPool.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title FXPoolDeployer
/// @notice Helper library for deploying FXPool as UUPS proxy
library FXPoolDeployer {
    function deploy(
        address fToken,
        address sfToken,
        uint256 maturity,
        uint256 totalLifetime,
        uint256 tMax,
        uint256 tMin,
        uint256 feeMax
    ) internal returns (FXPool) {
        // 1. Deploy implementation
        FXPool impl = new FXPool();

        // 2. Encode initialize call
        bytes memory initData = abi.encodeCall(
            FXPool.initialize,
            (fToken, sfToken, maturity, totalLifetime, tMax, tMin, feeMax)
        );

        // 3. Deploy ERC1967 proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        return FXPool(address(proxy));
    }
}
