import * as fs from "fs";
import * as path from "path";
import type { DeployedAddresses } from "@snowball/shared";
import { logger } from "./logger";

let cachedAddresses: DeployedAddresses | null = null;

export function getAddresses(): DeployedAddresses {
  if (cachedAddresses) return cachedAddresses;

  const possiblePaths = [
    process.env.DEPLOYED_ADDRESSES_PATH,
    path.join(__dirname, "../../../deployments/addresses.json"),
    path.join(__dirname, "../../contracts-liquity/deployments/addresses-102031.json"),
    path.join(__dirname, "../../contracts-liquity/deployments/addresses-31337.json"),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      const data = fs.readFileSync(p, "utf8");
      cachedAddresses = JSON.parse(data);

      // If erc8004 not already in the file, try loading separately
      if (!cachedAddresses!.erc8004) {
        const erc8004Paths = [
          path.join(path.dirname(p), "erc8004-102031.json"),
          path.join(path.dirname(p), "..", "contracts-8004", "deployments", `erc8004-${cachedAddresses!.network.chainId}.json`),
          path.join(__dirname, "../../contracts-8004/deployments", `erc8004-${cachedAddresses!.network.chainId}.json`),
        ];
        for (const ep of erc8004Paths) {
          try {
            const erc8004Data = JSON.parse(fs.readFileSync(ep, "utf8"));
            cachedAddresses!.erc8004 = erc8004Data;
            break;
          } catch { /* try next */ }
        }
      }

      logger.info({ path: p }, "Loaded addresses");
      if (cachedAddresses!.erc8004) logger.info("ERC-8004 addresses loaded");
      return cachedAddresses!;
    } catch {
      // Try next
    }
  }

  throw new Error("No deployed addresses found. Deploy contracts first.");
}

export function reloadAddresses(): void {
  cachedAddresses = null;
  getAddresses();
}
