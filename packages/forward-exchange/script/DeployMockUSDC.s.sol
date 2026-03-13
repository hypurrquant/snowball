// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title DeployMockUSDC
/// @notice Deploys a MockUSDC (ERC20Mock) and mints 1B to the deployer.
///         Usable on any chain (HyperEVM Testnet, Base Sepolia, etc.)
contract DeployMockUSDC is Script {
    function run() external {
        vm.startBroadcast();

        ERC20Mock usdc = new ERC20Mock("Mock USDC", "mUSDC", 6);
        usdc.mint(msg.sender, 1_000_000_000e6); // 1B USDC

        vm.stopBroadcast();

        console.log("MockUSDC deployed at:", address(usdc));
        console.log("Minted 1,000,000,000 mUSDC to:", msg.sender);
    }
}
