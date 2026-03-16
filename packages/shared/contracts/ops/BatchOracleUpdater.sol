// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BatchOracleUpdater
/// @notice 여러 오라클의 가격을 한 번의 tx로 업데이트
/// @dev 현재 Snowball 오라클 3종: SnowballOracle, CreditcoinOracle, BTCMockOracle
///      각각 별도 tx → 15+ tx/라운드 → 이 컨트랙트로 1 tx

interface ISnowballOracle {
    function updatePrice(address asset, uint256 price) external;
    function bootstrapPrice(address asset, uint256 price) external;
}

interface ICreditcoinOracle {
    function setPrice(uint256 newPrice) external;
}

interface IBTCMockOracle {
    function updatePrice(uint256 _price) external;
}

contract BatchOracleUpdater is Ownable {

    // ─── Storage ────────────────────────────────────────────────────────

    mapping(address => bool) public keepers;

    // ─── Events ─────────────────────────────────────────────────────────

    event KeeperUpdated(address indexed keeper, bool status);
    event BatchPriceUpdate(uint256 updateCount, uint256 gasUsed);

    // ─── Errors ─────────────────────────────────────────────────────────

    error NotKeeper();
    error LengthMismatch();

    // ─── Modifiers ──────────────────────────────────────────────────────

    modifier onlyKeeper() {
        if (!keepers[msg.sender] && msg.sender != owner()) revert NotKeeper();
        _;
    }

    constructor(address _owner) Ownable(_owner) {}

    function setKeeper(address keeper, bool status) external onlyOwner {
        keepers[keeper] = status;
        emit KeeperUpdated(keeper, status);
    }

    // ─── Core: 배치 업데이트 ────────────────────────────────────────────

    struct SnowballUpdate {
        address oracle;   // SnowballOracle 주소
        address asset;    // 자산 주소
        uint256 price;    // 1e18 스케일
    }

    struct MorphoOracleUpdate {
        address oracle;   // CreditcoinOracle 주소
        uint256 price;    // 1e36 스케일
    }

    /// @notice SnowballOracle + CreditcoinOracle + BTCMockOracle 한 번에 업데이트
    /// @param snowballUpdates SnowballOracle 업데이트 배열
    /// @param morphoUpdates CreditcoinOracle/Morpho 오라클 업데이트 배열
    /// @param btcOracle BTCMockOracle 주소 (address(0)이면 스킵)
    /// @param btcPrice BTC 가격 (1e18)
    function batchUpdatePrices(
        SnowballUpdate[] calldata snowballUpdates,
        MorphoOracleUpdate[] calldata morphoUpdates,
        address btcOracle,
        uint256 btcPrice
    ) external onlyKeeper {
        uint256 gasStart = gasleft();
        uint256 count;

        // SnowballOracle 업데이트
        // Prevent same (oracle, asset) pair from being updated multiple times in one batch
        for (uint256 i = 0; i < snowballUpdates.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    snowballUpdates[i].oracle != snowballUpdates[j].oracle ||
                    snowballUpdates[i].asset  != snowballUpdates[j].asset,
                    "BatchOracle: duplicate asset"
                );
            }
            ISnowballOracle(snowballUpdates[i].oracle).updatePrice(
                snowballUpdates[i].asset,
                snowballUpdates[i].price
            );
            count++;
        }

        // CreditcoinOracle/Morpho 오라클 업데이트
        for (uint256 i = 0; i < morphoUpdates.length; i++) {
            ICreditcoinOracle(morphoUpdates[i].oracle).setPrice(morphoUpdates[i].price);
            count++;
        }

        // BTCMockOracle 업데이트
        if (btcOracle != address(0) && btcPrice > 0) {
            IBTCMockOracle(btcOracle).updatePrice(btcPrice);
            count++;
        }

        emit BatchPriceUpdate(count, gasStart - gasleft());
    }

    /// @notice SnowballOracle만 배치 업데이트 (가장 빈번한 케이스)
    function batchUpdateSnowball(
        address oracle,
        address[] calldata assets,
        uint256[] calldata prices
    ) external onlyKeeper {
        if (assets.length != prices.length) revert LengthMismatch();
        // Prevent same asset from being updated multiple times in one batch
        for (uint256 i = 0; i < assets.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(assets[i] != assets[j], "BatchOracle: duplicate asset");
            }
            ISnowballOracle(oracle).updatePrice(assets[i], prices[i]);
        }
    }

    /// @notice 최초 가격 부트스트래핑 (한 번만)
    function batchBootstrap(
        address oracle,
        address[] calldata assets,
        uint256[] calldata prices
    ) external onlyOwner {
        if (assets.length != prices.length) revert LengthMismatch();
        for (uint256 i = 0; i < assets.length; i++) {
            ISnowballOracle(oracle).bootstrapPrice(assets[i], prices[i]);
        }
    }
}
