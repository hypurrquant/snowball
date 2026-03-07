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
    agentVault: "0x7d3f7e6bde481e3260f5bebfcd9490315d99e3ed" as Address,
  },
} as const;

// ─── Morpho (Lend) ───
export const LEND = {
  snowballLend: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
  adaptiveCurveIRM: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
  vaultFactory: "0x6e97df392462b8c2b8d13e2cd77a90168925edf6" as Address,
  publicAllocator: "0x35b35a8c835eaf78b43137a51c4adccfc5d653b4" as Address,
  oracles: {
    wCTC: "0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2" as Address,
    lstCTC: "0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a" as Address,
    sbUSD: "0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a" as Address,
  },
  markets: [
    {
      id: "0x8dce00fbd59450e4d2f46e9aa637690fc21c058c4c8abf4dea75e9ab2ce38364" as `0x${string}`,
      name: "wCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.wCTC,
      loanSymbol: "sbUSD",
      collSymbol: "wCTC",
      lltv: 770000000000000000n, // 0.77
    },
    {
      id: "0x93c1cf16ce13082a758d11757a899388741c39c4ed01364116137074fc9671ae" as `0x${string}`,
      name: "lstCTC / sbUSD",
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.lstCTC,
      loanSymbol: "sbUSD",
      collSymbol: "lstCTC",
      lltv: 770000000000000000n,
    },
    {
      id: "0x6708534b3aa0dc0b77dd4e534187d801f664958238b45b0563e63dbfe914fddd" as `0x${string}`,
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
      address: "0xd91035c1c48bd28dc7072f78a0b6a9adf55a38cd" as Address,
      strategy: "0x282d87f4e4f20ad2d38d8570a76b72f8031ac88d" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: "0x8076a963a86daa86ee8f0929c03d075e2bd62ccf" as Address,
      strategy: "0x5c3f1b8d16abb5114f08ed7d9c6aa2ab425fcfdb" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: "0x5796211d1e317ca07f4f5315b8a47f2f9eb433ea" as Address,
      strategy: "0xd61fc96c85f39199abdee0db5f8676c794620bc9" as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: "0xb5fd93247f0fd8cbf3b8db7963e699e35bc79b97" as Address,
      strategy: "0xb76d6fbc6403d4890202e9c6cd39cecd078ac734" as Address,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC 공급 이자",
    },
  ],
} as const;

// ─── ERC-8004 (Agent) ───
export const ERC8004 = {
  identityRegistry: "0x993C9150f074435BA79033300834FcE06897de9B" as Address,
  reputationRegistry: "0x3E5E194e39b777F568c9a261f46a5DCC43840726" as Address,
  validationRegistry: "0x84b9B2121187155C1c85bA6EA34e35c981BbA023" as Address,
  agentVault: "0x7d3f7e6bde481e3260f5bebfcd9490315d99e3ed" as Address,
} as const;

// Backend API constants are in apps/web (process.env is Next.js-specific)
