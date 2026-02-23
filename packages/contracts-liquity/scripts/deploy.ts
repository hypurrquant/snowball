const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

interface DeployedAddresses {
  network: {
    name: string;
    chainId: number;
    rpc: string;
    explorer: string;
  };
  tokens: {
    wCTC: string;
    lstCTC: string;
    sbUSD: string;
  };
  branches: {
    wCTC: BranchAddresses;
    lstCTC: BranchAddresses;
  };
  shared: {
    collateralRegistry: string;
    hintHelpers: string;
    multiTroveGetter: string;
  };
}

interface BranchAddresses {
  addressesRegistry: string;
  borrowerOperations: string;
  troveManager: string;
  stabilityPool: string;
  activePool: string;
  defaultPool: string;
  gasPool: string;
  collSurplusPool: string;
  sortedTroves: string;
  troveNFT: string;
  priceFeed: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // ==================== 1. Mock Tokens & Oracles ====================
  console.log("\n=== Phase 1: Mock Tokens & Oracles ===");

  const MockWCTC = await ethers.getContractFactory("MockWCTC");
  const wCTC = await MockWCTC.deploy();
  await wCTC.waitForDeployment();
  console.log("MockWCTC:", await wCTC.getAddress());

  const MockLstCTC = await ethers.getContractFactory("MockLstCTC");
  const lstCTC = await MockLstCTC.deploy();
  await lstCTC.waitForDeployment();
  console.log("MockLstCTC:", await lstCTC.getAddress());

  // Price feeds: $0.20 per CTC (200000000000000000 = 0.2e18)
  const initialPrice = ethers.parseEther("0.2");

  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const priceFeedWCTC = await MockPriceFeed.deploy(initialPrice);
  await priceFeedWCTC.waitForDeployment();
  console.log("PriceFeed (wCTC):", await priceFeedWCTC.getAddress());

  const priceFeedLstCTC = await MockPriceFeed.deploy(initialPrice);
  await priceFeedLstCTC.waitForDeployment();
  console.log("PriceFeed (lstCTC):", await priceFeedLstCTC.getAddress());

  // ==================== 2. SbUSD Token ====================
  console.log("\n=== Phase 2: SbUSD Token ===");

  const SbUSDToken = await ethers.getContractFactory("SbUSDToken");
  const sbUSD = await SbUSDToken.deploy();
  await sbUSD.waitForDeployment();
  console.log("SbUSDToken:", await sbUSD.getAddress());

  // ==================== 3. Deploy Branch 0 (wCTC) ====================
  console.log("\n=== Phase 3: Branch 0 (wCTC) — MCR 110%, CCR 150% ===");
  const branch0 = await deployBranch(
    deployer,
    await wCTC.getAddress(),
    await priceFeedWCTC.getAddress(),
    await sbUSD.getAddress(),
    ethers.parseEther("1.1"), // MCR 110%
    ethers.parseEther("1.5"), // CCR 150%
    "wCTC"
  );

  // ==================== 4. Deploy Branch 1 (lstCTC) ====================
  console.log("\n=== Phase 4: Branch 1 (lstCTC) — MCR 120%, CCR 160% ===");
  const branch1 = await deployBranch(
    deployer,
    await lstCTC.getAddress(),
    await priceFeedLstCTC.getAddress(),
    await sbUSD.getAddress(),
    ethers.parseEther("1.2"), // MCR 120%
    ethers.parseEther("1.6"), // CCR 160%
    "lstCTC"
  );

  // ==================== 5. Wire sbUSD to branches ====================
  console.log("\n=== Phase 5: Wire sbUSD ===");

  let wireTx;
  wireTx = await sbUSD.setBranchAddresses(
    branch0.troveManager,
    branch0.stabilityPool,
    branch0.borrowerOperations,
    branch0.activePool
  );
  await wireTx.wait();
  console.log("sbUSD wired to Branch 0");

  wireTx = await sbUSD.setBranchAddresses(
    branch1.troveManager,
    branch1.stabilityPool,
    branch1.borrowerOperations,
    branch1.activePool
  );
  await wireTx.wait();
  console.log("sbUSD wired to Branch 1");

  // ==================== 6. Collateral Registry ====================
  console.log("\n=== Phase 6: Collateral Registry ===");

  const CollateralRegistry = await ethers.getContractFactory("CollateralRegistry");
  const collateralRegistry = await CollateralRegistry.deploy(await sbUSD.getAddress());
  await collateralRegistry.waitForDeployment();
  console.log("CollateralRegistry:", await collateralRegistry.getAddress());

