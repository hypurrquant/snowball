// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SnowballYieldVaultV2} from "../src/SnowballYieldVaultV2.sol";
import {SnowballKeeper} from "../src/SnowballKeeper.sol";
import {StrategySbUSDStabilityPool} from "../src/strategies/StrategySbUSDStabilityPool.sol";
import {StrategySbUSDMorpho} from "../src/strategies/StrategySbUSDMorpho.sol";
import {StrategyUSDCMorpho} from "../src/strategies/StrategyUSDCMorpho.sol";
import {StrategyWCTCMorpho} from "../src/strategies/StrategyWCTCMorpho.sol";
import {StrategyWCTCLoop} from "../src/strategies/StrategyWCTCLoop.sol";
import {ISnowballLend} from "../src/interfaces/ISnowballLend.sol";

/// @title DeployYieldV2
/// @notice Deploys 4 Vault+Strategy pairs + SnowballKeeper + wCTC Loop vault.
///
/// Usage:
///   forge script script/DeployYieldV2.s.sol:DeployYieldV2 \
///     --rpc-url $RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Required env vars (set in .env or pass via --env-file):
///   SBUSD, WCTC, USDC, MORPHO, SWAP_ROUTER, STABILITY_POOL_WCTC
///   MORPHO_ORACLE_WCTC, MORPHO_ORACLE_LSTCTC, MORPHO_ORACLE_SBUSD
///   MORPHO_IRM, KEEPER_BOT (optional)
contract DeployYieldV2 is Script {
    // --- Deployer-provided addresses (from env) ---
    address sbUSD;
    address wCTC;
    address usdc;
    address morpho;
    address swapRouter;
    address stabilityPoolWCTC;
    address morphoOracleWCTC;
    address morphoOracleSbUSD;
    address morphoIRM;

    uint24 constant SWAP_FEE = 3000; // 0.3%
    uint256 constant KEEPER_INTERVAL = 4 hours;

    function setUp() public {
        sbUSD = vm.envAddress("SBUSD");
        wCTC = vm.envAddress("WCTC");
        usdc = vm.envAddress("USDC");
        morpho = vm.envAddress("MORPHO");
        swapRouter = vm.envAddress("SWAP_ROUTER");
        stabilityPoolWCTC = vm.envAddress("STABILITY_POOL_WCTC");
        morphoOracleWCTC = vm.envAddress("MORPHO_ORACLE_WCTC");
        morphoOracleSbUSD = vm.envAddress("MORPHO_ORACLE_SBUSD");
        morphoIRM = vm.envAddress("MORPHO_IRM");
    }

    function run() public {
        address deployer = msg.sender;
        address treasury = deployer; // use deployer as treasury for testnet

        vm.startBroadcast();

        // ═══════════════════════════════════════════════════════════
        // 1. sv2SbUSD-SP: sbUSD → Liquity Stability Pool
        // ═══════════════════════════════════════════════════════════
        SnowballYieldVaultV2 vaultSbUSDSP = new SnowballYieldVaultV2(
            IERC20(sbUSD), "Snowball sbUSD StabilityPool V2", "sv2SbUSD-SP"
        );
        StrategySbUSDStabilityPool stratSbUSDSP = new StrategySbUSDStabilityPool(
            address(vaultSbUSDSP), sbUSD, wCTC, swapRouter, SWAP_FEE,
            deployer, treasury, stabilityPoolWCTC
        );
        vaultSbUSDSP.setStrategy(address(stratSbUSDSP));
        console.log("sv2SbUSD-SP vault:", address(vaultSbUSDSP));
        console.log("  strategy:", address(stratSbUSDSP));

        // ═══════════════════════════════════════════════════════════
        // 2. sv2SbUSD-M: sbUSD → Morpho Blue (wCTC/sbUSD market)
        // ═══════════════════════════════════════════════════════════
        ISnowballLend.MarketParams memory mpSbUSD = ISnowballLend.MarketParams({
            loanToken: sbUSD,
            collateralToken: wCTC,
            oracle: morphoOracleWCTC,
            irm: morphoIRM,
            lltv: 0.77e18
        });

        SnowballYieldVaultV2 vaultSbUSDM = new SnowballYieldVaultV2(
            IERC20(sbUSD), "Snowball sbUSD Morpho V2", "sv2SbUSD-M"
        );
        StrategySbUSDMorpho stratSbUSDM = new StrategySbUSDMorpho(
            address(vaultSbUSDM), sbUSD, wCTC, swapRouter, SWAP_FEE,
            deployer, treasury, morpho, mpSbUSD
        );
        vaultSbUSDM.setStrategy(address(stratSbUSDM));
        console.log("sv2SbUSD-M vault:", address(vaultSbUSDM));
        console.log("  strategy:", address(stratSbUSDM));

        // ═══════════════════════════════════════════════════════════
        // 3. sv2USDC-M: USDC → Morpho Blue (sbUSD/USDC market)
        // ═══════════════════════════════════════════════════════════
        ISnowballLend.MarketParams memory mpUSDC = ISnowballLend.MarketParams({
            loanToken: usdc,
            collateralToken: sbUSD,
            oracle: morphoOracleSbUSD,
            irm: morphoIRM,
            lltv: 0.86e18
        });

        SnowballYieldVaultV2 vaultUSDCM = new SnowballYieldVaultV2(
            IERC20(usdc), "Snowball USDC Morpho V2", "sv2USDC-M"
        );
        StrategyUSDCMorpho stratUSDCM = new StrategyUSDCMorpho(
            address(vaultUSDCM), usdc, wCTC, swapRouter, SWAP_FEE,
            deployer, treasury, morpho, mpUSDC
        );
        vaultUSDCM.setStrategy(address(stratUSDCM));
        console.log("sv2USDC-M vault:", address(vaultUSDCM));
        console.log("  strategy:", address(stratUSDCM));

        // ═══════════════════════════════════════════════════════════
        // 4. sv2wCTC-M: wCTC → Morpho Blue (wCTC as collateral supply)
        // ═══════════════════════════════════════════════════════════
        SnowballYieldVaultV2 vaultWCTCM = new SnowballYieldVaultV2(
            IERC20(wCTC), "Snowball wCTC Morpho V2", "sv2wCTC-M"
        );
        StrategyWCTCMorpho stratWCTCM = new StrategyWCTCMorpho(
            address(vaultWCTCM), wCTC, wCTC, swapRouter, SWAP_FEE,
            deployer, treasury, morpho, mpSbUSD
        );
        vaultWCTCM.setStrategy(address(stratWCTCM));
        console.log("sv2wCTC-M vault:", address(vaultWCTCM));
        console.log("  strategy:", address(stratWCTCM));

        // ═══════════════════════════════════════════════════════════
        // 5. sv2wCTC-Loop: wCTC → Leveraged Loop (Morpho)
        // ═══════════════════════════════════════════════════════════
        SnowballYieldVaultV2 vaultWCTCLoop = new SnowballYieldVaultV2(
            IERC20(wCTC), "Snowball wCTC Loop V2", "sv2wCTC-Loop"
        );
        StrategyWCTCLoop stratWCTCLoop = new StrategyWCTCLoop(
            address(vaultWCTCLoop), wCTC, wCTC, swapRouter, SWAP_FEE,
            deployer, treasury, morpho, sbUSD, mpSbUSD
        );
        vaultWCTCLoop.setStrategy(address(stratWCTCLoop));
        console.log("sv2wCTC-Loop vault:", address(vaultWCTCLoop));
        console.log("  strategy:", address(stratWCTCLoop));

        // ═══════════════════════════════════════════════════════════
        // 6. SnowballKeeper — register all strategies
        // ═══════════════════════════════════════════════════════════
        SnowballKeeper keeper = new SnowballKeeper(KEEPER_INTERVAL);
        keeper.addStrategy(address(stratSbUSDSP));
        keeper.addStrategy(address(stratSbUSDM));
        keeper.addStrategy(address(stratUSDCM));
        keeper.addStrategy(address(stratWCTCM));
        keeper.addStrategy(address(stratWCTCLoop));

        // Set keeper bot if env var is provided
        address keeperBot = vm.envOr("KEEPER_BOT", address(0));
        if (keeperBot != address(0)) {
            keeper.setKeeper(keeperBot, true);
        }

        console.log("SnowballKeeper:", address(keeper));
        console.log("  strategies registered:", keeper.strategiesLength());

        vm.stopBroadcast();

        // ═══════════════════════════════════════════════════════════
        // Summary
        // ═══════════════════════════════════════════════════════════
        console.log("\n=== Yield V2 Deployment Summary ===");
        console.log("sv2SbUSD-SP:", address(vaultSbUSDSP));
        console.log("sv2SbUSD-M:", address(vaultSbUSDM));
        console.log("sv2USDC-M:", address(vaultUSDCM));
        console.log("sv2wCTC-M:", address(vaultWCTCM));
        console.log("sv2wCTC-Loop:", address(vaultWCTCLoop));
        console.log("Keeper:", address(keeper));
    }
}
