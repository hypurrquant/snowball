export const SnowballYieldVaultABI = [
    // View
    { type: "function", name: "want", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { type: "function", name: "balance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "available", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "getPricePerFullShare", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "strategy", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
    { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
    { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
    // Approve
    { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    // Mutate
    { type: "function", name: "deposit", inputs: [{ name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "depositAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "withdraw", inputs: [{ name: "_shares", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "withdrawAll", inputs: [], outputs: [], stateMutability: "nonpayable" },
    // Events
    { type: "event", name: "Transfer", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
] as const;

export const SnowballStrategyABI = [
    { type: "function", name: "balanceOf", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "balanceOfPool", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "balanceOfWant", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "lockedProfit", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "lastHarvest", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
    { type: "function", name: "withdrawFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "rewardsAvailable", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "harvest", inputs: [], outputs: [], stateMutability: "nonpayable" },
] as const;

export const ERC20ApproveABI = [
    { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
    { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
