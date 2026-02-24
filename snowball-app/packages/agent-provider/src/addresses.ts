import * as fs from "fs";
import * as path from "path";
import type { DeployedAddresses } from "@snowball/shared";

let cachedAddresses: DeployedAddresses | null = null;

export function getAddresses(): DeployedAddresses {
  if (cachedAddresses) return cachedAddresses;

  // Try loading from deployed addresses file
  const possiblePaths = [
    path.join(__dirname, "../../contracts-liquity/deployments/addresses-102031.json"),
    path.join(__dirname, "../../contracts-liquity/deployments/addresses-31337.json"),
    path.join(__dirname, "../../../deployments/addresses.json"),
  ];

  // Also check env var
  if (process.env.DEPLOYED_ADDRESSES_PATH) {
    possiblePaths.unshift(process.env.DEPLOYED_ADDRESSES_PATH);
  }

  for (const p of possiblePaths) {
    try {
      const data = fs.readFileSync(p, "utf8");
      cachedAddresses = JSON.parse(data);
      console.log(`Loaded addresses from: ${p}`);
      return cachedAddresses!;
    } catch {
      // Try next path
    }
  }

  // Fallback: placeholder addresses for development
  console.warn("No deployed addresses found, using placeholders");
  cachedAddresses = {
    network: {
      name: "localhost",
      chainId: 31337,
      rpc: "http://127.0.0.1:8545",
      explorer: "",
    },
    tokens: {
      wCTC: "0x0000000000000000000000000000000000000001",
      lstCTC: "0x0000000000000000000000000000000000000002",
      sbUSD: "0x0000000000000000000000000000000000000003",
    },
    branches: {
      wCTC: {
        addressesRegistry: "0x0000000000000000000000000000000000000010",
        borrowerOperations: "0x0000000000000000000000000000000000000011",
        troveManager: "0x0000000000000000000000000000000000000012",
        stabilityPool: "0x0000000000000000000000000000000000000013",
        activePool: "0x0000000000000000000000000000000000000014",
        defaultPool: "0x0000000000000000000000000000000000000015",
        gasPool: "0x0000000000000000000000000000000000000016",
        collSurplusPool: "0x0000000000000000000000000000000000000017",
        sortedTroves: "0x0000000000000000000000000000000000000018",
        troveNFT: "0x0000000000000000000000000000000000000019",
        priceFeed: "0x000000000000000000000000000000000000001a",
      },
      lstCTC: {
        addressesRegistry: "0x0000000000000000000000000000000000000020",
        borrowerOperations: "0x0000000000000000000000000000000000000021",
        troveManager: "0x0000000000000000000000000000000000000022",
        stabilityPool: "0x0000000000000000000000000000000000000023",
        activePool: "0x0000000000000000000000000000000000000024",
        defaultPool: "0x0000000000000000000000000000000000000025",
        gasPool: "0x0000000000000000000000000000000000000026",
        collSurplusPool: "0x0000000000000000000000000000000000000027",
        sortedTroves: "0x0000000000000000000000000000000000000028",
        troveNFT: "0x0000000000000000000000000000000000000029",
        priceFeed: "0x000000000000000000000000000000000000002a",
      },
    },
    shared: {
      collateralRegistry: "0x0000000000000000000000000000000000000030",
      hintHelpers: "0x0000000000000000000000000000000000000031",
      multiTroveGetter: "0x0000000000000000000000000000000000000032",
    },
  };

  return cachedAddresses!;
}