  wireTx = await collateralRegistry.addBranch(
    await wCTC.getAddress(),
    branch0.troveManager,
    branch0.borrowerOperations,
    branch0.stabilityPool,
    branch0.activePool,
    await priceFeedWCTC.getAddress()
  );
  await wireTx.wait();
  console.log("Branch 0 (wCTC) added to registry");

  wireTx = await collateralRegistry.addBranch(
    await lstCTC.getAddress(),
    branch1.troveManager,
    branch1.borrowerOperations,
    branch1.stabilityPool,
    branch1.activePool,
    await priceFeedLstCTC.getAddress()
  );
  await wireTx.wait();
  console.log("Branch 1 (lstCTC) added to registry");

  wireTx = await sbUSD.setCollateralRegistry(await collateralRegistry.getAddress());
  await wireTx.wait();
  console.log("sbUSD CollateralRegistry set");

  // ==================== 7. Helper Contracts ====================
  console.log("\n=== Phase 7: Helpers ===");

  const HintHelpers = await ethers.getContractFactory("HintHelpers");
  const hintHelpers = await HintHelpers.deploy(await collateralRegistry.getAddress());
  await hintHelpers.waitForDeployment();
  console.log("HintHelpers:", await hintHelpers.getAddress());

  const MultiTroveGetter = await ethers.getContractFactory("MultiTroveGetter");
  const multiTroveGetter = await MultiTroveGetter.deploy(await collateralRegistry.getAddress());
  await multiTroveGetter.waitForDeployment();
  console.log("MultiTroveGetter:", await multiTroveGetter.getAddress());

  // ==================== 8. Save Addresses ====================
  const network = await ethers.provider.getNetwork();
  const addresses: DeployedAddresses = {
    network: {
      name: network.chainId === 102031n ? "Creditcoin Testnet" : "localhost",
      chainId: Number(network.chainId),
      rpc: network.chainId === 102031n
        ? "https://rpc.cc3-testnet.creditcoin.network"
        : "http://127.0.0.1:8545",
      explorer: network.chainId === 102031n
        ? "https://creditcoin-testnet.blockscout.com"
        : "",
    },
    tokens: {
      wCTC: await wCTC.getAddress(),
      lstCTC: await lstCTC.getAddress(),
      sbUSD: await sbUSD.getAddress(),
    },
    branches: {
      wCTC: branch0,
      lstCTC: branch1,
    },
    shared: {
      collateralRegistry: await collateralRegistry.getAddress(),
      hintHelpers: await hintHelpers.getAddress(),
      multiTroveGetter: await multiTroveGetter.getAddress(),
    },
  };

