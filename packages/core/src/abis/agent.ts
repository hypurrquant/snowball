// ERC-8004 Agent ABIs
// Sources: packages/erc-8004/contracts/ (IdentityRegistry, ReputationRegistry, ValidationRegistry)
//          packages/liquity/contracts/custom/AgentVault.sol

export const IdentityRegistryABI = [
  { type: "function", name: "registerAgent", inputs: [{ name: "_name", type: "string" }, { name: "_agentType", type: "string" }, { name: "_endpoint", type: "address" }, { name: "_tokenURI", type: "string" }], outputs: [{ name: "agentId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "deactivateAgent", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "activateAgent", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getAgentInfo", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "name", type: "string" }, { name: "agentType", type: "string" }, { name: "endpoint", type: "address" }, { name: "registeredAt", type: "uint256" }, { name: "isActive", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getOwnerAgents", inputs: [{ name: "_owner", type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "totalAgents", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ownerOf", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "tokenURI", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "event", name: "AgentRegistered", inputs: [{ name: "agentId", type: "uint256", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "agentType", type: "string", indexed: false }] },
  { type: "event", name: "AgentDeactivated", inputs: [{ name: "agentId", type: "uint256", indexed: true }] },
  { type: "event", name: "AgentActivated", inputs: [{ name: "agentId", type: "uint256", indexed: true }] },
] as const;

export const ReputationRegistryABI = [
  { type: "function", name: "submitReview", inputs: [{ name: "_agentId", type: "uint256" }, { name: "_score", type: "int128" }, { name: "_comment", type: "string" }, { name: "_tag", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getReputation", inputs: [{ name: "_agentId", type: "uint256" }, { name: "_tag", type: "string" }], outputs: [{ name: "", type: "tuple", components: [{ name: "totalInteractions", type: "uint64" }, { name: "successfulInteractions", type: "uint64" }, { name: "reputationScore", type: "int128" }, { name: "decimals", type: "uint8" }] }], stateMutability: "view" },
  { type: "function", name: "getReviews", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "reviewer", type: "address" }, { name: "agentId", type: "uint256" }, { name: "score", type: "int128" }, { name: "comment", type: "string" }, { name: "timestamp", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getSuccessRate", inputs: [{ name: "_agentId", type: "uint256" }, { name: "_tag", type: "string" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "ReviewSubmitted", inputs: [{ name: "agentId", type: "uint256", indexed: true }, { name: "reviewer", type: "address", indexed: true }, { name: "score", type: "int128", indexed: false }] },
] as const;

export const ValidationRegistryABI = [
  { type: "function", name: "isValidated", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getValidation", inputs: [{ name: "_agentId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "status", type: "uint8" }, { name: "validator", type: "address" }, { name: "validatedAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "certificationURI", type: "string" }] }], stateMutability: "view" },
] as const;

export const AgentVaultABI = [
  // Deposit / Withdraw
  { type: "function", name: "deposit", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  // Permission Management
  { type: "function", name: "grantPermission", inputs: [{ name: "agent", type: "address" }, { name: "targets", type: "address[]" }, { name: "functions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "tokenCaps", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }] }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revokePermission", inputs: [{ name: "agent", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setTokenAllowances", inputs: [{ name: "agent", type: "address" }, { name: "tokenCaps", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }] }], outputs: [], stateMutability: "nonpayable" },
  // Agent Execution
  { type: "function", name: "executeOnBehalf", inputs: [{ name: "user", type: "address" }, { name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bytes" }], stateMutability: "nonpayable" },
  { type: "function", name: "approveAndExecute", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bytes" }], stateMutability: "nonpayable" },
  { type: "function", name: "transferFromVault", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  // View Functions
  { type: "function", name: "getPermission", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "tokens", type: "address[]" }], outputs: [{ name: "", type: "tuple", components: [{ name: "allowedTargets", type: "address[]" }, { name: "allowedFunctions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "active", type: "bool" }, { name: "tokenAllowances", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }] }] }], stateMutability: "view" },
  { type: "function", name: "getTokenAllowance", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPermNonce", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getBalance", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDelegatedUsers", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  // Events
  { type: "event", name: "Deposited", inputs: [{ name: "user", type: "address", indexed: true }, { name: "token", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "Withdrawn", inputs: [{ name: "user", type: "address", indexed: true }, { name: "token", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "PermissionGranted", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "targets", type: "address[]", indexed: false }, { name: "functions", type: "bytes4[]", indexed: false }, { name: "expiry", type: "uint256", indexed: false }, { name: "tokenCaps", type: "tuple[]", indexed: false, components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }] }] },
  { type: "event", name: "PermissionRevoked", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }] },
  { type: "event", name: "TokenAllowancesUpdated", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "tokenCaps", type: "tuple[]", indexed: false, components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }] }] },
  { type: "event", name: "ExecutedOnBehalf", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "target", type: "address", indexed: false }, { name: "selector", type: "bytes4", indexed: false }, { name: "value", type: "uint256", indexed: false }] },
  { type: "event", name: "ApprovedAndExecuted", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "token", type: "address", indexed: false }, { name: "amount", type: "uint256", indexed: false }, { name: "target", type: "address", indexed: false }, { name: "selector", type: "bytes4", indexed: false }] },
  { type: "event", name: "TransferredFromVault", inputs: [{ name: "user", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "token", type: "address", indexed: false }, { name: "to", type: "address", indexed: false }, { name: "amount", type: "uint256", indexed: false }] },
] as const;
