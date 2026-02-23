import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Full User Flow — Liquity Protocol", function () {
  // Contracts
  let mockWCTC: any;
  let mockPriceFeed: any;
  let sbUSDToken: any;
  let addressesRegistry: any;
  let borrowerOperations: any;
  let troveManager: any;
  let stabilityPool: any;
  let activePool: any;
  let defaultPool: any;
  let sortedTroves: any;
  let troveNFT: any;
  let gasPool: any;
  let collSurplusPool: any;

  // Signers
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;
  let liquidator: HardhatEthersSigner;

  // Constants
  const INITIAL_PRICE = ethers.parseEther("2"); // 1 wCTC = 2 USD
  const MCR = ethers.parseEther("1.1"); // 110%
  const CCR = ethers.parseEther("1.5"); // 150%
  const MIN_DEBT = ethers.parseEther("200");
  const ANNUAL_RATE_5PCT = ethers.parseEther("0.05"); // 5%
  const ANNUAL_RATE_10PCT = ethers.parseEther("0.10"); // 10%
  const MAX_UPFRONT_FEE = ethers.parseEther("100"); // generous cap

  /**
   * Deploy all contracts and wire them together.
   * This mirrors the production deploy script flow.
   */
  async function deployProtocol() {
    [deployer, alice, bob, carol, liquidator] = await ethers.getSigners();

    // 1. Mock tokens and price feed
    const MockWCTC = await ethers.getContractFactory("MockWCTC");
    mockWCTC = await MockWCTC.deploy();

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy(INITIAL_PRICE);

    // 2. SbUSD token
    const SbUSDToken = await ethers.getContractFactory("SbUSDToken");
    sbUSDToken = await SbUSDToken.deploy();

    // 3. Core contracts
    const AddressesRegistry = await ethers.getContractFactory("AddressesRegistry");
    addressesRegistry = await AddressesRegistry.deploy(MCR, CCR);

    const BorrowerOperations = await ethers.getContractFactory("BorrowerOperations");
    borrowerOperations = await BorrowerOperations.deploy();

    const TroveManager = await ethers.getContractFactory("TroveManager");
    troveManager = await TroveManager.deploy();

    const StabilityPool = await ethers.getContractFactory("StabilityPool");
    stabilityPool = await StabilityPool.deploy();

    const ActivePool = await ethers.getContractFactory("ActivePool");
    activePool = await ActivePool.deploy();

    const DefaultPool = await ethers.getContractFactory("DefaultPool");
    defaultPool = await DefaultPool.deploy();

    const SortedTroves = await ethers.getContractFactory("SortedTroves");
    sortedTroves = await SortedTroves.deploy();

    const TroveNFT = await ethers.getContractFactory("TroveNFT");
    troveNFT = await TroveNFT.deploy();

    const GasPool = await ethers.getContractFactory("GasPool");
    gasPool = await GasPool.deploy();

    const CollSurplusPool = await ethers.getContractFactory("CollSurplusPool");
    collSurplusPool = await CollSurplusPool.deploy();

    // 4. Wire AddressesRegistry
    await addressesRegistry.setAddresses(
      await borrowerOperations.getAddress(),
      await troveManager.getAddress(),
      await stabilityPool.getAddress(),
      await activePool.getAddress(),
      await defaultPool.getAddress(),
      await gasPool.getAddress(),
      await collSurplusPool.getAddress(),
      await sortedTroves.getAddress(),
      await troveNFT.getAddress(),
      await mockPriceFeed.getAddress(),
      await sbUSDToken.getAddress(),
      await mockWCTC.getAddress()
    );

    // 5. Initialize each contract via AddressesRegistry
    const regAddr = await addressesRegistry.getAddress();

    await borrowerOperations.setAddressesRegistry(regAddr);
    await troveManager.setAddressesRegistry(regAddr);
    await stabilityPool.setAddressesRegistry(regAddr);
    await activePool.setAddressesRegistry(regAddr);
    await sortedTroves.setAddressesRegistry(regAddr);

    // 6. Per-contract address wiring
    await activePool.setAddresses(
      await borrowerOperations.getAddress(),
      await troveManager.getAddress(),
      await stabilityPool.getAddress(),
      await defaultPool.getAddress(),
      await mockWCTC.getAddress()
    );

    await stabilityPool.setAddresses(
      await sbUSDToken.getAddress(),
      await mockWCTC.getAddress(),
      await troveManager.getAddress(),
      await activePool.getAddress()
    );

    await sortedTroves.setAddresses(
      await troveManager.getAddress(),
      await borrowerOperations.getAddress()
    );

    await troveNFT.setAddresses(
      await troveManager.getAddress(),
      await borrowerOperations.getAddress()
    );

    await defaultPool.setAddresses(
      await troveManager.getAddress(),
      await activePool.getAddress(),
      await mockWCTC.getAddress()
    );

    await collSurplusPool.setAddresses(
      await borrowerOperations.getAddress(),
      await troveManager.getAddress(),
      await mockWCTC.getAddress()
    );

    // 7. SbUSD token authorization
    await sbUSDToken.setBranchAddresses(
      await troveManager.getAddress(),
      await stabilityPool.getAddress(),
      await borrowerOperations.getAddress(),
      await activePool.getAddress()
    );

    // 8. Distribute wCTC to test users
    await mockWCTC.mint(alice.address, ethers.parseEther("10000"));
    await mockWCTC.mint(bob.address, ethers.parseEther("10000"));
    await mockWCTC.mint(carol.address, ethers.parseEther("10000"));
  }

  /**
   * Helper: approve BorrowerOperations to spend user's wCTC
   */
  async function approveCollateral(signer: HardhatEthersSigner, amount: bigint) {
    await mockWCTC.connect(signer).approve(await borrowerOperations.getAddress(), amount);
  }

  /**
   * Helper: open a trove and return the troveId
   */
  async function openTrove(
    signer: HardhatEthersSigner,
    collAmount: bigint,
    debtAmount: bigint,
    rate: bigint = ANNUAL_RATE_5PCT
  ): Promise<bigint> {
    await approveCollateral(signer, collAmount);
    const transaction = await borrowerOperations.connect(signer).openTrove(
      signer.address,
      0, // ownerIndex
      collAmount,
      debtAmount,
      0, // upperHint
      0, // lowerHint
      rate,
      MAX_UPFRONT_FEE
    );
    const receipt = await transaction.wait();
    // troveId is the return value — extract from TroveOpened event
    const troveOpenedEvent = receipt!.logs.find(
      (log: any) => {
        try {
          return troveManager.interface.parseLog(log)?.name === "TroveOpened";
        } catch { return false; }
      }
    );
    const parsed = troveManager.interface.parseLog(troveOpenedEvent!);
    return parsed!.args.troveId;
  }

  // ============================================================
  // Test suite
  // ============================================================

  before(async function () {
    await deployProtocol();
  });

  describe("1. Protocol deployment", function () {
    it("should set Minimum Collateral Ratio and Critical Collateral Ratio correctly", async function () {
      expect(await addressesRegistry.MCR()).to.equal(MCR);
      expect(await addressesRegistry.CCR()).to.equal(CCR);
    });

    it("should initialize all contracts", async function () {
      expect(await borrowerOperations.isInitialized()).to.be.true;
      expect(await troveManager.isInitialized()).to.be.true;
      expect(await stabilityPool.isInitialized()).to.be.true;
      expect(await activePool.isInitialized()).to.be.true;
    });

    it("should return the correct price from MockPriceFeed", async function () {
      const [price] = await mockPriceFeed.fetchPrice();
      expect(price).to.equal(INITIAL_PRICE);
    });

    it("should authorize SbUSD minting for BorrowerOperations", async function () {
      const isAuth = await sbUSDToken.borrowerOperations(await borrowerOperations.getAddress());
      expect(isAuth).to.be.true;
    });
  });

  // ── Trove lifecycle ──────────────────────────────────────────

  describe("2. Opening a Trove", function () {
    let aliceTroveId: bigint;

    it("should fail if collateral ratio is below Minimum Collateral Ratio", async function () {
      // 100 wCTC at $2 = $200 collateral, 200 debt → Individual Collateral Ratio = 1.0 < 1.1
      const collateral = ethers.parseEther("100");
      const debt = ethers.parseEther("200");
      await approveCollateral(alice, collateral);

      await expect(
        borrowerOperations.connect(alice).openTrove(
          alice.address, 0, collateral, debt, 0, 0, ANNUAL_RATE_5PCT, MAX_UPFRONT_FEE
        )
      ).to.be.revertedWith("ICR below MCR");
    });

    it("should fail if interest rate is below the minimum (0.5%)", async function () {
      const collateral = ethers.parseEther("1000");
      const debt = ethers.parseEther("500");
      const tooLowRate = ethers.parseEther("0.001"); // 0.1%
      await approveCollateral(alice, collateral);

      await expect(
        borrowerOperations.connect(alice).openTrove(
          alice.address, 0, collateral, debt, 0, 0, tooLowRate, MAX_UPFRONT_FEE
        )
      ).to.be.revertedWith("Interest rate too low");
    });

    it("should open a trove successfully with valid parameters", async function () {
      // 1000 wCTC at $2 = $2000 collateral, 500 sbUSD debt → Individual Collateral Ratio = 4.0
      const collateral = ethers.parseEther("1000");
      const debt = ethers.parseEther("500");

      aliceTroveId = await openTrove(alice, collateral, debt);
      expect(aliceTroveId).to.equal(1n);

      // Verify trove state
      const troveColl = await troveManager.getTroveColl(aliceTroveId);
      expect(troveColl).to.equal(collateral);

      // Debt includes upfront fee
      const troveDebt = await troveManager.getTroveDebt(aliceTroveId);
      expect(troveDebt).to.be.gt(debt);

      // Status = active (1)
      expect(await troveManager.getTroveStatus(aliceTroveId)).to.equal(1);
    });

    it("should mint sbUSD to the borrower", async function () {
      const aliceBalance = await sbUSDToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(ethers.parseEther("500"));
    });

    it("should mint a Trove NFT to the borrower", async function () {
      expect(await troveNFT.ownerOf(1)).to.equal(alice.address);
    });

    it("should transfer collateral to ActivePool", async function () {
      const poolBalance = await activePool.getCollBalance();
      expect(poolBalance).to.equal(ethers.parseEther("1000"));
    });

    it("should insert the trove into SortedTroves", async function () {
      expect(await sortedTroves.contains(1)).to.be.true;
      expect(await sortedTroves.getSize()).to.equal(1);
    });
  });

  // ── Trove adjustments ────────────────────────────────────────

  describe("3. Adjusting a Trove", function () {
    it("should add collateral to an existing trove", async function () {
      const addAmount = ethers.parseEther("200");
      await approveCollateral(alice, addAmount);
      await borrowerOperations.connect(alice).addColl(1, addAmount);

      const coll = await troveManager.getTroveColl(1);
      expect(coll).to.equal(ethers.parseEther("1200")); // 1000 + 200
    });

    it("should withdraw collateral while keeping the ratio above Minimum Collateral Ratio", async function () {
      // Current: 1200 wCTC at $2 = $2400, debt ≈ 500 + fee
      // Withdraw 100 → 1100 wCTC, $2200 / ~500 = ~4.4 > 1.1 ✓
      await borrowerOperations.connect(alice).withdrawColl(1, ethers.parseEther("100"));

      const coll = await troveManager.getTroveColl(1);
      expect(coll).to.equal(ethers.parseEther("1100"));
    });

    it("should borrow additional sbUSD (withdraw bold)", async function () {
      const extraDebt = ethers.parseEther("100");
      await borrowerOperations.connect(alice).withdrawBold(1, extraDebt, MAX_UPFRONT_FEE);

      const balance = await sbUSDToken.balanceOf(alice.address);
      expect(balance).to.equal(ethers.parseEther("600")); // 500 + 100
    });

    it("should repay sbUSD debt", async function () {
      const repayAmount = ethers.parseEther("50");
      await borrowerOperations.connect(alice).repayBold(1, repayAmount);

      const balance = await sbUSDToken.balanceOf(alice.address);
      expect(balance).to.equal(ethers.parseEther("550")); // 600 - 50
    });

    it("should reject collateral withdrawal that would drop the ratio below Minimum Collateral Ratio", async function () {
      // Trying to withdraw almost all collateral
      await expect(
        borrowerOperations.connect(alice).withdrawColl(1, ethers.parseEther("1050"))
      ).to.be.revertedWith("ICR below MCR");
    });

    it("should not allow a non-owner to adjust the trove", async function () {
      await expect(
        borrowerOperations.connect(bob).addColl(1, ethers.parseEther("10"))
      ).to.be.revertedWith("BorrowerOps: not owner");
    });
  });

  // ── Closing a Trove ──────────────────────────────────────────

  describe("4. Closing a Trove", function () {
    let bobTroveId: bigint;

    before(async function () {
      // Bob opens a trove
      bobTroveId = await openTrove(
        bob,
        ethers.parseEther("500"),
        ethers.parseEther("300"),
        ANNUAL_RATE_10PCT
      );
    });

    it("should close a trove and return all collateral", async function () {
      const collBefore = await mockWCTC.balanceOf(bob.address);
      const debt = await troveManager.getTroveDebt(bobTroveId);

      // Bob needs enough sbUSD to repay full debt (including upfront fee)
      // He has 300 sbUSD from opening. Mint extra from deployer if needed.
      const bobSbUSD = await sbUSDToken.balanceOf(bob.address);
      if (bobSbUSD < debt) {
        // Give Alice's sbUSD to Bob to cover the fee portion
        const shortfall = debt - bobSbUSD;
        await sbUSDToken.connect(alice).transfer(bob.address, shortfall);
      }

      await borrowerOperations.connect(bob).closeTrove(bobTroveId);

      // Status = closedByOwner (2)
      expect(await troveManager.getTroveStatus(bobTroveId)).to.equal(2);

      // Collateral returned
      const collAfter = await mockWCTC.balanceOf(bob.address);
      expect(collAfter - collBefore).to.equal(ethers.parseEther("500"));

      // Removed from sorted list
      expect(await sortedTroves.contains(bobTroveId)).to.be.false;
    });

    it("should not allow closing someone else's trove", async function () {
      await expect(
        borrowerOperations.connect(bob).closeTrove(1) // Alice's trove
      ).to.be.revertedWith("BorrowerOps: not owner");
    });
  });

  // ── Stability Pool ───────────────────────────────────────────

  describe("5. Stability Pool", function () {
    before(async function () {
      // Carol opens a trove to get sbUSD for the stability pool
      await openTrove(
        carol,
        ethers.parseEther("2000"),
        ethers.parseEther("1000")
      );
    });

    it("should allow depositing sbUSD into the Stability Pool", async function () {
      const depositAmount = ethers.parseEther("500");
      await stabilityPool.connect(carol).provideToSP(depositAmount);

      const totalDeposits = await stabilityPool.getTotalBoldDeposits();
      expect(totalDeposits).to.equal(depositAmount);

      // Carol's sbUSD balance should decrease
      const balance = await sbUSDToken.balanceOf(carol.address);
      expect(balance).to.equal(ethers.parseEther("500")); // 1000 - 500
    });

    it("should allow withdrawing sbUSD from the Stability Pool", async function () {
      await stabilityPool.connect(carol).withdrawFromSP(ethers.parseEther("200"));

      const totalDeposits = await stabilityPool.getTotalBoldDeposits();
      expect(totalDeposits).to.equal(ethers.parseEther("300"));

      const balance = await sbUSDToken.balanceOf(carol.address);
      expect(balance).to.equal(ethers.parseEther("700")); // 500 + 200
    });

    it("should reject a deposit of zero", async function () {
      await expect(
        stabilityPool.connect(carol).provideToSP(0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should reject a claim when there is no reward", async function () {
      await expect(
        stabilityPool.connect(carol).claimReward()
      ).to.be.revertedWith("No reward");
    });
  });

  // ── Liquidation ──────────────────────────────────────────────

  describe("6. Liquidation", function () {
    let riskyTroveId: bigint;

    before(async function () {
      // Set price high to allow opening a risky trove
      await mockPriceFeed.setPrice(ethers.parseEther("2"));

      // Bob opens a risky trove at minimum collateral ratio
      // 300 wCTC × $2 = $600 collateral, want debt ≈ $500
      // Individual Collateral Ratio = $600 / $500 = 1.2 > 1.1 ✓ (barely safe)
      riskyTroveId = await openTrove(
        bob,
        ethers.parseEther("300"),
        ethers.parseEther("500"),
        ANNUAL_RATE_5PCT
      );

      // Ensure Carol has deposited enough in the Stability Pool to absorb
      const carolBalance = await sbUSDToken.balanceOf(carol.address);
      const spDeposits = await stabilityPool.getTotalBoldDeposits();
      if (spDeposits < ethers.parseEther("500")) {
        const needed = ethers.parseEther("500") - spDeposits;
        if (carolBalance >= needed) {
          await stabilityPool.connect(carol).provideToSP(needed);
        }
      }
    });

    it("should not allow liquidation when the ratio is above Minimum Collateral Ratio", async function () {
      await expect(
        troveManager.connect(liquidator).liquidate(riskyTroveId)
      ).to.be.revertedWith("ICR >= MCR");
    });

    it("should allow liquidation after price drops below the Minimum Collateral Ratio threshold", async function () {
      // Drop price: 300 wCTC × $1 = $300 collateral / ~500+ debt → ratio < 1.1
      await mockPriceFeed.setPrice(ethers.parseEther("1"));

      const spCollBefore = await mockWCTC.balanceOf(await stabilityPool.getAddress());

      await troveManager.connect(liquidator).liquidate(riskyTroveId);

      // Status = closedByLiquidation (3)
      expect(await troveManager.getTroveStatus(riskyTroveId)).to.equal(3);

      // Collateral sent to Stability Pool
      const spCollAfter = await mockWCTC.balanceOf(await stabilityPool.getAddress());
      expect(spCollAfter).to.be.gt(spCollBefore);

      // Removed from sorted list
      expect(await sortedTroves.contains(riskyTroveId)).to.be.false;
    });

    it("should distribute collateral gains to Stability Pool depositors", async function () {
      const carolGain = await stabilityPool.getDepositorCollGain(carol.address);
      expect(carolGain).to.be.gt(0);
    });

    it("should allow claiming collateral rewards from the Stability Pool", async function () {
      const balanceBefore = await mockWCTC.balanceOf(carol.address);
      await stabilityPool.connect(carol).claimReward();
      const balanceAfter = await mockWCTC.balanceOf(carol.address);

      expect(balanceAfter).to.be.gt(balanceBefore);

      // Gain should be reset
      const gainAfterClaim = await stabilityPool.getDepositorCollGain(carol.address);
      expect(gainAfterClaim).to.equal(0);
    });
  });

  // ── Multi-trove sorting ──────────────────────────────────────

  describe("7. SortedTroves ordering", function () {
    before(async function () {
      // Restore price for clean trove opening
      await mockPriceFeed.setPrice(ethers.parseEther("2"));
    });

    it("should sort troves by annual interest rate in descending order", async function () {
      // Open troves at different rates
      const troveA = await openTrove(
        alice,
        ethers.parseEther("500"),
        ethers.parseEther("200"),
        ethers.parseEther("0.20") // 20%
      );

      const troveB = await openTrove(
        bob,
        ethers.parseEther("500"),
        ethers.parseEther("200"),
        ethers.parseEther("0.01") // 1%
      );

      // Head should be the highest rate trove
      const headId = await sortedTroves.getFirst();
      const headNode = await sortedTroves.nodes(headId);
      const tailId = await sortedTroves.getLast();
      const tailNode = await sortedTroves.nodes(tailId);

      expect(headNode.annualInterestRate).to.be.gte(tailNode.annualInterestRate);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────

  describe("8. Edge cases", function () {
    it("should reject opening a trove with debt below the minimum (200 sbUSD)", async function () {
      // Debt below MIN_DEBT — caught by TroveManager
      const collateral = ethers.parseEther("500");
      const debt = ethers.parseEther("100"); // below 200 minimum
      await approveCollateral(alice, collateral);

      await expect(
        borrowerOperations.connect(alice).openTrove(
          alice.address, 0, collateral, debt, 0, 0, ANNUAL_RATE_5PCT, MAX_UPFRONT_FEE
        )
      ).to.be.revertedWith("Debt below minimum");
    });

    it("should reject an interest rate above the maximum (25%)", async function () {
      const collateral = ethers.parseEther("500");
      const debt = ethers.parseEther("200");
      const tooHighRate = ethers.parseEther("0.30"); // 30%
      await approveCollateral(alice, collateral);

      await expect(
        borrowerOperations.connect(alice).openTrove(
          alice.address, 0, collateral, debt, 0, 0, tooHighRate, MAX_UPFRONT_FEE
        )
      ).to.be.revertedWith("Interest rate too high");
    });

    it("should prevent double initialization of contracts", async function () {
      const regAddr = await addressesRegistry.getAddress();
      await expect(
        borrowerOperations.setAddressesRegistry(regAddr)
      ).to.be.revertedWith("Already initialized");
    });
  });
});
