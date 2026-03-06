"use client";

import { useReadContract, useBalance } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { TOKEN_INFO } from "@/core/config/addresses";

export function useTokenBalance({ address, token }: { address?: Address; token?: Address }) {
    const native = useBalance({
        address,
        query: { enabled: !token && !!address }
    });

    const erc20 = useReadContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!token && !!address }
    });

    if (!token) return { ...native, refetch: native.refetch };

    const info = token ? TOKEN_INFO[token] : undefined;

    return {
        ...erc20,
        data: erc20.data !== undefined
            ? { value: erc20.data as bigint, decimals: info?.decimals ?? 18, symbol: info?.symbol ?? "ERC20" }
            : undefined,
        refetch: erc20.refetch,
    };
}
