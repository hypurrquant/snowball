import { ethers } from "ethers";
import {
  DEPLOYER_PRIVATE_KEY,
  SEPOLIA_RPC,
  USC_RPC,
  START_BLOCK,
  POLL_INTERVAL_MS,
  MAX_RETRY,
} from "./config.mjs";
import { pollBridgeBurns } from "./poller.mjs";
import { waitForAttestation } from "./attestation.mjs";
import { generateProof } from "./proof.mjs";
import { submitBridgeMint } from "./bridge.mjs";

function log(module, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${module}] ${msg}`);
}

async function main() {
  if (!DEPLOYER_PRIVATE_KEY) {
    console.error("DEPLOYER_PRIVATE_KEY is required. See .env.example");
    process.exit(1);
  }

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const uscProvider = new ethers.JsonRpcProvider(USC_RPC, undefined, { staticNetwork: true });
  const uscWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, uscProvider);

  let lastProcessedBlock = START_BLOCK;
  const retryCount = new Map(); // blockNumber → retry count

  log("worker", `Worker started. Scanning from block ${lastProcessedBlock}`);
  log("worker", `Operator: ${uscWallet.address}`);
  log("worker", `Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  while (true) {
    try {
      const latestBlock = await sepoliaProvider.getBlockNumber();

      if (lastProcessedBlock >= latestBlock) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Cap range to avoid huge getLogs calls
      const toBlock = Math.min(lastProcessedBlock + 10000, latestBlock);

      log("worker", `Polling blocks ${lastProcessedBlock}..${toBlock} (latest: ${latestBlock})`);

      const events = await pollBridgeBurns(sepoliaProvider, lastProcessedBlock, toBlock, log);

      if (events.length === 0) {
        lastProcessedBlock = toBlock + 1;
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Group events by blockNumber for per-block processing
      const blockMap = new Map();
      for (const event of events) {
        if (!blockMap.has(event.blockNumber)) {
          blockMap.set(event.blockNumber, []);
        }
        blockMap.get(event.blockNumber).push(event);
      }

      // Process blocks in order
      const sortedBlocks = [...blockMap.keys()].sort((a, b) => a - b);

      let stoppedAtBlock = null;

      for (const blockNum of sortedBlocks) {
        const blockEvents = blockMap.get(blockNum);
        let blockSuccess = true;

        for (const event of blockEvents) {
          try {
            await waitForAttestation(uscProvider, event.blockNumber, log);
            const proof = await generateProof(event.txHash, log);
            await submitBridgeMint(uscWallet, proof, event.burnFrom, event.burnAmount, log);
          } catch (err) {
            log("worker", `Failed to process event ${event.txHash}: ${err.message}`);
            blockSuccess = false;
          }
        }

        if (blockSuccess) {
          // This block fully processed — advance past it
          lastProcessedBlock = blockNum + 1;
          retryCount.delete(blockNum);
        } else {
          // Block failed — check retry count
          const count = (retryCount.get(blockNum) || 0) + 1;
          retryCount.set(blockNum, count);

          if (count >= MAX_RETRY) {
            log("worker", `WARNING: Block ${blockNum} failed ${MAX_RETRY} times. Skipping.`);
            log("worker", `RECOVERY: Restart worker with START_BLOCK=${blockNum} to retry.`);
            lastProcessedBlock = blockNum + 1;
            retryCount.delete(blockNum);
          } else {
            log("worker", `Retry ${count}/${MAX_RETRY} for block ${blockNum}`);
            stoppedAtBlock = blockNum;
            break; // Stop processing subsequent blocks
          }
        }
      }

      // If no block stopped us, advance past the entire range
      if (stoppedAtBlock === null) {
        lastProcessedBlock = toBlock + 1;
      }
    } catch (err) {
      log("worker", `Poll loop error: ${err.message}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
