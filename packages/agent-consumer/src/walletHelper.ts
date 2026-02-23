import {
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { creditcoinTestnet } from "@snowball/shared";

let _walletClient: ReturnType<typeof createWalletClient> | null = null;
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

export function getClients() {
  if (!_walletClient) {
    const pk = process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error("No admin private key configured");
    const account = privateKeyToAccount(pk as `0x${string}`);
    _walletClient = createWalletClient({
      account,
      chain: creditcoinTestnet,
      transport: http(),
    });
    _publicClient = createPublicClient({
      chain: creditcoinTestnet,
      transport: http(),
    });
  }
  return { walletClient: _walletClient!, publicClient: _publicClient! };
}
