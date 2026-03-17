// ForwardX (온체인 선물환 거래소) ABIs
// Sources: packages/forward-exchange/src/interfaces/

export const ForwardExchangeABI = [
  { type: "function", name: "createOffer", inputs: [{ name: "marketId", type: "bytes32" }, { name: "notional", type: "uint256" }, { name: "forwardRate", type: "int256" }, { name: "maturityTime", type: "uint256" }, { name: "isLong", type: "bool" }], outputs: [{ name: "longTokenId", type: "uint256" }, { name: "shortTokenId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "acceptOffer", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelOffer", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "settleFromConsumer", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getPosition", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "marketId", type: "bytes32" }, { name: "notional", type: "uint256" }, { name: "forwardRate", type: "int256" }, { name: "maturityTime", type: "uint256" }, { name: "collateral", type: "uint256" }, { name: "counterparty", type: "address" }, { name: "originalOwner", type: "address" }, { name: "isLong", type: "bool" }, { name: "settled", type: "bool" }, { name: "locked", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getPairedTokenId", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "pure" },
] as const;

export const ForwardVaultABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "freeBalance", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lockedBalance", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "positionCollateral", inputs: [{ name: "positionId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const ForwardMarketplaceABI = [
  { type: "function", name: "list", inputs: [{ name: "tokenId", type: "uint256" }, { name: "askPrice", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelListing", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "updatePrice", inputs: [{ name: "tokenId", type: "uint256" }, { name: "newPrice", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "buy", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getListing", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "seller", type: "address" }, { name: "askPrice", type: "uint256" }, { name: "listedAt", type: "uint256" }] }], stateMutability: "view" },
] as const;
