"use client";

import { useAccount } from "wagmi";
import { getChainConfig, DEFAULT_CHAIN_ID } from "@snowball/core/src/config/addresses";

export function useChainAddresses() {
  const { chainId } = useAccount();
  const config = getChainConfig(chainId ?? DEFAULT_CHAIN_ID);
  return config;
}

export function useChainTokenInfo() {
  const config = useChainAddresses();
  return config.tokenInfo;
}
