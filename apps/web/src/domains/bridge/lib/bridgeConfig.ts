import { createPublicClient, http, type Address } from "viem";
import { creditcoinTestnet, sepoliaChain, uscTestnet } from "@/core/config/chain";
import { BRIDGE, TOKENS } from "@/core/config/addresses";
import { bridgeVaultAbi, dnTokenAbi } from "@/core/abis";
import { erc20Abi } from "viem";

// Independent public clients for each chain (bridge-specific, not wagmi-managed)
export const ccClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
});

export const sepoliaClient = createPublicClient({
  chain: sepoliaChain,
  transport: http("https://1rpc.io/sepolia"),
});

export const uscClient = createPublicClient({
  chain: uscTestnet,
  transport: http("https://rpc.usc-testnet2.creditcoin.network"),
});

// Contract configs
export const bridgeContracts = {
  vault: {
    address: BRIDGE.bridgeVault as Address,
    abi: bridgeVaultAbi,
    chainId: creditcoinTestnet.id,
  },
  dnToken: {
    address: BRIDGE.sepoliaDNToken as Address,
    abi: dnTokenAbi,
    chainId: sepoliaChain.id,
  },
  usdc: {
    address: TOKENS.USDC as Address,
    abi: erc20Abi,
    chainId: creditcoinTestnet.id,
  },
} as const;

// Destination chain key used in BridgeVault.deposit and DNToken.bridgeBurn
export const USC_CHAIN_KEY = 1n;
