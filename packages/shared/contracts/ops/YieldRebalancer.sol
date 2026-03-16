// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title YieldRebalancer
/// @notice 전략 간 자금 리밸런싱 + 수확을 1 tx로 실행
/// @dev SnowballKeeper와 함께 사용하여 전략 교체, 비중 조절 등 관리

interface IYieldVault {
    function balance() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getPricePerFullShare() external view returns (uint256);
    function strategy() external view returns (address);
    function deposit(uint256 amount) external;
    function withdraw(uint256 shares) external;
    function proposeStrat(address newStrategy) external;
    function upgradeStrat() external;
    function earn() external;
}

interface IStrategy {
    function balanceOf() external view returns (uint256);
    function balanceOfPool() external view returns (uint256);
    function balanceOfWant() external view returns (uint256);
    function harvest() external;
    function lastHarvest() external view returns (uint256);
    function paused() external view returns (bool);
    function retireStrat() external;
    function panic() external;
}

contract YieldRebalancer is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Storage ────────────────────────────────────────────────────────

    mapping(address => bool) public keepers;

    // ─── Structs ────────────────────────────────────────────────────────

    struct VaultStatus {
        address vault;
        address strategy;
        uint256 totalBalance;
        uint256 strategyBalance;
        uint256 idleBalance;
        uint256 pricePerShare;
        uint256 lastHarvest;
        bool    paused;
        uint256 timeSinceHarvest;
    }

    struct HarvestResult {
        address vault;
        bool    success;
        uint256 gasUsed;
    }

    // ─── Events ─────────────────────────────────────────────────────────

    event BatchHarvested(uint256 count, uint256 successCount, uint256 totalGas);
    event Rebalanced(address fromVault, address toVault, uint256 amount);
    event EmergencyPanic(address vault, address strategy);

    // ─── Constructor ────────────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    function setKeeper(address keeper, bool status) external onlyOwner {
        keepers[keeper] = status;
    }

    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "not keeper");
        _;
    }

    // ─── 상태 조회 ──────────────────────────────────────────────────────

    /// @notice 여러 Vault의 상태를 한 번에 조회 + 수확 필요 여부 판단
    function getVaultStatuses(
        address[] calldata vaults,
        uint256 minHarvestInterval  // 이 시간 지났으면 수확 필요 (seconds)
    ) external view returns (VaultStatus[] memory statuses, bool[] memory needsHarvest) {
        statuses = new VaultStatus[](vaults.length);
        needsHarvest = new bool[](vaults.length);

        for (uint256 i = 0; i < vaults.length; i++) {
            IYieldVault v = IYieldVault(vaults[i]);
            address stratAddr = v.strategy();

            VaultStatus memory s;
            s.vault = vaults[i];
            s.strategy = stratAddr;
            s.totalBalance = v.balance();
            s.pricePerShare = v.getPricePerFullShare();

            if (stratAddr != address(0)) {
                IStrategy strat = IStrategy(stratAddr);
                s.strategyBalance = strat.balanceOfPool();
                s.idleBalance = strat.balanceOfWant();
                s.lastHarvest = strat.lastHarvest();
                s.paused = strat.paused();
                s.timeSinceHarvest = block.timestamp > s.lastHarvest
                    ? block.timestamp - s.lastHarvest
                    : 0;
            }

            statuses[i] = s;
            needsHarvest[i] = !s.paused
                && stratAddr != address(0)
                && s.timeSinceHarvest >= minHarvestInterval;
        }
    }

    // ─── 배치 수확 (SnowballKeeper 보완) ────────────────────────────────

    /// @notice 수확이 필요한 전략만 선별적으로 수확
    /// @dev try/catch로 개별 실패 허용 — 하나 실패해도 나머지 계속
    function harvestSelective(
        address[] calldata vaults
    ) external onlyKeeper nonReentrant returns (HarvestResult[] memory results) {
        results = new HarvestResult[](vaults.length);
        uint256 successCount;
        uint256 totalGasUsed;

        for (uint256 i = 0; i < vaults.length; i++) {
            uint256 gasStart = gasleft();
            address stratAddr = IYieldVault(vaults[i]).strategy();

            if (stratAddr == address(0)) {
                results[i] = HarvestResult(vaults[i], false, 0);
                continue;
            }

            try IStrategy(stratAddr).harvest() {
                results[i] = HarvestResult(vaults[i], true, gasStart - gasleft());
                successCount++;
            } catch {
                results[i] = HarvestResult(vaults[i], false, gasStart - gasleft());
            }
            totalGasUsed += gasStart - gasleft();
        }

        emit BatchHarvested(vaults.length, successCount, totalGasUsed);
    }

    // ─── 리밸런싱: Vault 간 자금 이동 ───────────────────────────────────

    /// @notice Vault A에서 출금 → Vault B에 입금 (같은 want 토큰)
    /// @param fromVault 출금 Vault
    /// @param toVault 입금 Vault
    /// @param shares 출금할 LP 수량
    /// @param want want 토큰 주소
    function rebalance(
        address fromVault,
        address toVault,
        uint256 shares,
        address want
    ) external onlyOwner nonReentrant {
        // 출금
        uint256 balBefore = IERC20(want).balanceOf(address(this));
        IYieldVault(fromVault).withdraw(shares);
        uint256 received = IERC20(want).balanceOf(address(this)) - balBefore;

        // 입금
        IERC20(want).forceApprove(toVault, received);
        IYieldVault(toVault).deposit(received);

        emit Rebalanced(fromVault, toVault, received);
    }

    // ─── 긴급: 전략 일시 중지 ───────────────────────────────────────────

    /// @notice 여러 전략을 한 번에 panic (긴급 출금)
    function batchPanic(address[] calldata vaults) external onlyOwner {
        for (uint256 i = 0; i < vaults.length; i++) {
            address stratAddr = IYieldVault(vaults[i]).strategy();
            if (stratAddr != address(0)) {
                try IStrategy(stratAddr).panic() {
                    emit EmergencyPanic(vaults[i], stratAddr);
                } catch {}
            }
        }
    }

    // ─── 토큰 회수 ─────────────────────────────────────────────────────

    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