  const outputPath = path.join(__dirname, "..", "deployments", `addresses-${Number(network.chainId)}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to:", outputPath);
  console.log(JSON.stringify(addresses, null, 2));
}

async function deployBranch(
  deployer: any,
  collTokenAddr: string,
  priceFeedAddr: string,
  sbUSDAddr: string,
  mcr: bigint,
  ccr: bigint,
  label: string
): Promise<BranchAddresses> {
  // 1. AddressesRegistry
  const AddressesRegistry = await ethers.getContractFactory("AddressesRegistry");
  const addressesRegistry = await AddressesRegistry.deploy(mcr, ccr);
  await addressesRegistry.waitForDeployment();
  const arAddr = await addressesRegistry.getAddress();
  console.log(`  AddressesRegistry (${label}):`, arAddr);

  // 2. Core contracts
  const TroveManager = await ethers.getContractFactory("TroveManager");
  const troveManager = await TroveManager.deploy();
  await troveManager.waitForDeployment();
  console.log(`  TroveManager (${label}):`, await troveManager.getAddress());

  const BorrowerOperations = await ethers.getContractFactory("BorrowerOperations");
  const borrowerOps = await BorrowerOperations.deploy();
  await borrowerOps.waitForDeployment();
  console.log(`  BorrowerOperations (${label}):`, await borrowerOps.getAddress());

  const StabilityPool = await ethers.getContractFactory("StabilityPool");
  const stabilityPool = await StabilityPool.deploy();
  await stabilityPool.waitForDeployment();
  console.log(`  StabilityPool (${label}):`, await stabilityPool.getAddress());

  const ActivePool = await ethers.getContractFactory("ActivePool");
  const activePool = await ActivePool.deploy();
  await activePool.waitForDeployment();
  console.log(`  ActivePool (${label}):`, await activePool.getAddress());

  const DefaultPool = await ethers.getContractFactory("DefaultPool");
  const defaultPool = await DefaultPool.deploy();
  await defaultPool.waitForDeployment();
  console.log(`  DefaultPool (${label}):`, await defaultPool.getAddress());

  const GasPool = await ethers.getContractFactory("GasPool");
  const gasPool = await GasPool.deploy();
  await gasPool.waitForDeployment();
  console.log(`  GasPool (${label}):`, await gasPool.getAddress());

  const CollSurplusPool = await ethers.getContractFactory("CollSurplusPool");
  const collSurplusPool = await CollSurplusPool.deploy();
  await collSurplusPool.waitForDeployment();
  console.log(`  CollSurplusPool (${label}):`, await collSurplusPool.getAddress());

  const SortedTroves = await ethers.getContractFactory("SortedTroves");
  const sortedTroves = await SortedTroves.deploy();
  await sortedTroves.waitForDeployment();
  console.log(`  SortedTroves (${label}):`, await sortedTroves.getAddress());

  const TroveNFT = await ethers.getContractFactory("TroveNFT");
  const troveNFT = await TroveNFT.deploy();
  await troveNFT.waitForDeployment();
  console.log(`  TroveNFT (${label}):`, await troveNFT.getAddress());

  // 3. Wire AddressesRegistry
  await addressesRegistry.setAddresses(
    await borrowerOps.getAddress(),
    await troveManager.getAddress(),
    await stabilityPool.getAddress(),
    await activePool.getAddress(),
    await defaultPool.getAddress(),
    await gasPool.getAddress(),
    await collSurplusPool.getAddress(),
    await sortedTroves.getAddress(),
    await troveNFT.getAddress(),
    priceFeedAddr,
    sbUSDAddr,
    collTokenAddr
  );
  console.log(`  AddressesRegistry wired (${label})`);

  // 4. Initialize contracts via addressesRegistry (wait for each TX to be mined)
  let tx;
  tx = await troveManager.setAddressesRegistry(arAddr);
  await tx.wait();
  console.log(`  TroveManager initialized (${label})`);

  tx = await borrowerOps.setAddressesRegistry(arAddr);
  await tx.wait();
  console.log(`  BorrowerOperations initialized (${label})`);

  tx = await stabilityPool.setAddressesRegistry(arAddr);
  await tx.wait();
  console.log(`  StabilityPool initialized (${label})`);

  tx = await activePool.setAddressesRegistry(arAddr);
  await tx.wait();
  console.log(`  ActivePool initialized (${label})`);

  tx = await sortedTroves.setAddressesRegistry(arAddr);
  await tx.wait();
  console.log(`  SortedTroves initialized (${label})`);

  // 5. Set direct addresses where needed (wait for each)
  tx = await activePool.setAddresses(
    await borrowerOps.getAddress(),
    await troveManager.getAddress(),
    await stabilityPool.getAddress(),
    await defaultPool.getAddress(),
    collTokenAddr
  );
  await tx.wait();

  tx = await defaultPool.setAddresses(
    await troveManager.getAddress(),
    await activePool.getAddress(),
    collTokenAddr
  );
  await tx.wait();

  tx = await collSurplusPool.setAddresses(
    await borrowerOps.getAddress(),
    await troveManager.getAddress(),
    collTokenAddr
  );
  await tx.wait();

  tx = await sortedTroves.setAddresses(
    await troveManager.getAddress(),
    await borrowerOps.getAddress()
  );
  await tx.wait();

  tx = await troveNFT.setAddresses(
    await troveManager.getAddress(),
    await borrowerOps.getAddress()
  );
  await tx.wait();

  tx = await stabilityPool.setAddresses(
    sbUSDAddr,
    collTokenAddr,
    await troveManager.getAddress(),
    await activePool.getAddress()
  );
  await tx.wait();

  console.log(`  All contracts wired (${label})`);

  return {
    addressesRegistry: arAddr,
    borrowerOperations: await borrowerOps.getAddress(),
    troveManager: await troveManager.getAddress(),
    stabilityPool: await stabilityPool.getAddress(),
    activePool: await activePool.getAddress(),
    defaultPool: await defaultPool.getAddress(),
    gasPool: await gasPool.getAddress(),
    collSurplusPool: await collSurplusPool.getAddress(),
    sortedTroves: await sortedTroves.getAddress(),
    troveNFT: await troveNFT.getAddress(),
    priceFeed: priceFeedAddr,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
