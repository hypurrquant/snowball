// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title SnowballLens
/// @notice 전 프로토콜 포지션 및 상태를 한 번의 call로 조회하는 집계 렌즈
/// @dev 모든 함수가 view — 가스비 없이 eth_call로 사용

// ─── Minimal Interfaces ─────────────────────────────────────────────────

interface ISnowballOracle {
    function getPrice(address asset) external view returns (uint256);
    function lastUpdated(address asset) external view returns (uint256);
}

interface ITroveManager {
    function getTroveDebt(uint256 troveId) external view returns (uint256);
    function getTroveColl(uint256 troveId) external view returns (uint256);
    function getTroveAnnualInterestRate(uint256 troveId) external view returns (uint256);
}

interface IStabilityPool {
    function getCompoundedBoldDeposit(address depositor) external view returns (uint256);
    function getDepositorCollGain(address depositor) external view returns (uint256);
}

interface IMorphoMinimal {
    function position(bytes32 id, address user) external view returns (
        uint256 supplyShares, uint128 borrowShares, uint128 collateral
    );
    function market(bytes32 id) external view returns (
        uint128 totalSupplyAssets, uint128 totalSupplyShares,
        uint128 totalBorrowAssets, uint128 totalBorrowShares,
        uint128 lastUpdate, uint128 fee
    );
}

interface ISnowballYieldVault {
    function balance() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getPricePerFullShare() external view returns (uint256);
    function strategy() external view returns (address);
}

interface ISnowballStrategy {
    function balanceOf() external view returns (uint256);
    function balanceOfPool() external view returns (uint256);
    function balanceOfWant() external view returns (uint256);
    function lastHarvest() external view returns (uint256);
    function paused() external view returns (bool);
}

