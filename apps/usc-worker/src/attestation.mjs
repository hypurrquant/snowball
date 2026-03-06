import { ethers } from "ethers";
import {
  CHAIN_INFO,
  CHAIN_INFO_ABI,
  SEPOLIA_CHAIN_KEY,
  ATTESTATION_TIMEOUT_MS,
} from "./config.mjs";

/**
 * Wait until USC attestation height >= targetHeight (burnBlock + 1).
 */
export async function waitForAttestation(uscProvider, burnBlockNumber, log) {
  const targetHeight = burnBlockNumber + 1;
  const chainInfo = new ethers.Contract(CHAIN_INFO, CHAIN_INFO_ABI, uscProvider);
  const startTime = Date.now();

  while (true) {
    const result = await chainInfo.get_latest_attestation_height_and_hash(SEPOLIA_CHAIN_KEY);
    const attested = Number(result[0]);

    if (attested >= targetHeight) {
      log("attestation", `Block ${burnBlockNumber} is attested (latest: ${attested})`);
      return;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log("attestation", `Waiting for attestation: attested=${attested} need=${targetHeight} (${elapsed}s elapsed)`);

    if (Date.now() - startTime > ATTESTATION_TIMEOUT_MS) {
      throw new Error(`Attestation timeout after ${ATTESTATION_TIMEOUT_MS / 1000}s for block ${burnBlockNumber}`);
    }

    await new Promise((r) => setTimeout(r, 15_000));
  }
}
