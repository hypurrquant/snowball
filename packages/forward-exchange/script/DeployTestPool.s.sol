// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Deploy a test KRW pool with new FXPool code (setParameters support)
contract DeployTestPool is Script {
    function run() external {
        address deployer = msg.sender;
        // Existing Base Sepolia addresses
        address fToken = 0xCf88f84FC2e119C42C9c48fc945b35c523E509D7;
        address sfToken = 0x565E0E4c30e13399E59f012B36156e0639C6D3DD;
        uint256 maturityTime = 1780572428;

        uint256 T_MAX = 25e16;
        uint256 T_MIN = 5e16;
        uint256 FEE_MAX = 3e15;
        uint256 POOL_LIFETIME = 90 days;

        vm.startBroadcast();

        FXPool pool = FXPoolDeployer.deploy(fToken, sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("Test FXPool:", address(pool));

        vm.stopBroadcast();
    }
}
