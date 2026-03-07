/**
 * Pre-flight check: 테스트 전 잔액/가스/연결 상태 확인
 *
 * Usage: DEPLOYER_PRIVATE_KEY=0x... node scripts/preflight.mjs
 */
import { ethers } from "ethers";

const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
const USC_RPC = process.env.USC_RPC || "https://rpc.usc-testnet2.creditcoin.network";
const DN_TOKEN_SEPOLIA = "0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380";
const DN_BRIDGE_USC = "0x23E741a87ad9567Dff27eb34FaABa1444154D458";
const CHAIN_INFO = "0x0000000000000000000000000000000000000fd3";

const dnTokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];
const bridgeAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function totalBridgeMinted() view returns (uint256)",
];
const chainInfoAbi = [
  "function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)",
];

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("❌ DEPLOYER_PRIVATE_KEY not set");
    process.exit(1);
  }

  console.log("=== Pre-flight Check ===\n");

  // 1. Sepolia
  console.log("--- Sepolia ---");
  const sepolia = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const sepoliaWallet = new ethers.Wallet(pk, sepolia);
  const addr = sepoliaWallet.address;
  console.log(`Address: ${addr}`);

  const sepoliaBlock = await sepolia.getBlockNumber();
  console.log(`Latest block: ${sepoliaBlock}`);

  const sepoliaEth = await sepolia.getBalance(addr);
  console.log(`ETH balance: ${ethers.formatEther(sepoliaEth)} ETH`);

  const dnToken = new ethers.Contract(DN_TOKEN_SEPOLIA, dnTokenAbi, sepolia);
  const dnBalance = await dnToken.balanceOf(addr);
  const dnSupply = await dnToken.totalSupply();
  console.log(`DN balance: ${ethers.formatEther(dnBalance)} DN`);
  console.log(`DN total supply: ${ethers.formatEther(dnSupply)} DN`);

  // 2. USC Testnet
  console.log("\n--- USC Testnet ---");
  const usc = new ethers.JsonRpcProvider(USC_RPC, undefined, { staticNetwork: true });
  const uscBalance = await usc.getBalance(addr);
  console.log(`CTC balance: ${ethers.formatEther(uscBalance)} CTC`);

  const bridge = new ethers.Contract(DN_BRIDGE_USC, bridgeAbi, usc);
  const bridgeDn = await bridge.balanceOf(addr);
  const totalMinted = await bridge.totalBridgeMinted();
  console.log(`DN on USC (bridge): ${ethers.formatEther(bridgeDn)} DN`);
  console.log(`Total bridge minted: ${ethers.formatEther(totalMinted)} DN`);

  // 3. Attestation status
  console.log("\n--- Attestation ---");
  const chainInfo = new ethers.Contract(CHAIN_INFO, chainInfoAbi, usc);
  const att = await chainInfo.get_latest_attestation_height_and_hash(1);
  const attestedHeight = Number(att[0]);
  const gap = sepoliaBlock - attestedHeight;
  console.log(`Latest attested Sepolia block: ${attestedHeight}`);
  console.log(`Gap from latest: ${gap} blocks (~${Math.round(gap * 12 / 60)}min)`);

  // 4. Verdict
  console.log("\n=== Verdict ===");
  const checks = [];
  if (sepoliaEth === 0n) checks.push("❌ No Sepolia ETH (need gas for bridgeBurn)");
  else checks.push("✅ Sepolia ETH OK");

  if (dnBalance === 0n) checks.push("❌ No DN tokens (need tokens to burn)");
  else checks.push("✅ DN balance OK");

  if (uscBalance === 0n) checks.push("❌ No USC CTC (need gas for processBridgeMint)");
  else checks.push("✅ USC CTC OK");

  checks.forEach((c) => console.log(c));

  if (checks.some((c) => c.startsWith("❌"))) {
    console.log("\n⚠️  Fix the issues above before testing.");
  } else {
    console.log(`\n🚀 Ready to test! Run worker with:`);
    console.log(`   START_BLOCK=${sepoliaBlock} DEPLOYER_PRIVATE_KEY=... node src/index.mjs`);
    console.log(`   Then in another terminal:`);
    console.log(`   DEPLOYER_PRIVATE_KEY=... node scripts/burn.mjs`);
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
