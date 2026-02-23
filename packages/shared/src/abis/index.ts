export const SbUSDTokenABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function burn(address,uint256)",
  "function setBranchAddresses(address,address,address,address)",
  "function setCollateralRegistry(address)",
] as const;

export const MockWCTCABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function faucet(uint256)",
] as const;

export const MockLstCTCABI = [
  ...MockWCTCABI,
  "function exchangeRate() view returns (uint256)",
  "function getExchangeRate() view returns (uint256)",
  "function setExchangeRate(uint256)",
] as const;

export const MockPriceFeedABI = [
  "function lastGoodPrice() view returns (uint256)",
  "function fetchPrice() view returns (uint256, bool)",
  "function setPrice(uint256)",
  "function setPriceIsValid(bool)",
  "event PriceUpdated(uint256 newPrice)",
] as const;

export const BorrowerOperationsABI = [
  "function openTrove(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256) returns (uint256)",
  "function closeTrove(uint256)",
  "function adjustTrove(uint256,uint256,bool,uint256,bool,uint256,uint256,uint256)",
  "function adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)",
  "function addColl(uint256,uint256)",
  "function withdrawColl(uint256,uint256)",
  "function withdrawBold(uint256,uint256,uint256)",
  "function repayBold(uint256,uint256)",
  "function claimCollateral()",
  "function MCR() view returns (uint256)",
  "function CCR() view returns (uint256)",
] as const;

export const TroveManagerABI = [
  "function getTroveStatus(uint256) view returns (uint8)",
  "function getTroveDebt(uint256) view returns (uint256)",
  "function getTroveColl(uint256) view returns (uint256)",
  "function getTroveAnnualInterestRate(uint256) view returns (uint256)",
  "function getCurrentICR(uint256,uint256) view returns (uint256)",
  "function getTroveLastDebtUpdateTime(uint256) view returns (uint256)",
  "function getTroveIdsCount() view returns (uint256)",
  "function getTroveFromTroveIdsArray(uint256) view returns (uint256)",
  "function liquidate(uint256)",
  "function redeemCollateral(address,uint256,uint256,uint256) returns (uint256)",
  "function batchLiquidateTroves(uint256[])",
  "function getLatestTroveData(uint256) view returns (uint256,uint256,uint256,uint256,uint256)",
  "function getEntireDebtAndColl(uint256) view returns (uint256,uint256)",
  "function MCR() view returns (uint256)",
  "function CCR() view returns (uint256)",
  "event TroveOpened(uint256 indexed troveId, address indexed owner, uint256 coll, uint256 debt)",
  "event TroveClosed(uint256 indexed troveId)",
  "event TroveAdjusted(uint256 indexed troveId, uint256 coll, uint256 debt)",
  "event TroveLiquidated(uint256 indexed troveId, uint256 coll, uint256 debt)",
  "event TroveInterestRateAdjusted(uint256 indexed troveId, uint256 newRate)",
  "event TroveRedeemed(uint256 indexed troveId, uint256 collDrawn, uint256 debtRedeemed)",
] as const;

export const StabilityPoolABI = [
  "function provideToSP(uint256)",
  "function withdrawFromSP(uint256)",
  "function claimReward()",
  "function triggerBoldRewards(uint256)",
  "function getTotalBoldDeposits() view returns (uint256)",
  "function getDepositorBoldGain(address) view returns (uint256)",
  "function getDepositorCollGain(address) view returns (uint256)",
  "function getCompoundedBoldDeposit(address) view returns (uint256)",
] as const;

export const ActivePoolABI = [
  "function getCollBalance() view returns (uint256)",
  "function getBoldDebt() view returns (uint256)",
  "function aggWeightedDebtSum() view returns (uint256)",
] as const;

export const CollateralRegistryABI = [
  "function totalCollaterals() view returns (uint256)",
  "function getToken(uint256) view returns (address)",
  "function getTroveManager(uint256) view returns (address)",
  "function getBorrowerOperations(uint256) view returns (address)",
  "function getStabilityPool(uint256) view returns (address)",
  "function getActivePool(uint256) view returns (address)",
  "function getPriceFeed(uint256) view returns (address)",
  "function sbUSDToken() view returns (address)",
  "function redeemCollateral(uint256,uint256,uint256)",
] as const;

export const TroveNFTABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
] as const;

export const SortedTrovesABI = [
  "function getSize() view returns (uint256)",
  "function getFirst() view returns (uint256)",
  "function getLast() view returns (uint256)",
  "function getNext(uint256) view returns (uint256)",
  "function getPrev(uint256) view returns (uint256)",
  "function contains(uint256) view returns (bool)",
  "function findInsertPosition(uint256,uint256,uint256) view returns (uint256,uint256)",
] as const;

export const HintHelpersABI = [
  "function getApproxHint(uint256,uint256,uint256,uint256) view returns (uint256,uint256,uint256)",
] as const;

export const MultiTroveGetterABI = [
  "function getMultipleSortedTroves(uint256,int256,uint256) view returns ((uint256 id, uint256 debt, uint256 coll, uint256 annualInterestRate, uint8 status)[])",
] as const;

export const IdentityRegistryABI = [
  "function registerAgent(string,string,address,string) returns (uint256)",
  "function deactivateAgent(uint256)",
  "function activateAgent(uint256)",
  "function getAgentInfo(uint256) view returns (tuple(string name, string agentType, address endpoint, uint256 registeredAt, bool isActive))",
  "function getOwnerAgents(address) view returns (uint256[])",
  "function totalAgents() view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string agentType)",
] as const;

export const ReputationRegistryABI = [
  "function submitReview(uint256,int128,string,string)",
  "function getSummary(uint256,address[],string,string) view returns (uint64,int128,uint8)",
  "function getReviews(uint256) view returns (tuple(address reviewer, uint256 agentId, int128 score, string comment, uint256 timestamp)[])",
  "function getReputation(uint256,string) view returns (tuple(uint64 totalInteractions, uint64 successfulInteractions, int128 reputationScore, uint8 decimals))",
  "function getSuccessRate(uint256,string) view returns (uint256)",
] as const;

export const AgentVaultABI = [
  "function deposit(address token, uint256 amount)",
  "function withdraw(address token, uint256 amount)",
  "function grantPermission(address agent, address[] targets, bytes4[] functions, uint256 cap, uint256 expiry)",
  "function revokePermission(address agent)",
  "function executeOnBehalf(address user, address target, bytes data) returns (bytes)",
  "function approveFromVault(address user, address token, address spender, uint256 amount)",
  "function transferFromVault(address user, address token, address to, uint256 amount)",
  "function getPermission(address user, address agent) view returns (tuple(address[] allowedTargets, bytes4[] allowedFunctions, uint256 spendingCap, uint256 spent, uint256 expiry, bool active))",
  "function getBalance(address user, address token) view returns (uint256)",
  "event Deposited(address indexed user, address indexed token, uint256 amount)",
  "event Withdrawn(address indexed user, address indexed token, uint256 amount)",
  "event PermissionGranted(address indexed user, address indexed agent, uint256 expiry)",
  "event PermissionRevoked(address indexed user, address indexed agent)",
  "event ExecutedOnBehalf(address indexed user, address indexed agent, address target, bytes4 selector, uint256 value)",
] as const;

export const ValidationRegistryABI = [
  "function validateAgent(uint256,uint256,string)",
  "function suspendAgent(uint256)",
  "function revokeAgent(uint256)",
  "function isValidated(uint256) view returns (bool)",
  "function getValidation(uint256) view returns (tuple(uint8 status, address validator, uint256 validatedAt, uint256 expiresAt, string certificationURI))",
] as const;
