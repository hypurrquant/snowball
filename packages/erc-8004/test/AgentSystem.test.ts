import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ERC-8004 Agent System", function () {
  let identityRegistry: any;
  let reputationRegistry: any;
  let validationRegistry: any;

  let deployer: HardhatEthersSigner;
  let agentOwner: HardhatEthersSigner;
  let reviewer: HardhatEthersSigner;
  let validator: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  before(async function () {
    [deployer, agentOwner, reviewer, validator, outsider] = await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy();

    const identityAddress = await identityRegistry.getAddress();

    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(identityAddress);

    const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
    validationRegistry = await ValidationRegistry.deploy(identityAddress);
  });

  // ── Identity Registry ────────────────────────────────────────

  describe("1. Identity Registry — Agent Registration", function () {
    let agentId: bigint;

    it("should register a new agent and mint an NFT", async function () {
      const transaction = await identityRegistry.connect(agentOwner).registerAgent(
        "CDP Optimizer",
        "cdp-provider",
        agentOwner.address,
        "ipfs://QmAgent1"
      );
      const receipt = await transaction.wait();

      // Extract agentId from AgentRegistered event
      const event = receipt!.logs.find((log: any) => {
        try {
          return identityRegistry.interface.parseLog(log)?.name === "AgentRegistered";
        } catch { return false; }
      });
      const parsed = identityRegistry.interface.parseLog(event!);
      agentId = parsed!.args.agentId;

      expect(agentId).to.equal(1n);
      expect(await identityRegistry.ownerOf(agentId)).to.equal(agentOwner.address);
    });

    it("should store agent metadata correctly", async function () {
      const info = await identityRegistry.getAgentInfo(1);
      expect(info.name).to.equal("CDP Optimizer");
      expect(info.agentType).to.equal("cdp-provider");
      expect(info.endpoint).to.equal(agentOwner.address);
      expect(info.isActive).to.be.true;
    });

    it("should return the correct total agent count", async function () {
      expect(await identityRegistry.totalAgents()).to.equal(1);
    });

    it("should track agents per owner", async function () {
      const agentIds = await identityRegistry.getOwnerAgents(agentOwner.address);
      expect(agentIds.length).to.equal(1);
      expect(agentIds[0]).to.equal(1n);
    });

    it("should allow registering multiple agents", async function () {
      await identityRegistry.connect(agentOwner).registerAgent(
        "Risk Monitor",
        "consumer",
        agentOwner.address,
        "ipfs://QmAgent2"
      );

      expect(await identityRegistry.totalAgents()).to.equal(2);
      const agentIds = await identityRegistry.getOwnerAgents(agentOwner.address);
      expect(agentIds.length).to.equal(2);
    });
  });

  describe("2. Identity Registry — Activation and Deactivation", function () {
    it("should allow the owner to deactivate their agent", async function () {
      await identityRegistry.connect(agentOwner).deactivateAgent(1);
      const info = await identityRegistry.getAgentInfo(1);
      expect(info.isActive).to.be.false;
    });

    it("should allow the owner to reactivate their agent", async function () {
      await identityRegistry.connect(agentOwner).activateAgent(1);
      const info = await identityRegistry.getAgentInfo(1);
      expect(info.isActive).to.be.true;
    });

    it("should not allow a non-owner to deactivate an agent", async function () {
      await expect(
        identityRegistry.connect(outsider).deactivateAgent(1)
      ).to.be.revertedWith("Not agent owner");
    });

    it("should not allow a non-owner to activate an agent", async function () {
      await expect(
        identityRegistry.connect(outsider).activateAgent(1)
      ).to.be.revertedWith("Not agent owner");
    });
  });

  // ── Reputation Registry ──────────────────────────────────────

  describe("3. Reputation Registry — Reviews", function () {
    it("should accept a valid review (score 1.00 to 5.00)", async function () {
      await reputationRegistry.connect(reviewer).submitReview(
        1, // agentId
        450, // 4.50
        "Excellent collateral ratio optimization",
        "performance"
      );

      const reviews = await reputationRegistry.getReviews(1);
      expect(reviews.length).to.equal(1);
      expect(reviews[0].score).to.equal(450);
      expect(reviews[0].reviewer).to.equal(reviewer.address);
    });

    it("should reject a review with a score below 1.00 (100)", async function () {
      await expect(
        reputationRegistry.connect(reviewer).submitReview(1, 50, "bad", "performance")
      ).to.be.revertedWith("Score must be 1.00-5.00 (100-500)");
    });

    it("should reject a review with a score above 5.00 (500)", async function () {
      await expect(
        reputationRegistry.connect(reviewer).submitReview(1, 600, "too good", "performance")
      ).to.be.revertedWith("Score must be 1.00-5.00 (100-500)");
    });

    it("should compute a running average reputation score", async function () {
      // First review was 450. Submit a second: 350 → average = (450 + 350) / 2 = 400
      await reputationRegistry.connect(outsider).submitReview(
        1, 350, "Good but could improve", "performance"
      );

      const reputation = await reputationRegistry.getReputation(1, "performance");
      expect(reputation.reputationScore).to.equal(400); // 4.00
      expect(reputation.totalInteractions).to.equal(2);
    });

    it("should track reputations per tag independently", async function () {
      await reputationRegistry.connect(reviewer).submitReview(
        1, 500, "Very reliable", "reliability"
      );

      const perfReputation = await reputationRegistry.getReputation(1, "performance");
      const relReputation = await reputationRegistry.getReputation(1, "reliability");

      expect(perfReputation.reputationScore).to.equal(400);
      expect(relReputation.reputationScore).to.equal(500);
    });
  });

  describe("4. Reputation Registry — Interaction Tracking", function () {
    it("should record successful interactions (owner only)", async function () {
      await reputationRegistry.connect(deployer).recordInteraction(1, "execution", true);
      await reputationRegistry.connect(deployer).recordInteraction(1, "execution", true);
      await reputationRegistry.connect(deployer).recordInteraction(1, "execution", false);

      const successRate = await reputationRegistry.getSuccessRate(1, "execution");
      // 2 successful out of 3 total = 6666 (66.66%)
      expect(successRate).to.equal(6666n);
    });

    it("should not allow a non-owner to record interactions", async function () {
      await expect(
        reputationRegistry.connect(outsider).recordInteraction(1, "execution", true)
      ).to.be.revertedWithCustomError(reputationRegistry, "OwnableUnauthorizedAccount");
    });
  });

  describe("5. Reputation Registry — Summary", function () {
    it("should return a combined summary across multiple tags", async function () {
      const [count, summaryValue, decimals] = await reputationRegistry.getSummary(
        1,
        [], // clients (unused)
        "performance",
        "reliability"
      );

      // performance: 2 reviews, reliability: 1 review = 3 total interactions
      expect(count).to.equal(3);
      expect(decimals).to.equal(2);
      // Average of performance (400) and reliability (500) = 450
      expect(summaryValue).to.equal(450);
    });
  });

  // ── Validation Registry ──────────────────────────────────────

  describe("6. Validation Registry — Validator Management", function () {
    it("should allow the owner to add a validator", async function () {
      await validationRegistry.connect(deployer).addValidator(validator.address);
      expect(await validationRegistry.validators(validator.address)).to.be.true;
    });

    it("should not allow a non-owner to add a validator", async function () {
      await expect(
        validationRegistry.connect(outsider).addValidator(outsider.address)
      ).to.be.revertedWithCustomError(validationRegistry, "OwnableUnauthorizedAccount");
    });

    it("should allow the owner to remove a validator", async function () {
      await validationRegistry.connect(deployer).addValidator(outsider.address);
      await validationRegistry.connect(deployer).removeValidator(outsider.address);
      expect(await validationRegistry.validators(outsider.address)).to.be.false;
    });
  });

  describe("7. Validation Registry — Agent Validation Lifecycle", function () {
    const ONE_YEAR = 365 * 24 * 60 * 60;

    it("should validate an agent with a validity period", async function () {
      await validationRegistry.connect(validator).validateAgent(
        1,
        ONE_YEAR,
        "ipfs://QmCert1"
      );

      expect(await validationRegistry.isValidated(1)).to.be.true;

      const validation = await validationRegistry.getValidation(1);
      expect(validation.status).to.equal(2); // Validated
      expect(validation.validator).to.equal(validator.address);
      expect(validation.certificationURI).to.equal("ipfs://QmCert1");
    });

    it("should not allow a non-validator to validate an agent", async function () {
      await expect(
        validationRegistry.connect(outsider).validateAgent(2, ONE_YEAR, "ipfs://fake")
      ).to.be.revertedWith("Not a validator");
    });

    it("should allow a validator to suspend an agent", async function () {
      await validationRegistry.connect(validator).suspendAgent(1);

      const validation = await validationRegistry.getValidation(1);
      expect(validation.status).to.equal(3); // Suspended
      expect(await validationRegistry.isValidated(1)).to.be.false;
    });

    it("should allow re-validating a suspended agent", async function () {
      await validationRegistry.connect(validator).validateAgent(
        1,
        ONE_YEAR,
        "ipfs://QmCert2"
      );

      expect(await validationRegistry.isValidated(1)).to.be.true;
    });

    it("should allow a validator to revoke an agent", async function () {
      await validationRegistry.connect(validator).revokeAgent(1);

      const validation = await validationRegistry.getValidation(1);
      expect(validation.status).to.equal(4); // Revoked
      expect(await validationRegistry.isValidated(1)).to.be.false;
    });

    it("should report an agent as not validated if the period has expired", async function () {
      // Re-validate with a very short period, then advance time
      await validationRegistry.connect(validator).validateAgent(1, 1, "ipfs://QmExpire");

      // Advance time by 2 seconds
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      expect(await validationRegistry.isValidated(1)).to.be.false;
    });
  });

  // ── Cross-contract integration ───────────────────────────────

  describe("8. Cross-contract integration", function () {
    it("should link IdentityRegistry to ReputationRegistry", async function () {
      expect(await reputationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
    });

    it("should link IdentityRegistry to ValidationRegistry", async function () {
      expect(await validationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
    });

    it("should allow reviewing and validating the same agent", async function () {
      // Register a fresh agent
      await identityRegistry.connect(agentOwner).registerAgent(
        "Multi-Strategy Agent",
        "hybrid",
        agentOwner.address,
        "ipfs://QmAgent3"
      );
      const agentId = 3;

      // Review it
      await reputationRegistry.connect(reviewer).submitReview(
        agentId, 480, "Great hybrid agent", "overall"
      );

      // Validate it
      await validationRegistry.connect(validator).validateAgent(
        agentId,
        365 * 24 * 60 * 60,
        "ipfs://QmCert3"
      );

      // Both should reflect the agent
      const reputation = await reputationRegistry.getReputation(agentId, "overall");
      expect(reputation.reputationScore).to.equal(480);
      expect(await validationRegistry.isValidated(agentId)).to.be.true;
    });
  });
});
