import { ethers } from "ethers";
import { DN_BRIDGE_USC, DN_BRIDGE_ABI } from "./config.mjs";

/**
 * Submit bridge mint to DNBridgeUSC on USC Testnet.
 * Handles "already processed" reverts gracefully.
 */
export async function submitBridgeMint(uscWallet, proof, recipient, amount, log) {
  const bridge = new ethers.Contract(DN_BRIDGE_USC, DN_BRIDGE_ABI, uscWallet);

  try {
    const tx = await bridge.processBridgeMint(
      proof.headerNumber,
      proof.txBytes,
      {
        root: proof.merkleProof.root,
        siblings: proof.merkleProof.siblings.map((s) => ({
          hash: s.hash,
          isLeft: s.isLeft,
        })),
      },
      {
        lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
        roots: proof.continuityProof.roots,
      },
      recipient,
      amount
    );

    log("bridge", `Mint TX submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    log("bridge", `Mint confirmed at block ${receipt.blockNumber}. Recipient: ${recipient} Amount: ${ethers.formatEther(amount)} DN`);
  } catch (err) {
    if (err.message && err.message.includes("already processed")) {
      log("bridge", `Already processed, skipping: recipient=${recipient} amount=${ethers.formatEther(amount)}`);
      return; // Success — on-chain dedup worked
    }
    throw err; // Re-throw other errors
  }
}
