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
    agentVault: "0x7d3f7e6bde481e3260f5bebfcd9490315d99e3ed" as Address,
    agentPrivateKey: requireEnv("AGENT_PRIVATE_KEY") as `0x${string}`,

    morpho: {
      core: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
      marketId: "0x8dce00fbd59450e4d2f46e9aa637690fc21c058c4c8abf4dea75e9ab2ce38364" as `0x${string}`,
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,   // sbUSD
      collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address, // wCTC
      oracle: "0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2" as Address,
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
      lltv: 770000000000000000n,
    },

    liquity: {
      borrowerOperations: "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address,
      troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
      troveNFT: "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address,
      sortedTroves: "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address,
      hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
      collToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,   // wCTC
    },
  };
}

export function loadAnthropicApiKey(): string {
  return requireEnv("ANTHROPIC_API_KEY");
}

export function loadApiKey(): string {
  return requireEnv("API_KEY");
}
