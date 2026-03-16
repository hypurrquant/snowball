// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UniswapV3TickLensExtended
/// @notice 한 번의 staticcall로 Uniswap V3 풀의 전체 유동성 깊이를 조회
/// @dev 기존 TickLens는 1 word(256틱)씩 조회해야 하지만, 이 컨트랙트는
///      지정 범위의 모든 초기화된 틱을 한 번에 반환한다.

interface IUniswapV3PoolMinimal {
    function slot0() external view returns (
        uint160 sqrtPriceX96, int24 tick, uint16 observationIndex,
        uint16 observationCardinality, uint16 observationCardinalityNext,
        uint8 feeProtocol, bool unlocked
    );
    function liquidity() external view returns (uint128);
    function tickSpacing() external view returns (int24);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function tickBitmap(int16 wordPosition) external view returns (uint256);
    function ticks(int24 tick) external view returns (
        uint128 liquidityGross, int128 liquidityNet,
        uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128,
        int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128,
        uint32 secondsOutside, bool initialized
    );
}

contract UniswapV3TickLensExtended {

    struct TickData {
        int24  tick;
        int128 liquidityNet;
        uint128 liquidityGross;
    }

    struct PoolSnapshot {
        address token0;
        address token1;
        uint24  fee;
        int24   tickSpacing;
        uint160 sqrtPriceX96;
        int24   currentTick;
        uint128 currentLiquidity;
        TickData[] ticks;
    }

    struct LiquidityDepthPoint {
        int24   tickLower;
        int24   tickUpper;
        uint128 liquidityActive;
        uint256 price0; // token0 per token1 (Q96 format)
    }

    // ─── Core: 전체 풀 스냅샷 ───────────────────────────────────────────

    /// @notice 풀의 전체 상태 + 지정 범위의 초기화된 틱을 한 번에 조회
    /// @param pool Uniswap V3 Pool 주소
    /// @param tickLower 조회 시작 틱 (inclusive, tickSpacing 배수일 필요 없음)
    /// @param tickUpper 조회 종료 틱 (inclusive)
    /// @return snapshot 풀 상태 + 틱 배열
    function getPoolSnapshot(
        address pool,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (PoolSnapshot memory snapshot) {
        IUniswapV3PoolMinimal p = IUniswapV3PoolMinimal(pool);

        snapshot.token0 = p.token0();
        snapshot.token1 = p.token1();
        snapshot.fee = p.fee();
        snapshot.tickSpacing = p.tickSpacing();
        (snapshot.sqrtPriceX96, snapshot.currentTick, , , , , ) = p.slot0();
        snapshot.currentLiquidity = p.liquidity();

        snapshot.ticks = getPopulatedTicksInRange(pool, tickLower, tickUpper);
    }

    // ─── 틱 범위 일괄 조회 ──────────────────────────────────────────────

    /// @notice tickLower ~ tickUpper 범위의 모든 초기화된 틱을 반환
    /// @dev bitmap word를 순회하면서 초기화된 비트를 찾아 ticks() 호출
    function getPopulatedTicksInRange(
        address pool,
        int24 tickLower,
        int24 tickUpper
    ) public view returns (TickData[] memory) {
        IUniswapV3PoolMinimal p = IUniswapV3PoolMinimal(pool);
        int24 spacing = p.tickSpacing();

        // bitmap word 범위 계산
        int16 wordLower = int16(tickLower / (spacing * 256));
        int16 wordUpper = int16(tickUpper / (spacing * 256));
        if (tickLower < 0 && tickLower % (spacing * 256) != 0) wordLower--;
        if (tickUpper > 0 || tickUpper % (spacing * 256) == 0) {} else wordUpper--;

        // 1st pass: count
        uint256 count;
        for (int16 w = wordLower; w <= wordUpper; w++) {
            uint256 bitmap = p.tickBitmap(w);
            count += _popcount(bitmap);
        }

        // 2nd pass: populate
        TickData[] memory result = new TickData[](count);
        uint256 idx;
        for (int16 w = wordLower; w <= wordUpper; w++) {
            uint256 bitmap = p.tickBitmap(w);
            if (bitmap == 0) continue;

            for (uint256 i = 0; i < 256; i++) {
                if (bitmap & (1 << i) == 0) continue;

                int24 tick = ((int24(w) << 8) + int24(int256(i))) * spacing;
                if (tick < tickLower || tick > tickUpper) continue;

                (uint128 grossLiq, int128 netLiq, , , , , , ) = p.ticks(tick);
                result[idx++] = TickData({
                    tick: tick,
                    liquidityNet: netLiq,
                    liquidityGross: grossLiq
                });
            }
        }

        // trim if filtered by range
        if (idx < count) {
            TickData[] memory trimmed = new TickData[](idx);
            for (uint256 j = 0; j < idx; j++) trimmed[j] = result[j];
            return trimmed;
        }
        return result;
    }

    // ─── 유동성 깊이 계산 ───────────────────────────────────────────────

    /// @notice 현재 가격 기준 ±percentBps 범위의 유동성 깊이를 계산
    /// @param pool 풀 주소
    /// @param numSteps 가격 단계 수 (각 방향)
    /// @return depths 각 단계별 누적 유동성
    function getLiquidityDepth(
        address pool,
        uint256 numSteps
    ) external view returns (LiquidityDepthPoint[] memory depths) {
        IUniswapV3PoolMinimal p = IUniswapV3PoolMinimal(pool);
        int24 spacing = p.tickSpacing();
        (uint160 sqrtPrice, int24 currentTick, , , , , ) = p.slot0();
        uint128 currentLiq = p.liquidity();

        // 현재 틱을 spacing에 맞춤
        int24 alignedTick = (currentTick / spacing) * spacing;

        // 범위: 현재 틱 기준 ±numSteps * spacing
        int24 lower = alignedTick - int24(int256(numSteps)) * spacing;
        int24 upper = alignedTick + int24(int256(numSteps)) * spacing;

        TickData[] memory ticksData = getPopulatedTicksInRange(pool, lower, upper);

        // 유동성 깊이 포인트 생성
        uint256 totalSteps = numSteps * 2 + 1;
        depths = new LiquidityDepthPoint[](totalSteps);

        uint128 runningLiq = currentLiq;

        // 아래 방향: currentTick → lower
        // 위 방향: currentTick → upper
        // 단순화: 각 spacing 간격의 유동성을 보고
        for (uint256 s = 0; s < totalSteps; s++) {
            int24 stepTick = lower + int24(int256(s)) * spacing;
            uint128 liqAtStep = _getLiquidityAtTick(stepTick, currentTick, currentLiq, ticksData);

            depths[s] = LiquidityDepthPoint({
                tickLower: stepTick,
                tickUpper: stepTick + spacing,
                liquidityActive: liqAtStep,
                price0: _tickToPrice(stepTick)
            });
        }
    }

    // ─── 멀티 풀 배치 조회 ──────────────────────────────────────────────

    /// @notice 여러 풀의 스냅샷을 한 번에 조회
    function getMultiPoolSnapshots(
        address[] calldata pools,
        int24[] calldata tickLowers,
        int24[] calldata tickUppers
    ) external view returns (PoolSnapshot[] memory snapshots) {
        require(pools.length == tickLowers.length && pools.length == tickUppers.length, "length mismatch");
        snapshots = new PoolSnapshot[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            snapshots[i] = this.getPoolSnapshot(pools[i], tickLowers[i], tickUppers[i]);
        }
    }

    // ─── Internal helpers ───────────────────────────────────────────────

    function _getLiquidityAtTick(
        int24 targetTick,
        int24 currentTick,
        uint128 currentLiq,
        TickData[] memory ticksData
    ) internal pure returns (uint128) {
        int128 liq = int128(currentLiq);

        if (targetTick <= currentTick) {
            // 아래 방향: currentTick에서 targetTick으로 이동
            for (uint256 i = ticksData.length; i > 0; i--) {
                int24 t = ticksData[i - 1].tick;
                if (t > currentTick) continue;
                if (t <= targetTick) break;
                liq -= ticksData[i - 1].liquidityNet; // 아래로 크로스하면 빼기
            }
        } else {
            // 위 방향: currentTick에서 targetTick으로 이동
            for (uint256 i = 0; i < ticksData.length; i++) {
                int24 t = ticksData[i].tick;
                if (t <= currentTick) continue;
                if (t > targetTick) break;
                liq += ticksData[i].liquidityNet; // 위로 크로스하면 더하기
            }
        }

        return liq > 0 ? uint128(liq) : 0;
    }

    function _tickToPrice(int24 tick) internal pure returns (uint256) {
        // 간단한 근사: sqrtPriceX96 ≈ 1.0001^(tick/2) * 2^96
        // 정확한 계산은 TickMath.getSqrtRatioAtTick 사용 권장
        // 여기서는 tick 값을 그대로 반환 (프론트엔드에서 변환)
        return uint256(int256(tick));
    }

    function _popcount(uint256 x) internal pure returns (uint256 count) {
        while (x != 0) {
            count++;
            x &= x - 1; // clear lowest set bit
        }
    }
}
