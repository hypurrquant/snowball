import { PROOF_API, SEPOLIA_CHAIN_KEY, PROOF_MAX_RETRIES } from "./config.mjs";

/**
 * Generate proof via Proof Generation API with exponential backoff retry.
 */
export async function generateProof(txHash, log) {
  const url = `${PROOF_API}/api/v1/proof-by-tx/${SEPOLIA_CHAIN_KEY}/${txHash}`;

  for (let attempt = 1; attempt <= PROOF_MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const data = await resp.json();

      if (data.code) {
        throw new Error(`Proof API error: ${data.code} - ${data.message}`);
      }

      log("proof", `Proof generated: merkle siblings=${data.merkleProof.siblings.length} continuity roots=${data.continuityProof.roots.length}`);
      return data;
    } catch (err) {
      log("proof", `Proof attempt ${attempt}/${PROOF_MAX_RETRIES} failed: ${err.message}`);

      if (attempt === PROOF_MAX_RETRIES) {
        throw new Error(`Proof generation failed after ${PROOF_MAX_RETRIES} attempts for ${txHash}`);
      }

      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
