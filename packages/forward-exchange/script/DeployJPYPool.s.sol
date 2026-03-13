// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MaturityTokenFactory} from "../src/tokenized/MaturityTokenFactory.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {FXPool} from "../src/tokenized/FXPool.sol";
import {FXPoolDeployer} from "../src/tokenized/FXPoolDeployer.sol";

/// @title DeployJPYPool
/// @notice Creates USD/JPY series + FXPool on HyperEVM (requires big block for createSeries)
contract DeployJPYPool is Script {
    bytes32 constant USD_JPY_MARKET = keccak256("USD/JPY");
    bytes32 constant USD_JPY_FEED_ID = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    int256 constant FORWARD_RATE = 150e18;

    uint256 constant T_MAX = 25e16;
    uint256 constant T_MIN = 5e16;
    uint256 constant FEE_MAX = 3e15;
    uint256 constant POOL_LIFETIME = 90 days;

    function run() external {
        address deployer = msg.sender;

        // HyperEVM factory
        MaturityTokenFactory factory = MaturityTokenFactory(0xD7966b295a130C33377dE1e8a9D33487098847eD);
        uint256 maturityTime = 1780575178; // Same as KRW/EUR on HyperEVM

        vm.startBroadcast();

        // 1. Create series
        bytes32 seriesId = factory.createSeries(USD_JPY_MARKET, maturityTime, FORWARD_RATE);
        console.log("Series ID:");
        console.logBytes32(seriesId);

        IMaturityTokenFactory.Series memory s = factory.getSeries(seriesId);
        console.log("fToken:", s.fToken);
        console.log("sfToken:", s.sfToken);

        // 2. Deploy & initialize FXPool
        FXPool pool = FXPoolDeployer.deploy(s.fToken, s.sfToken, maturityTime, POOL_LIFETIME, T_MAX, T_MIN, FEE_MAX);
        console.log("FXPool JPY:", address(pool));

        vm.stopBroadcast();
    }
}
