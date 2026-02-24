// Snowball Lend — Morpho Blue fork ABIs (GPL-2.0-or-later)

export const SnowballLendABI = [
  // View functions
  "function owner() view returns (address)",
  "function feeRecipient() view returns (address)",
  "function isIrmEnabled(address) view returns (bool)",
  "function isLltvEnabled(uint256) view returns (bool)",
  "function isAuthorized(address,address) view returns (bool)",
  "function supplyShares(bytes32,address) view returns (uint256)",
  "function borrowShares(bytes32,address) view returns (uint256)",
  "function collateral(bytes32,address) view returns (uint256)",
  "function market(bytes32) view returns (uint128,uint128,uint128,uint128,uint128,uint128)",
  "function idToMarketParams(bytes32) view returns (address,address,address,address,uint256)",
  "function marketId(address,address,address,address,uint256) pure returns (bytes32)",
  // Admin functions
  "function setOwner(address)",
  "function setFeeRecipient(address)",
  "function enableIrm(address)",
  "function enableLltv(uint256)",
  "function setFee(bytes32,uint256)",
  "function setAuthorization(address,bool)",
  // Market functions
  "function accrueInterest(bytes32)",
  "function createMarket((address,address,address,address,uint256)) returns (bytes32)",
  "function supply(bytes32,uint256,uint256,address,bytes) returns (uint256,uint256)",
  "function withdraw(bytes32,uint256,uint256,address,address) returns (uint256,uint256)",
  "function borrow(bytes32,uint256,uint256,address,address) returns (uint256,uint256)",
  "function repay(bytes32,uint256,uint256,address,bytes) returns (uint256,uint256)",
  "function supplyCollateral(bytes32,uint256,address,bytes)",
  "function withdrawCollateral(bytes32,uint256,address,address)",
  "function liquidate(bytes32,address,uint256,uint256,bytes) returns (uint256,uint256)",
  // Events
  "event CreateMarket(bytes32 indexed id, (address,address,address,address,uint256) marketParams)",
  "event Supply(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares)",
  "event Withdraw(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares)",
  "event Borrow(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares)",
  "event Repay(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares)",
  "event SupplyCollateral(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets)",
  "event WithdrawCollateral(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets)",
  "event Liquidate(bytes32 indexed id, address indexed caller, address indexed borrower, uint256 repaidAssets, uint256 repaidShares, uint256 seizedAssets, uint256 badDebtAssets, uint256 badDebtShares)",
  "event SetOwner(address indexed newOwner)",
  "event SetFeeRecipient(address indexed newFeeRecipient)",
  "event EnableIrm(address indexed irm)",
  "event EnableLltv(uint256 lltv)",
  "event SetFee(bytes32 indexed id, uint256 newFee)",
  "event SetAuthorization(address indexed caller, address indexed authorized, bool newIsAuthorized)",
  "event AccrueInterest(bytes32 indexed id, uint256 prevBorrowRate, uint256 interest, uint256 feeShares)",
] as const;

export const AdaptiveCurveIRMABI = [
  "function rateAtTarget(bytes32) view returns (int256)",
  "function borrowRate(bytes32,uint256,uint256,uint256) returns (uint256)",
  "function borrowRateView(bytes32,uint256,uint256) view returns (uint256)",
  "event BorrowRateUpdate(bytes32 indexed id, uint256 avgBorrowRate, int256 rateAtTarget)",
] as const;

export const MockOracleABI = [
  "function price() view returns (uint256)",
  "function owner() view returns (address)",
  "function setPrice(uint256)",
  "function getPrice() view returns (uint256)",
  "event PriceUpdated(uint256 newPrice)",
] as const;

export const SnowballVaultFactoryABI = [
  "function snowballLend() view returns (address)",
  "function createVault(address,uint256,address,string,string,bytes32) returns (address)",
  "event CreateVault(address indexed vault, address indexed initialOwner, uint256 initialTimelock, address indexed asset, string name, string symbol)",
] as const;

export const SnowballVaultABI = [
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function curator() view returns (address)",
  "function allocator() view returns (address)",
  "function timelock() view returns (uint256)",
  "function fee() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function supplyQueue(uint256) view returns (bytes32)",
  "function marketCap(bytes32) view returns (uint256)",
  "function deposit(uint256,address) returns (uint256)",
  "function mint(uint256,address) returns (uint256)",
  "function withdraw(uint256,address,address) returns (uint256)",
  "function redeem(uint256,address,address) returns (uint256)",
  "function previewDeposit(uint256) view returns (uint256)",
  "function previewMint(uint256) view returns (uint256)",
  "function previewWithdraw(uint256) view returns (uint256)",
  "function previewRedeem(uint256) view returns (uint256)",
  "function setCurator(address)",
  "function setAllocator(address)",
  "function setSupplyQueue(bytes32[])",
  "function setMarketCap(bytes32,uint256)",
  "function setFee(uint256)",
  "function setFeeRecipient(address)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event SetCurator(address indexed curator)",
  "event SetAllocator(address indexed allocator)",
  "event SetSupplyQueue(bytes32[] newSupplyQueue)",
  "event SetMarketCap(bytes32 indexed id, uint256 newCap)",
] as const;

export const PublicAllocatorABI = [
  "function snowballLend() view returns (address)",
  "function flowCaps(address,bytes32) view returns (uint128 maxIn, uint128 maxOut)",
  "function setFlowCaps(address,bytes32,uint128,uint128)",
  "function reallocate(address,bytes32,bytes32,uint256)",
  "event SetFlowCaps(address indexed vault, bytes32 indexed id, uint128 maxIn, uint128 maxOut)",
  "event PublicReallocation(address indexed vault, bytes32 indexed from, bytes32 indexed to, uint256 assets)",
] as const;
