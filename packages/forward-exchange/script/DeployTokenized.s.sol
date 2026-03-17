// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title DeployTokenized
/// @notice Deployment script for the Tokenized Forward AMM system
contract DeployTokenized is Script {
    // Base Sepolia USDC (Circle)
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Feed IDs and market IDs
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");

    // Pool parameters for USD/KRW 90-day
    uint256 constant T_MAX = 25e16;  // 0.25
    uint256 constant T_MIN = 5e16;   // 0.05
    uint256 constant FEE_MAX = 3e15; // 0.3%
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE = 1400e18; // USD/KRW ~1400

    function run() external {
        address deployer = msg.sender;
        address oracleGuard = vm.envAddress("ORACLE_GUARD");

        vm.startBroadcast();

        // 1. Deploy EscrowVault
        EscrowVault escrow = new EscrowVault(USDC, deployer);
        console.log("EscrowVault:", address(escrow));

        // 2. Deploy MaturityTokenFactory
        MaturityTokenFactory factory = new MaturityTokenFactory(
            USDC, address(escrow), oracleGuard, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        // 3. Grant roles: Factory needs FACTORY_ROLE + DEFAULT_ADMIN_ROLE on EscrowVault
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        // 4. Set market feed ID
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);

        // 5. Create initial series: USD/KRW 90-day
        uint256 maturityTime = block.timestamp + POOL_LIFETIME;
        bytes32 seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        console.log("Series created, ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        // 6. Deploy FXPool for this series
        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool:", address(pool));

        // 7. Deploy Router
        Router router = new Router(address(factory), USDC);
        console.log("Router:", address(router));

        vm.stopBroadcast();

        console.log("\n=== Tokenized AMM Deployment Complete ===");
        console.log("Maturity:", maturityTime);
        console.log("Forward Rate: 1400 USD/KRW");
    }
}
