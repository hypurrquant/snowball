// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {CollateralSwap} from "../src/tokenized/CollateralSwap.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";

/// @title Deploy EUR pool + aUSDC + CollateralSwap on Base Sepolia
contract DeployBaseSepolia_EUR is Script {
    function run() external {
        address deployer = msg.sender;
        address mockUsdc = 0xeb42C8a72016092d95c092ab594a31a57b24d688;
        address fTokenEur = 0xe38580314Fe5accDd6EE4EC9cD07420C2204777F;
        address sfTokenEur = 0xA0593e7f57b97b9fAF4f805AE271bB816E22d584;
        uint256 maturityTime = 1780554092;

        uint256 T_MAX = 25e16;
        uint256 T_MIN = 5e16;
        uint256 FEE_MAX = 3e15;
        uint256 POOL_LIFETIME = 90 days;

        vm.startBroadcast();

        // 1. EUR FXPool
        FXPool poolEur = FXPoolDeployer.deploy(fTokenEur, sfTokenEur, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool EUR:", address(poolEur));

        // 2. aUSDC mock
        ERC20Mock aUsdc = new ERC20Mock("Aave USDC", "aUSDC", 6);
        aUsdc.mint(deployer, 1_000_000_000e6);
        console.log("aUSDC:", address(aUsdc));

        // 3. CollateralSwap
        CollateralSwap swap = new CollateralSwap(deployer);
        swap.approvePair(mockUsdc, address(aUsdc));
        console.log("CollateralSwap:", address(swap));

        // Fund CollateralSwap with mUSDC
        ERC20Mock(mockUsdc).mint(address(swap), 100_000_000e6);
        console.log("CollateralSwap funded with 100M mUSDC");

        vm.stopBroadcast();
    }
}
