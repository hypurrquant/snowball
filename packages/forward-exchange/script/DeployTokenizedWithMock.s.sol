// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MockUSDC} from "../src/tokenized/MockUSDC.sol";
import {EscrowVault} from "../src/tokenized/EscrowVault.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";
import {Router} from "../src/tokenized/Router.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";

/// @title DeployTokenizedWithMock
/// @notice Deploys MockUSDC + full Tokenized Forward AMM system to testnet
contract DeployTokenizedWithMock is Script {
    bytes32 constant USD_KRW_FEED_ID = 0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3;
    bytes32 constant USD_KRW_MARKET = keccak256("USD/KRW");

    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;
    int256 constant FORWARD_RATE = 1400e18;

    function run() external {
        address deployer = msg.sender;
        address oracleGuard = vm.envAddress("ORACLE_GUARD");

        vm.startBroadcast();

        // 1. Deploy MockUSDC
        MockUSDC mockUsdc = new MockUSDC();
        console.log("MockUSDC:", address(mockUsdc));

        // 2. Deploy EscrowVault with MockUSDC
        EscrowVault escrow = new EscrowVault(address(mockUsdc), deployer);
        console.log("EscrowVault:", address(escrow));

        // 3. Deploy MaturityTokenFactory
        MaturityTokenFactory factory = new MaturityTokenFactory(
            address(mockUsdc), address(escrow), oracleGuard, deployer
        );
        console.log("MaturityTokenFactory:", address(factory));

        // 4. Grant roles
        escrow.grantRole(escrow.FACTORY_ROLE(), address(factory));
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(factory));

        // 5. Set market feed ID
        factory.setMarketFeedId(USD_KRW_MARKET, USD_KRW_FEED_ID);

        // 6. Create initial series: USD/KRW 90-day
        uint256 maturityTime = block.timestamp + POOL_LIFETIME;
        bytes32 seriesId = factory.createSeries(USD_KRW_MARKET, maturityTime, FORWARD_RATE);
        console.log("Series created, ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        // 7. Deploy FXPool
        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool:", address(pool));

        // 8. Deploy Router
        Router router = new Router(address(factory), address(mockUsdc));
        console.log("Router:", address(router));

        vm.stopBroadcast();

        console.log("\n=== Tokenized AMM (MockUSDC) Deployment Complete ===");
        console.log("Maturity:", maturityTime);
        console.log("Forward Rate: 1400 USD/KRW");
    }
}
