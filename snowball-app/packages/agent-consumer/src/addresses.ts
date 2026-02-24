import * as fs from "fs";
import * as path from "path";
import type { DeployedAddresses } from "@snowball/shared";
import { logger } from "./logger";

let cachedAddresses: DeployedAddresses | null = null;

export function getAddresses(): DeployedAddresses {
  if (cachedAddresses) return cachedAddresses;

  const possiblePaths = [
    // Primary: env var pointing to snowball repo's unified.json
    process.env.DEPLOYED_ADDRESSES_PATH,
    // Fallback: local config (copied from snowball at build time)
    path.join(__dirname, "../config/addresses.json"),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      const data = fs.readFileSync(p, "utf8");
      cachedAddresses = JSON.parse(data);
      logger.info({ path: p }, "Loaded addresses");
      return cachedAddresses!;
    } catch {
      // Try next
    }
  }

  throw new Error("No deployed addresses found. Set DEPLOYED_ADDRESSES_PATH or place addresses.json in config/.");
}

export function reloadAddresses(): void {
  cachedAddresses = null;
  getAddresses();
}
