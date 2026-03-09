"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  NonfungiblePositionManagerABI,
  UniswapV3FactoryABI,
  UniswapV3PoolABI,
  MockOracleABI,
} from "@/core/abis";
import { DEX, TOKENS, TOKEN_INFO, LEND } from "@/core/config/addresses";
import { getPositionAmounts } from "@snowball/core";
import type { Address } from "viem";

// ── Types ──

export interface UserPosition {
  tokenId: bigint;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  isInRange: boolean;
  amount0: number;
  amount1: number;
  valueUsd: number;
  feesUsd: number;
  token0Symbol: string;
  token1Symbol: string;
}

export interface UseUserPositionsReturn {
  positions: UserPosition[];
  totalValueUsd: number;
  totalFeesUsd: number;
  positionCount: number;
  isLoading: boolean;
}

// ── Token → Oracle mapping ──

const TOKEN_ORACLE_MAP: Record<string, Address> = {
  [TOKENS.wCTC.toLowerCase()]: LEND.oracles.wCTC,
  [TOKENS.lstCTC.toLowerCase()]: LEND.oracles.lstCTC,
  [TOKENS.sbUSD.toLowerCase()]: LEND.oracles.sbUSD,
};

const ORACLE_SCALE = 1e36;
const MAX_POSITIONS = 20;

// ── Hook ──

