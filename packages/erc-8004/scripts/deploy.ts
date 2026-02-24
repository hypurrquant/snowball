const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ERC-8004 contracts with:", deployer.address);

  // 1. Identity Registry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  console.log("IdentityRegistry:", await identityRegistry.getAddress());

  // 2. Reputation Registry
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(await identityRegistry.getAddress());
  await reputationRegistry.waitForDeployment();
  console.log("ReputationRegistry:", await reputationRegistry.getAddress());

  // 3. Validation Registry
  const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
  const validationRegistry = await ValidationRegistry.deploy(await identityRegistry.getAddress());
  await validationRegistry.waitForDeployment();
  console.log("ValidationRegistry:", await validationRegistry.getAddress());

  // 4. Register initial agents
  console.log("\n=== Registering Agents ===");

  const tx1 = await identityRegistry.registerAgent(
    "Snowball CDP Provider",
    "cdp-provider",
    deployer.address,
    "data:application/json;base64," + Buffer.from(JSON.stringify({
      name: "Snowball CDP Provider",
      description: "Manages CDP operations: open, adjust, close troves and stability pool deposits",
      version: "1.0.0",
      capabilities: ["trove-management", "stability-pool", "liquidation-protection"]
    })).toString("base64")
  );
  await tx1.wait();
  console.log("CDP Provider Agent registered (ID: 1)");

  const tx2 = await identityRegistry.registerAgent(
    "Snowball Consumer Agent",
    "consumer",
    deployer.address,
    "data:application/json;base64," + Buffer.from(JSON.stringify({
      name: "Snowball Consumer Agent",
      description: "User-facing agent that coordinates strategies and manages positions",
      version: "1.0.0",
      capabilities: ["strategy-recommendation", "position-monitoring", "auto-rebalance"]
    })).toString("base64")
  );
  await tx2.wait();
  console.log("Consumer Agent registered (ID: 2)");

  // 5. Validate agents
  await validationRegistry.validateAgent(1, 365 * 24 * 60 * 60, ""); // 1 year
  await validationRegistry.validateAgent(2, 365 * 24 * 60 * 60, "");
  console.log("Both agents validated");

  // Save addresses
  const network = await ethers.provider.getNetwork();
  const addresses = {
    identityRegistry: await identityRegistry.getAddress(),
    reputationRegistry: await reputationRegistry.getAddress(),
    validationRegistry: await validationRegistry.getAddress(),
  };

  const outputPath = path.join(__dirname, "..", "deployments", `erc8004-${Number(network.chainId)}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\n✅ ERC-8004 addresses saved to:", outputPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
