import { ethers } from "ethers";
import { DN_TOKEN_SEPOLIA, DN_TOKEN_ABI } from "./config.mjs";

const BURN_ADDRESS = "0x0000000000000000000000000000000000000001";

const iface = new ethers.Interface(DN_TOKEN_ABI);
const BRIDGE_BURN_TOPIC = iface.getEvent("BridgeBurn").topicHash;
const TRANSFER_TOPIC = iface.getEvent("Transfer").topicHash;

/**
 * Poll Sepolia for BridgeBurn events in [fromBlock, toBlock].
 * Returns array of validated burn events.
 */
export async function pollBridgeBurns(sepoliaProvider, fromBlock, toBlock, log) {
  const logs = await sepoliaProvider.getLogs({
    address: DN_TOKEN_SEPOLIA,
    topics: [BRIDGE_BURN_TOPIC],
    fromBlock,
    toBlock,
  });

  if (logs.length === 0) return [];

  const events = [];

  for (const rawLog of logs) {
    const parsed = iface.parseLog({ topics: rawLog.topics, data: rawLog.data });
    const burnFrom = parsed.args.from;
    const burnAmount = parsed.args.amount;
    const txHash = rawLog.transactionHash;
    const blockNumber = rawLog.blockNumber;

    log("poller", `BridgeBurn detected: from=${burnFrom} amount=${ethers.formatEther(burnAmount)} txHash=${txHash} block=${blockNumber}`);

    // Cross-validation: check Transfer(from, address(1), amount) in same TX
    const valid = await crossValidate(sepoliaProvider, txHash, burnFrom, burnAmount, log);
    if (!valid) continue;

    events.push({ burnFrom, burnAmount, txHash, blockNumber });
  }

  return events;
}

/**
 * Cross-validate BridgeBurn against Transfer(to=address(1)) in same TX.
 * Checks from, amount, to==address(1) all match.
 */
async function crossValidate(provider, txHash, expectedFrom, expectedAmount, log) {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    log("poller", `Cross-validation failed: receipt not found for ${txHash}`);
    return false;
  }

  for (const rawLog of receipt.logs) {
    if (rawLog.address.toLowerCase() !== DN_TOKEN_SEPOLIA.toLowerCase()) continue;
    if (rawLog.topics[0] !== TRANSFER_TOPIC) continue;

    const parsed = iface.parseLog({ topics: rawLog.topics, data: rawLog.data });
    const transferFrom = parsed.args.from;
    const transferTo = parsed.args.to;
    const transferAmount = parsed.args.value;

    if (
      transferTo.toLowerCase() === BURN_ADDRESS.toLowerCase() &&
      transferFrom.toLowerCase() === expectedFrom.toLowerCase() &&
      transferAmount === expectedAmount
    ) {
      log("poller", `Cross-validation passed: from=${transferFrom} to=${transferTo} amount=${ethers.formatEther(transferAmount)}`);
      return true;
    }
  }

  log("poller", `Cross-validation failed: no matching Transfer(to=address(1)) found in tx ${txHash}`);
  return false;
}
