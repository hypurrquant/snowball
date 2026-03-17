// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "./WCTC.sol";

/// @title  WCTCDeployer
/// @notice Minimal factory that deploys a fresh WCTC instance and immediately
///         returns its address.  Useful from deploy scripts that want to
///         deploy WCTC in a single `deployContract` call and read back the
///         address from the emitted event without extra bookkeeping.
///
/// Usage (Foundry / ethers / viem):
///   1. Deploy WCTCDeployer.
///   2. Call deploy() — emits WCTCDeployed(wctc).
///   3. Use the returned / emitted address as the WETH9 parameter for
///      UniswapV3 periphery and Aave V3 contracts.
contract WCTCDeployer {
    /// @notice Emitted once per successful deploy() call.
    event WCTCDeployed(address indexed wctc);

    /// @notice Deploys a new WCTC contract and returns its address.
    /// @return wctc The address of the newly deployed WCTC contract.
    function deploy() external returns (address wctc) {
        WCTC instance = new WCTC();
        wctc = address(instance);
        emit WCTCDeployed(wctc);
    }
}
