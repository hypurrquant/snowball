import type { Address } from "viem";

// ─── Network ───
export const CHAIN_ID = 102031;
export const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
export const EXPLORER_URL = "https://creditcoin-testnet.blockscout.com";

// ─── Tokens ───
export const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
} as const;

export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number; mockPriceUsd: number }> = {
  [TOKENS.wCTC]: { symbol: "wCTC", name: "Wrapped CTC", decimals: 18, mockPriceUsd: 5.00 },
  [TOKENS.lstCTC]: { symbol: "lstCTC", name: "Liquid Staked CTC", decimals: 18, mockPriceUsd: 5.20 },
  [TOKENS.sbUSD]: { symbol: "sbUSD", name: "Snowball USD", decimals: 18, mockPriceUsd: 1.00 },
  [TOKENS.USDC]: { symbol: "USDC", name: "Mock USDC", decimals: 18, mockPriceUsd: 1.00 },
};

// ─── DEX (Uniswap V3) ───
export const DEX = {
  factory: "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address,
  swapRouter: "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address,
  nonfungiblePositionManager: "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address,
  quoterV2: "0x2383343c2c7ae52984872f541b8b22f8da0b419a" as Address,
} as const;

// ─── Liquity (Borrow / Earn) ───
export const LIQUITY = {
  branches: {
    wCTC: {
      addressesRegistry: "0x7cfed108ed84194cf37f93d47268fbdd14da73d2" as Address,
      borrowerOperations: "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address,
      troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
      stabilityPool: "0xf1654541efb7a3c34a9255464ebb2294fa1a43f3" as Address,
      activePool: "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address,
      defaultPool: "0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404" as Address,
      gasPool: "0x4aa86795705a604e3dac4cfe45c375976eca3189" as Address,
      collSurplusPool: "0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111" as Address,
      troveNFT: "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address,
      sortedTroves: "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address,
      priceFeed: "0xca9341894230b84fdff429ff43e83cc8f8990342" as Address,
    },
    lstCTC: {
      addressesRegistry: "0x0afe1c58a76c49d62bd7331f309aa14731efb1fc" as Address,
      borrowerOperations: "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca" as Address,
      troveManager: "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address,
      stabilityPool: "0xec700d805b5de3bf988401af44b1b384b136c41b" as Address,
      activePool: "0xa57cca34198bf262a278da3b2b7a8a5f032cb835" as Address,
      defaultPool: "0x6ed045c0cadc55755dc09f1bfee0f964baf1f859" as Address,
      gasPool: "0x31d560b7a74b179dce8a8017a1de707c32dd67da" as Address,
      collSurplusPool: "0xa287db89e552698a118c89d8bbee25bf51a0ec33" as Address,
      troveNFT: "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8" as Address,
      sortedTroves: "0x25aa78c7b0dbc736ae23a316ab44579467ba9507" as Address,
      priceFeed: "0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08" as Address,
    },
  },
  shared: {
    collateralRegistry: "0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59" as Address,
    hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
    multiTroveGetter: "0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6" as Address,
    redemptionHelper: "0x8baf58113f968b4dfb2916290b57ce3ae114fb77" as Address,
    debtInFrontHelper: "0x9fd6116fc1d006fa1d8993746ac1924f16d722bb" as Address,
    agentVault: "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address,
  },
} as const;

// ─── Morpho (Lend) ───
export const LEND = {
  snowballLend: "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address,
  adaptiveCurveIRM: "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address,
  oracles: {
    wCTC: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
    lstCTC: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31" as Address,
    sbUSD: "0xf82396f39e93d77802bfecc33344faafc4df50f2" as Address,
  },
  markets: [
    {
      id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
      name: "wCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.wCTC,
      loanSymbol: "sbUSD",
      collSymbol: "wCTC",
      lltv: 770000000000000000n, // 0.77
    },
    {
      id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e" as `0x${string}`,
      name: "lstCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.lstCTC,
      loanSymbol: "sbUSD",
      collSymbol: "lstCTC",
      lltv: 770000000000000000n,
    },
    {
      id: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c" as `0x${string}`,
      name: "sbUSD / USDC",
      loanToken: TOKENS.USDC,
      collateralToken: TOKENS.sbUSD,
      loanSymbol: "USDC",
      collSymbol: "sbUSD",
      lltv: 900000000000000000n,
    },
  ],
} as const;

// ─── Options ───
export const OPTIONS = {
  clearingHouse: "0xd999f043760b4a372c57645e0c2daab3ce81b741" as Address,
  vault: "0x7745cc64ff8ec8923876c9fe062d347f2fa78079" as Address,
  engine: "0x595ed79d89623158d486a1a0daada35669ccc352" as Address,
  relayer: "0xe58f9cdb8ec63b88759bde403de0e062382f13b1" as Address,
  oracle: "0xcfad30e844685abb5ae1e8c21f727afd23f46abc" as Address,
} as const;