contract SnowballLens {

    // ─── Structs ────────────────────────────────────────────────────────

    struct TrovePosition {
        uint256 troveId;
        uint256 collateral;      // wCTC amount
        uint256 debt;            // sbUSD amount
        uint256 annualRate;      // interest rate (1e18)
        uint256 collateralUSD;   // collateral value in USD (1e18)
        uint256 healthFactor;    // coll * price / debt (1e18, >1.1 safe)
    }

    struct MorphoPosition {
        bytes32 marketId;
        uint256 supplyAssets;
        uint256 borrowAssets;
        uint256 collateralAssets;
    }

    struct YieldVaultInfo {
        address vault;
        uint256 totalBalance;     // total assets managed
        uint256 totalSupply;      // total LP tokens
        uint256 pricePerShare;    // 1e18
        uint256 strategyBalance;  // in pool
        uint256 idleBalance;      // in vault (not deployed)
        uint256 lastHarvest;
        bool    paused;
    }

    struct StabilityPoolPosition {
        uint256 deposit;          // sbUSD deposited
        uint256 collGain;         // wCTC earned from liquidations
    }

    struct UserDashboard {
        // Balances
        uint256 wCTCBalance;
        uint256 sbUSDBalance;
        uint256 usdcBalance;
        // Positions
        TrovePosition[] troves;
        MorphoPosition[] morphoPositions;
        StabilityPoolPosition stabilityPool;
        // Yield
        YieldVaultInfo[] yieldVaults;
        // Prices
        uint256 wCTCPrice;
        uint256 sbUSDPrice;
    }

    // ─── Trove 조회 ─────────────────────────────────────────────────────

    /// @notice 여러 Trove의 상세 정보를 한 번에 조회
    function getTrovePositions(
        address troveManager,
        address oracle,
        address wCTC,
        uint256[] calldata troveIds
    ) external view returns (TrovePosition[] memory positions) {
        ITroveManager tm = ITroveManager(troveManager);
        uint256 price = ISnowballOracle(oracle).getPrice(wCTC);

        positions = new TrovePosition[](troveIds.length);
        for (uint256 i = 0; i < troveIds.length; i++) {
            uint256 coll = tm.getTroveColl(troveIds[i]);
            uint256 debt = tm.getTroveDebt(troveIds[i]);
            uint256 rate = tm.getTroveAnnualInterestRate(troveIds[i]);
            uint256 collUSD = coll * price / 1e18;
            uint256 hf = debt > 0 ? collUSD * 1e18 / debt : type(uint256).max;

            positions[i] = TrovePosition({
                troveId: troveIds[i],
                collateral: coll,
                debt: debt,
                annualRate: rate,
                collateralUSD: collUSD,
                healthFactor: hf
            });
        }
    }

    // ─── Morpho 조회 ────────────────────────────────────────────────────

    /// @notice 여러 Morpho 마켓에서 유저 포지션을 한 번에 조회
    function getMorphoPositions(
        address morpho,
        address user,
        bytes32[] calldata marketIds
    ) external view returns (MorphoPosition[] memory positions) {
        IMorphoMinimal m = IMorphoMinimal(morpho);
        positions = new MorphoPosition[](marketIds.length);

        for (uint256 i = 0; i < marketIds.length; i++) {
            (uint256 supplyShares, uint128 borrowShares, uint128 collateral) =
                m.position(marketIds[i], user);

            // shares → assets 변환
            (uint128 totalSupplyAssets, uint128 totalSupplyShares,
             uint128 totalBorrowAssets, uint128 totalBorrowShares, , ) =
                m.market(marketIds[i]);

            uint256 supplyAssets = totalSupplyShares > 0
                ? supplyShares * totalSupplyAssets / totalSupplyShares
                : 0;
            uint256 borrowAssets = totalBorrowShares > 0
                ? uint256(borrowShares) * totalBorrowAssets / totalBorrowShares
                : 0;

            positions[i] = MorphoPosition({
                marketId: marketIds[i],
                supplyAssets: supplyAssets,
                borrowAssets: borrowAssets,
                collateralAssets: uint256(collateral)
            });
        }
    }

    // ─── Yield Vault 조회 ───────────────────────────────────────────────

    /// @notice 여러 Yield Vault의 상태를 한 번에 조회
    function getYieldVaultInfos(
        address[] calldata vaults
    ) external view returns (YieldVaultInfo[] memory infos) {
        infos = new YieldVaultInfo[](vaults.length);

        for (uint256 i = 0; i < vaults.length; i++) {
            ISnowballYieldVault v = ISnowballYieldVault(vaults[i]);
            address stratAddr = v.strategy();

            uint256 stratBalance;
            uint256 idleBalance;
            uint256 lastHarvest;
            bool paused;

            if (stratAddr != address(0)) {
                ISnowballStrategy strat = ISnowballStrategy(stratAddr);
                stratBalance = strat.balanceOfPool();
                idleBalance = strat.balanceOfWant();
                lastHarvest = strat.lastHarvest();
                paused = strat.paused();
            }

            infos[i] = YieldVaultInfo({
                vault: vaults[i],
                totalBalance: v.balance(),
                totalSupply: v.totalSupply(),
                pricePerShare: v.getPricePerFullShare(),
                strategyBalance: stratBalance,
                idleBalance: idleBalance,
                lastHarvest: lastHarvest,
                paused: paused
            });
        }
    }

    // ─── StabilityPool 조회 ─────────────────────────────────────────────

    /// @notice 유저의 StabilityPool 포지션 조회
    function getStabilityPoolPosition(
        address stabilityPool,
        address user
    ) external view returns (StabilityPoolPosition memory pos) {
        IStabilityPool sp = IStabilityPool(stabilityPool);
        pos.deposit = sp.getCompoundedBoldDeposit(user);
        pos.collGain = sp.getDepositorCollGain(user);
    }

    // ─── 전체 대시보드 ──────────────────────────────────────────────────

    /// @notice 유저의 전 프로토콜 포지션을 한 번의 call로 조회
    function getUserDashboard(
        address user,
        address wCTC,
        address sbUSD,
        address usdc,
        address oracle,
        address troveManager,
        uint256[] calldata troveIds,
        address morpho,
        bytes32[] calldata morphoMarketIds,
        address stabilityPool,
        address[] calldata yieldVaults
    ) external view returns (UserDashboard memory dashboard) {
        // Token balances
        dashboard.wCTCBalance = IERC20(wCTC).balanceOf(user);
        dashboard.sbUSDBalance = IERC20(sbUSD).balanceOf(user);
        dashboard.usdcBalance = IERC20(usdc).balanceOf(user);

        // Prices
        dashboard.wCTCPrice = ISnowballOracle(oracle).getPrice(wCTC);
        dashboard.sbUSDPrice = ISnowballOracle(oracle).getPrice(sbUSD);

        // Troves
        if (troveIds.length > 0) {
            dashboard.troves = this.getTrovePositions(troveManager, oracle, wCTC, troveIds);
        }

        // Morpho
        if (morphoMarketIds.length > 0) {
            dashboard.morphoPositions = this.getMorphoPositions(morpho, user, morphoMarketIds);
        }

        // StabilityPool
        if (stabilityPool != address(0)) {
            dashboard.stabilityPool = this.getStabilityPoolPosition(stabilityPool, user);
        }

        // Yield Vaults
        if (yieldVaults.length > 0) {
            dashboard.yieldVaults = this.getYieldVaultInfos(yieldVaults);
        }
    }

    // ─── 프로토콜 전체 TVL ──────────────────────────────────────────────

    struct ProtocolTVL {
        uint256 liquityTVL;       // total collateral in Troves (wCTC in USD)
        uint256 morphoTVL;        // total supply across markets
        uint256 stabilityPoolTVL; // total sbUSD in SP
        uint256 yieldVaultTVL;    // total across all vaults
        uint256 totalTVL;
    }

    /// @notice 프로토콜 전체 TVL 조회
    function getProtocolTVL(
        address[] calldata yieldVaults,
        address stabilityPool,
        address sbUSD
    ) external view returns (ProtocolTVL memory tvl) {
        // StabilityPool
        if (stabilityPool != address(0)) {
            tvl.stabilityPoolTVL = IERC20(sbUSD).balanceOf(stabilityPool);
        }

        // Yield Vaults
        for (uint256 i = 0; i < yieldVaults.length; i++) {
            tvl.yieldVaultTVL += ISnowballYieldVault(yieldVaults[i]).balance();
        }

        tvl.totalTVL = tvl.liquityTVL + tvl.morphoTVL + tvl.stabilityPoolTVL + tvl.yieldVaultTVL;
    }
}
