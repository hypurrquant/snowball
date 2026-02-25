import { Address } from "viem";

export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
    return tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
}
