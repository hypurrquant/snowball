import type { Address } from "viem";

// ─── Network ───
export const CHAIN_ID = 102031;
export const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
export const EXPLORER_URL = "https://creditcoin-testnet.blockscout.com";

// ─── Tokens ───
export const TOKENS = {
  wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address,
  lstCTC: "0x72968ff9203dc5f352c5e42477b84d11c8c8f153" as Address,
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
  USDC: "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed" as Address,
} as const;

export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number }> = {
  [TOKENS.wCTC]: { symbol: "wCTC", name: "Wrapped CTC", decimals: 18 },
  [TOKENS.lstCTC]: { symbol: "lstCTC", name: "Liquid Staked CTC", decimals: 18 },
  [TOKENS.sbUSD]: { symbol: "sbUSD", name: "Snowball USD", decimals: 18 },
  [TOKENS.USDC]: { symbol: "USDC", name: "Mock USDC", decimals: 18 },
};

// ─── DEX (Algebra V4 Integral) ───
export const DEX = {
  snowballFactory: "0x04dca03a979b2ad38ee964e8d32c9d36c1301040" as Address,
  snowballPoolDeployer: "0x71f39dc01dce21358e0733a9981f4b5010312dbb" as Address,
  snowballRouter: "0x151211ea233c72d466e7c159bf07673771164e4e" as Address,
  dynamicFeePlugin: "0x962267ce45eeef519212243fe8d954b951e31f2c" as Address,
  nonfungiblePositionManager: "0x16534c66e4249ac8cd39a8c91cc80d3f0389a71f" as Address,
  quoterV2: "0x36bab7a5dcfb2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b077" as Address,
} as const;

// ─── Liquity (Borrow / Earn) ───
export const LIQUITY = {
  branches: {
    wCTC: {
      addressesRegistry: "0xd5bd51f411e8472ddc3632e7d9bf3ddff44225ce" as Address,
      borrowerOperations: "0xe8285b406dc77d16c193e6a1a2b8ecc1f386602c" as Address,
      troveManager: "0x30ef6615f01be4c9fea06c33b07432b40cab7bdc" as Address,
      stabilityPool: "0x91c9983499f257015597d756108efdf26746db81" as Address,
      activePool: "0xad3a046f1db8f648d2641c34a2dfff72b9c39bde" as Address,
      troveNFT: "0x51b7b40ded97cffd01b448402c8802b839942e9b" as Address,
      sortedTroves: "0x749f4111b67b7f770d2e43187d6433b470c2b3ad" as Address,
      priceFeed: "0x17a36a4d4dbda9aa3f9ba3d12e0a4bfc9533c96c" as Address,
    },
    lstCTC: {
      addressesRegistry: "0x5f407d42b3cd83a5bbb70c09726d8a8ebd2c866c" as Address,
      borrowerOperations: "0x34f36f41f912e29c600733d90a4d210a49718a5d" as Address,
      troveManager: "0xda7b322d26b3477161dc80282d1ea4d486528232" as Address,
      stabilityPool: "0x2bcdc50ec56a9d3b9e35427fbc70e11e4de0c3a2" as Address,
      activePool: "0xad1c8b7ab9d44db1e3ac39e756eea1f78d9dc9c6" as Address,
      troveNFT: "0xc2e0c3979cff7c8dea36ddaa3ece05f7e5a0f12f" as Address,
      sortedTroves: "0x53c4e99c7e46b0e47fa4df7aa6e10b7e4a5ccf38" as Address,
      priceFeed: "0x5f97ceb4c17b90b6e04f17d08e2a9e0d97d59d95" as Address,
    },
  },
  shared: {
    collateralRegistry: "0xb18f7a1944e905739e18f96d6e60427aab93c23d" as Address,
    hintHelpers: "0x7e8fa8852b0c1d697905fd7594d30afe693c76bb" as Address,
    multiTroveGetter: "0x8376dfa413a536075e23c706affbd6370ec7d380" as Address,
    agentVault: "0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40" as Address,
  },
} as const;

// ─── Morpho (Lend) ───
export const LEND = {
  snowballLend: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
  adaptiveCurveIRM: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
  vaultFactory: "0x6e97df392462b8c2b8d13e2cd77a90168925edf6" as Address,
  publicAllocator: "0x35b35a8c835eaf78b43137a51c4adccfc5d653b4" as Address,
  oracles: {
    wCTC: "0x42ca12a83c14e95f567afc940b0118166d8bd852" as Address,
    lstCTC: "0x192f1feb36f319e79b3bba25a17359ee72266a14" as Address,
    sbUSD: "0xc39f222e034f4bd4f3c858e6fde9ce4398400a26" as Address,
  },
  markets: [
    {
      id: "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261" as `0x${string}`,
      name: "wCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.wCTC,
      loanSymbol: "sbUSD",
      collSymbol: "wCTC",
      lltv: 770000000000000000n, // 0.77
    },
    {
      id: "0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e" as `0x${string}`,
      name: "lstCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.lstCTC,
      loanSymbol: "sbUSD",
      collSymbol: "lstCTC",
      lltv: 770000000000000000n,
    },
    {
      id: "0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681" as `0x${string}`,
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

// ─── ERC-8004 (Agent) ───
export const ERC8004 = {
  identityRegistry: "0x993C9150f074435BA79033300834FcE06897de9B" as Address,
  reputationRegistry: "0x3E5E194e39b777F568c9a261f46a5DCC43840726" as Address,
  validationRegistry: "0x84b9B2121187155C1c85bA6EA34e35c981BbA023" as Address,
} as const;

// ─── Backend API ───
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE || "http://localhost:3002/api";
