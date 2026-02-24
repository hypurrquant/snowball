// Snowball Protocol — Shared Token ABIs

export const SbUSDTokenABI = [
  // ERC20
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  // ERC20Permit
  "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "function nonces(address) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  // SbUSD-specific
  "function mint(address,uint256)",
  "function burn(address,uint256)",
  "function sendToPool(address,address,uint256)",
  "function returnFromPool(address,address,uint256)",
  "function setBranchAddresses(address,address,address,address)",
  "function setCollateralRegistry(address)",
  "function collateralRegistryAddress() view returns (address)",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const MockWCTCABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function faucet(uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
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

export const MockERC20ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function faucet(uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;