export function useUserPositions(address?: Address): UseUserPositionsReturn {
  // Phase 1: balanceOf
  const { data: rawBalance, isLoading: isBalanceLoading } = useReadContract({
    address: DEX.nonfungiblePositionManager,
    abi: NonfungiblePositionManagerABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const positionCount = rawBalance ? Number(rawBalance) : 0;
  const fetchCount = Math.min(positionCount, MAX_POSITIONS);

  // Phase 2: tokenOfOwnerByIndex
  const indexContracts = useMemo(
    () =>
      Array.from({ length: fetchCount }, (_, i) => ({
        address: DEX.nonfungiblePositionManager,
        abi: NonfungiblePositionManagerABI,
        functionName: "tokenOfOwnerByIndex" as const,
        args: [address!, BigInt(i)] as const,
      })),
    [address, fetchCount],
  );

  const { data: tokenIdResults, isLoading: isTokenIdsLoading } =
    useReadContracts({
      contracts: indexContracts,
      query: { enabled: fetchCount > 0 && !!address },
    });

  const tokenIds = useMemo(
    () =>
      (tokenIdResults ?? [])
        .filter((r) => r.status === "success")
        .map((r) => r.result as bigint),
    [tokenIdResults],
  );

  // Phase 3: positions(tokenId)
  const positionContracts = useMemo(
    () =>
      tokenIds.map((id) => ({
        address: DEX.nonfungiblePositionManager,
        abi: NonfungiblePositionManagerABI,
        functionName: "positions" as const,
        args: [id] as const,
      })),
    [tokenIds],
  );

  const { data: positionResults, isLoading: isPositionsLoading } =
    useReadContracts({
      contracts: positionContracts,
      query: { enabled: tokenIds.length > 0, refetchInterval: 30_000 },
    });

  // Parse raw positions + filter open (liquidity > 0)
  const rawPositions = useMemo(() => {
    if (!positionResults) return [];
    return positionResults
      .map((r, i) => {
        if (r.status !== "success") return null;
        const d = r.result as readonly [
          bigint, Address, Address, Address, number, number, number,
          bigint, bigint, bigint, bigint, bigint,
        ];
        return {
          tokenId: tokenIds[i],
          token0: d[2] as Address,
          token1: d[3] as Address,
          fee: Number(d[4]),
          tickLower: Number(d[5]),
          tickUpper: Number(d[6]),
          liquidity: d[7] as bigint,
          tokensOwed0: d[10] as bigint,
          tokensOwed1: d[11] as bigint,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && p.liquidity > 0n);
  }, [positionResults, tokenIds]);

  // Phase 4: getPool for unique (token0, token1, fee) combos
  const uniquePoolKeys = useMemo(() => {
    const seen = new Set<string>();
    return rawPositions
      .map((p) => {
        const key = `${p.token0}-${p.token1}-${p.fee}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return { token0: p.token0, token1: p.token1, fee: p.fee, key };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [rawPositions]);

  const poolContracts = useMemo(
    () =>
      uniquePoolKeys.map((pk) => ({
        address: DEX.factory,
        abi: UniswapV3FactoryABI,
        functionName: "getPool" as const,
        args: [pk.token0, pk.token1, pk.fee] as const,
      })),
    [uniquePoolKeys],
  );

  const { data: poolResults, isLoading: isPoolsLoading } = useReadContracts({
    contracts: poolContracts,
    query: { enabled: uniquePoolKeys.length > 0 },
  });

  const poolKeyToAddress = useMemo(() => {
    const map = new Map<string, Address>();
    if (!poolResults) return map;
    poolResults.forEach((r, i) => {
      if (r.status === "success" && r.result) {
        map.set(uniquePoolKeys[i].key, r.result as Address);
      }
    });
    return map;
  }, [poolResults, uniquePoolKeys]);

  // Phase 5: slot0 for unique pools
  const uniquePoolAddresses = useMemo(
    () => [...new Set(poolKeyToAddress.values())],
    [poolKeyToAddress],
  );

  const slot0Contracts = useMemo(
    () =>
      uniquePoolAddresses.map((addr) => ({
        address: addr,
        abi: UniswapV3PoolABI,
        functionName: "slot0" as const,
      })),
    [uniquePoolAddresses],
  );

  const { data: slot0Results, isLoading: isSlot0Loading } = useReadContracts({
    contracts: slot0Contracts,
    query: { enabled: uniquePoolAddresses.length > 0, refetchInterval: 30_000 },
  });

  const poolToTick = useMemo(() => {
    const map = new Map<string, number>();
    if (!slot0Results) return map;
    slot0Results.forEach((r, i) => {
      if (r.status === "success" && r.result) {
        const result = r.result as readonly [bigint, number, ...unknown[]];
        map.set(uniquePoolAddresses[i].toLowerCase(), Number(result[1]));
      }
    });
    return map;
  }, [slot0Results, uniquePoolAddresses]);

  // Phase 6: Oracle prices for unique tokens
  const uniqueTokens = useMemo(() => {
    const set = new Set<string>();
    rawPositions.forEach((p) => {
      set.add(p.token0.toLowerCase());
      set.add(p.token1.toLowerCase());
    });
    return [...set];
  }, [rawPositions]);

  const oracleContracts = useMemo(
    () =>
      uniqueTokens
        .filter((t) => TOKEN_ORACLE_MAP[t])
        .map((t) => ({
          address: TOKEN_ORACLE_MAP[t],
          abi: MockOracleABI,
          functionName: "price" as const,
          _token: t,
        })),
    [uniqueTokens],
  );

  const { data: oracleResults, isLoading: isOracleLoading } = useReadContracts({
    contracts: oracleContracts.map(({ _token, ...c }) => c),
    query: { enabled: oracleContracts.length > 0 },
  });

  const tokenPriceUsd = useMemo(() => {
    const map = new Map<string, number>();
    // Oracle prices
    if (oracleResults) {
      oracleResults.forEach((r, i) => {
        if (r.status === "success" && r.result) {
          map.set(
            oracleContracts[i]._token,
            Number(r.result as bigint) / ORACLE_SCALE,
          );
        }
      });
    }
    // Fallback for tokens without oracle
    uniqueTokens.forEach((t) => {
      if (!map.has(t)) {
        const info = TOKEN_INFO[t] ?? TOKEN_INFO[Object.keys(TOKENS).find((k) => (TOKENS as Record<string, string>)[k]?.toLowerCase() === t) ? (TOKENS as Record<string, string>)[Object.keys(TOKENS).find((k) => (TOKENS as Record<string, string>)[k]?.toLowerCase() === t)!] : ""];
        map.set(t, info?.mockPriceUsd ?? 0);
      }
    });
    return map;
  }, [oracleResults, oracleContracts, uniqueTokens]);

  // ── Assemble final positions ──
  const positions: UserPosition[] = useMemo(() => {
    return rawPositions.map((p) => {
      const poolKey = `${p.token0}-${p.token1}-${p.fee}`;
      const poolAddr = poolKeyToAddress.get(poolKey);
      const currentTick = poolAddr
        ? poolToTick.get(poolAddr.toLowerCase()) ?? 0
        : 0;

      const info0 = TOKEN_INFO[p.token0.toLowerCase()] ?? TOKEN_INFO[p.token0];
      const info1 = TOKEN_INFO[p.token1.toLowerCase()] ?? TOKEN_INFO[p.token1];
      const decimals0 = info0?.decimals ?? 18;
      const decimals1 = info1?.decimals ?? 18;

      const { amount0, amount1 } = getPositionAmounts(
        p.liquidity,
        p.tickLower,
        p.tickUpper,
        currentTick,
        decimals0,
        decimals1,
      );

      const price0 = tokenPriceUsd.get(p.token0.toLowerCase()) ?? 0;
      const price1 = tokenPriceUsd.get(p.token1.toLowerCase()) ?? 0;

      const tokensOwed0Human = Number(p.tokensOwed0) / 10 ** decimals0;
      const tokensOwed1Human = Number(p.tokensOwed1) / 10 ** decimals1;

      return {
        ...p,
        currentTick,
        isInRange: p.tickLower <= currentTick && currentTick < p.tickUpper,
        amount0,
        amount1,
        valueUsd: amount0 * price0 + amount1 * price1,
        feesUsd: tokensOwed0Human * price0 + tokensOwed1Human * price1,
        token0Symbol: info0?.symbol ?? "???",
        token1Symbol: info1?.symbol ?? "???",
      };
    });
  }, [rawPositions, poolKeyToAddress, poolToTick, tokenPriceUsd]);

  const totalValueUsd = positions.reduce((s, p) => s + p.valueUsd, 0);
  const totalFeesUsd = positions.reduce((s, p) => s + p.feesUsd, 0);

  const isLoading =
    isBalanceLoading ||
    isTokenIdsLoading ||
    isPositionsLoading ||
    isPoolsLoading ||
    isSlot0Loading ||
    isOracleLoading;

  return { positions, totalValueUsd, totalFeesUsd, positionCount, isLoading };
}
