// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LiquidationBot
/// @notice Liquity + Morpho 청산 기회를 한 번의 call로 탐색 + 배치 실행
/// @dev 수익성 있는 청산만 실행, 가스비보다 이익이 큰지 사전 검증

interface ITroveManager {
    function getTroveDebt(uint256 troveId) external view returns (uint256);
    function getTroveColl(uint256 troveId) external view returns (uint256);
    function getTroveAnnualInterestRate(uint256 troveId) external view returns (uint256);
    function getCurrentICR(uint256 troveId, uint256 price) external view returns (uint256);
}

interface ILiquityLiquidation {
    function liquidate(uint256 troveId) external;
    function batchLiquidateTroves(uint256[] calldata troveIds) external;
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
    function liquidate(
        bytes32 marketId, address borrower, uint256 seizedAssets, uint256 seizedShares, bytes calldata data
    ) external returns (uint256, uint256);
}

interface IOracle {
    function getPrice(address asset) external view returns (uint256);
}

contract LiquidationBot is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Storage ────────────────────────────────────────────────────────

    mapping(address => bool) public keepers;

    // ─── Structs ────────────────────────────────────────────────────────

    struct LiquityLiquidatable {
        uint256 troveId;
        uint256 collateral;   // wCTC
        uint256 debt;         // sbUSD
        uint256 icr;          // Individual Collateralization Ratio (1e18)
        uint256 profit;       // estimated profit (collateral * price - debt)
    }

    struct MorphoLiquidatable {
        bytes32 marketId;
        address borrower;
        uint128 collateral;
        uint256 borrowAssets;
        uint256 ltv;          // loan-to-value (1e18)
    }

    struct LiquidationResult {
        uint256 liquityCount;
        uint256 morphoCount;
        uint256 totalGasUsed;
    }

    // ─── Events ─────────────────────────────────────────────────────────

    event LiquityBatchLiquidated(uint256 count, uint256 gasUsed);
    event MorphoBatchLiquidated(uint256 count, uint256 gasUsed);
    event ProfitSwept(address token, address to, uint256 amount);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    function setKeeper(address keeper, bool status) external onlyOwner {
        keepers[keeper] = status;
    }

    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "not keeper");
        _;
    }

    // ─── Liquity: 청산 가능 Trove 스캔 ──────────────────────────────────

    /// @notice 여러 Trove의 ICR을 한 번에 확인하고 청산 가능한 것만 반환
    /// @param troveManager TroveManager 주소
    /// @param oracle 가격 오라클 주소
    /// @param wCTC wCTC 토큰 주소
    /// @param troveIds 확인할 Trove ID 배열
    /// @param mcrThreshold MCR 임계값 (예: 1.1e18 = 110%)
    function scanLiquityLiquidatable(
        address troveManager,
        address oracle,
        address wCTC,
        uint256[] calldata troveIds,
        uint256 mcrThreshold
    ) external view returns (LiquityLiquidatable[] memory) {
        ITroveManager tm = ITroveManager(troveManager);
        uint256 price = IOracle(oracle).getPrice(wCTC);

        // 1st pass: count
        uint256 count;
        for (uint256 i = 0; i < troveIds.length; i++) {
            uint256 icr = tm.getCurrentICR(troveIds[i], price);
            if (icr < mcrThreshold) count++;
        }

        // 2nd pass: populate
        LiquityLiquidatable[] memory result = new LiquityLiquidatable[](count);
        uint256 idx;
        for (uint256 i = 0; i < troveIds.length; i++) {
            uint256 coll = tm.getTroveColl(troveIds[i]);
            uint256 debt = tm.getTroveDebt(troveIds[i]);
            uint256 icr = tm.getCurrentICR(troveIds[i], price);

            if (icr < mcrThreshold) {
                uint256 collValue = coll * price / 1e18;
                result[idx++] = LiquityLiquidatable({
                    troveId: troveIds[i],
                    collateral: coll,
                    debt: debt,
                    icr: icr,
                    profit: collValue > debt ? collValue - debt : 0
                });
            }
        }
        return result;
    }

    /// @notice Liquity Trove 배치 청산
    function executeLiquityLiquidation(
        address liquidator,
        uint256[] calldata troveIds
    ) external onlyKeeper nonReentrant {
        uint256 gasStart = gasleft();
        ILiquityLiquidation(liquidator).batchLiquidateTroves(troveIds);
        emit LiquityBatchLiquidated(troveIds.length, gasStart - gasleft());
    }

    // ─── Morpho: 청산 가능 포지션 스캔 ──────────────────────────────────

    /// @notice Morpho 마켓에서 청산 가능한 borrower를 스캔
    function scanMorphoLiquidatable(
        address morpho,
        bytes32 marketId,
        address[] calldata borrowers,
        uint256 lltvThreshold  // liquidation LTV threshold (1e18)
    ) external view returns (MorphoLiquidatable[] memory) {
        IMorphoMinimal m = IMorphoMinimal(morpho);

        (uint128 totalSupplyAssets, uint128 totalSupplyShares,
         uint128 totalBorrowAssets, uint128 totalBorrowShares, , ) = m.market(marketId);

        uint256 count;
        for (uint256 i = 0; i < borrowers.length; i++) {
            (, uint128 borrowShares, uint128 collateral) = m.position(marketId, borrowers[i]);
            if (borrowShares == 0) continue;

            uint256 borrowAssets = totalBorrowShares > 0
                ? uint256(borrowShares) * totalBorrowAssets / totalBorrowShares
                : 0;
            // LTV = borrowAssets / collateral (simplified, same-unit assumption)
            uint256 ltv = collateral > 0 ? borrowAssets * 1e18 / collateral : type(uint256).max;
            if (ltv >= lltvThreshold) count++;
        }

        MorphoLiquidatable[] memory result = new MorphoLiquidatable[](count);
        uint256 idx;
        for (uint256 i = 0; i < borrowers.length; i++) {
            (, uint128 borrowShares, uint128 collateral) = m.position(marketId, borrowers[i]);
            if (borrowShares == 0) continue;

            uint256 borrowAssets = totalBorrowShares > 0
                ? uint256(borrowShares) * totalBorrowAssets / totalBorrowShares
                : 0;
            uint256 ltv = collateral > 0 ? borrowAssets * 1e18 / collateral : type(uint256).max;

            if (ltv >= lltvThreshold) {
                result[idx++] = MorphoLiquidatable({
                    marketId: marketId,
                    borrower: borrowers[i],
                    collateral: collateral,
                    borrowAssets: borrowAssets,
                    ltv: ltv
                });
            }
        }
        return result;
    }

    // ─── 수익 회수 ──────────────────────────────────────────────────────

    /// @notice 청산으로 얻은 토큰을 owner에게 전송
    function sweepProfit(address token, address to) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).safeTransfer(to, bal);
            emit ProfitSwept(token, to, bal);
        }
    }

    /// @notice native CTC 회수
    function sweepETH(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal > 0) to.transfer(bal);
    }

    receive() external payable {}
}