// ─── Yield Vaults (Beefy V7 Fork) ───
export const YIELD = {
  vaults: [
    {
      address: "0x40a8b5b8a6c1e4236da10da2731944e59444c179" as Address,
      strategy: "0x342c8a3385341b07111bbf1a73aac48cdda32917" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Auto-compound Liquity liquidation gains",
      strategyType: "stabilityPool" as const,
    },
    {
      address: "0x384ebff116bb8458628b62624ab9535a4636a397" as Address,
      strategy: "0x9176910f4c9dc7a868d5e6261fd651f98d7cc0c3" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD supply interest",
      strategyType: "morpho" as const,
      morphoMarketId: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
    },
    {
      address: "0x766c8bf45d7a7356f63e830c134c07911b662757" as Address,
      strategy: "0x241f5661d6db304434dfc48dab75f1c5be63404a" as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC supply interest",
      strategyType: "morpho" as const,
      morphoMarketId: "0xdb8d70912f854011992e1314b9c0837bf14e7314dccb160584e3b7d24d20f6bd" as `0x${string}`,
    },
    {
      address: "0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7" as Address,
      strategy: "0xcdb7a9fb0040d2631f4cd212601838d195e8d08b" as Address,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC supply interest",
      strategyType: "morpho" as const,
      morphoMarketId: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c" as `0x${string}`,
    },
  ],
} as const;

// ─── Bridge (DN Crosschain) ───
export const BRIDGE = {
  // CC Testnet (102031)
  bridgeVault: "0x06961ab735f87486c538d840d0f54d3f6518cd78" as Address,
  // Sepolia (11155111)
  sepoliaDNToken: "0xa6722586d0f1cfb2a66725717ed3b99f609cb39b" as Address,
  // USC Testnet (102036)
  dnBridgeUSC: "0x4fE881D69fB10b8bcd2009D1BC9684a609B29270" as Address,
} as const;

// ─── ERC-8004 (Agent) ───
export const ERC8004 = {
  identityRegistry: "0x993C9150f074435BA79033300834FcE06897de9B" as Address,
  reputationRegistry: "0x3E5E194e39b777F568c9a261f46a5DCC43840726" as Address,
  validationRegistry: "0x84b9B2121187155C1c85bA6EA34e35c981BbA023" as Address,
  agentVault: "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address,
  agentEOA: "0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6" as Address,
  defaultAgentId: 1n,
} as const;

// ─── Aave V3 ───
export const AAVE = {
  pool: "0xff74e97255d2ecd04572f68ee8f38da10f984638" as Address,
  poolAddressesProvider: "0x72ef92fc52a722305aca5485eb144392d4676220" as Address,
  poolConfigurator: "0xa59e069d323ad2bf716f10b28e4fb712c3ce8b2e" as Address,
  aclManager: "0x75a40a2d75497927ccc4fe856f1eb4405bf0b990" as Address,
  oracle: "0x3889372de9e6bb5b58c11812859d1a7c688e9492" as Address,
  dataProvider: "0xb5e57b1208a4b35f3b60a95d0dd70dc058a87b2c" as Address,
  markets: [
    { symbol: "wCTC", underlying: TOKENS.wCTC, decimals: 18, ltv: 65, liquidationThreshold: 75, reserveFactor: 10 },
    { symbol: "lstCTC", underlying: TOKENS.lstCTC, decimals: 18, ltv: 70, liquidationThreshold: 80, reserveFactor: 10 },
    { symbol: "sbUSD", underlying: TOKENS.sbUSD, decimals: 18, ltv: 80, liquidationThreshold: 85, reserveFactor: 10 },
    { symbol: "USDC", underlying: TOKENS.USDC, decimals: 18, ltv: 80, liquidationThreshold: 85, reserveFactor: 10 },
  ],
} as const;

// ─── ForwardX (온체인 선물환) ───
export const FORWARD = {
  exchange: "0x021262d1dd684c4163bb3279635bc04ccbdb8721" as Address,
  vault: "0x8b40cf14d2af490482709fe4c54778c0b36724d5" as Address,
  marketplace: "0x17b6c56f9ced65c9ce273bd876407f4db67b50f8" as Address,
  settlementEngine: "0x2ec339e1f0fbd2aeace9d899e3e04aa666201e89" as Address,
  consumer: "0x112b58c47ff1445422356238ddca5a8a6eb7bd66" as Address,
  oracleGuard: "0x202e162a0489d4b750ca3db293b788c4b533be8d" as Address,
  viewHelper: "0x604985b488cfeacf76106a329fa09e13a9d26b59" as Address,
  positionNFT: "0x021262d1dd684c4163bb3279635bc04ccbdb8721" as Address, // Forward is the ERC721
  collateralToken: TOKENS.USDC,
  markets: [
    { id: "0x45c5ae8ce2fdd70d24d0133747983d5ed2e0bc1e40042884ff8e1c4ac7aea89e" as `0x${string}`, name: "USD/KRW", pair: "USD/KRW" },
    { id: "0x35b8bafff3570683af968b8d36b91b1a19465141d9712425e9f76c68ff8cb152" as `0x${string}`, name: "USD/JPY", pair: "USD/JPY" },
  ],
} as const;

// ─── SnowballStaker (LP Incentives) ───
export const STAKER = {
  snowballStaker: "0x1bea0762c858e56f9aace66280bd713ad17da287" as Address,
  maxIncentiveStartLeadTime: 2592000, // 30 days
  maxIncentiveDuration: 63072000, // ~2 years
} as const;

// ─── Multicall3 ───
export const MULTICALL3 = "0x85eae284523c979424e431cc2e13e4be3d040527" as Address;

// Backend API constants are in apps/web (process.env is Next.js-specific)
