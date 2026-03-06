import type { Address } from "viem";
import type { AgentConfig } from "./types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AgentConfig {
  return {
    chainId: 102031,
    rpcUrl: process.env.RPC_URL || "https://rpc.cc3-testnet.creditcoin.network",
    agentVault: "0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40" as Address,
    agentPrivateKey: requireEnv("AGENT_PRIVATE_KEY") as `0x${string}`,

    morpho: {
      core: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
      marketId: "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261" as `0x${string}`,
      loanToken: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,   // sbUSD
      collateralToken: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address, // wCTC
      oracle: "0x42ca12a83c14e95f567afc940b0118166d8bd852" as Address,
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
      lltv: 770000000000000000n,
    },

    liquity: {
      borrowerOperations: "0xe8285b406dc77d16c193e6a1a2b8ecc1f386602c" as Address,
      troveManager: "0x30ef6615f01be4c9fea06c33b07432b40cab7bdc" as Address,
      sortedTroves: "0x749f4111b67b7f770d2e43187d6433b470c2b3ad" as Address,
      hintHelpers: "0x7e8fa8852b0c1d697905fd7594d30afe693c76bb" as Address,
      collToken: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address,   // wCTC
    },
  };
}

export function loadAnthropicApiKey(): string {
  return requireEnv("ANTHROPIC_API_KEY");
}

export function loadApiKey(): string {
  return requireEnv("API_KEY");
}
