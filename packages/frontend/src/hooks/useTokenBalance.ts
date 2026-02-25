"use client";

import { useReadContract, useBalance } from "wagmi";
import { erc20Abi, type Address } from "viem";

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

    if (!token) return native;

    return {
        ...erc20,
        data: erc20.data !== undefined ? { value: erc20.data as bigint, decimals: 18, symbol: "ERC20" } : undefined,
    };
}
