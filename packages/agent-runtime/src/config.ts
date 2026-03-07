import type { Address } from "viem";
import type { AgentConfig } from "./types";

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
    agentVault: "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address,
    agentPrivateKey: requireEnv("AGENT_PRIVATE_KEY") as `0x${string}`,

    morpho: {
      core: "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address,
      marketId: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,   // sbUSD
      collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address, // wCTC
      oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
      irm: "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address,
      lltv: 770000000000000000n,
    },

    liquityBranches: {
      wCTC: {
        borrowerOperations: "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address,
        troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
        troveNFT: "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address,
        sortedTroves: "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address,
        hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
        collToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,   // wCTC
        activePool: "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address,
      },
      lstCTC: {
        borrowerOperations: "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca" as Address,
        troveManager: "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address,
        troveNFT: "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8" as Address,
        sortedTroves: "0x25aa78c7b0dbc736ae23a316ab44579467ba9507" as Address,
        hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
        collToken: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,   // lstCTC
        activePool: "0xa57cca34198bf262a278da3b2b7a8a5f032cb835" as Address,
      },
    },
  };
}

export function loadAnthropicApiKey(): string {
  return requireEnv("ANTHROPIC_API_KEY");
}

export function loadApiKey(): string {
  return requireEnv("API_KEY");
}
