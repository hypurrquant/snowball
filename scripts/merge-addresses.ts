import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const deploymentsDir = resolve(__dirname, "../deployments/creditcoin-testnet");

function loadJson(filename: string) {
  return JSON.parse(readFileSync(resolve(deploymentsDir, filename), "utf-8"));
}

const liquity = loadJson("liquity.json");
const erc8004 = loadJson("erc8004.json");
const algebra = loadJson("algebra.json");
const morpho = loadJson("morpho.json");

const unified = {
  network: liquity.network,
  liquity: {
    tokens: liquity.tokens,
    branches: liquity.branches,
    shared: liquity.shared,
  },
  erc8004: erc8004.erc8004,
  algebra: {
    core: algebra.core,
    mockTokens: algebra.mockTokens,
    pools: algebra.pools,
  },
  morpho: {
    core: morpho.core,
    tokens: morpho.tokens,
    vaults: morpho.vaults,
    oracles: morpho.oracles,
    markets: morpho.markets,
  },
};

const outputPath = resolve(deploymentsDir, "unified.json");
writeFileSync(outputPath, JSON.stringify(unified, null, 2) + "\n");
console.log(`Wrote unified addresses to ${outputPath}`);
