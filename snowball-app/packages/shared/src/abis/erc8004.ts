// Snowball Protocol — ERC-8004 Agent ABIs

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
