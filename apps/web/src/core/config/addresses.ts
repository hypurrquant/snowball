import type { Address } from "viem";

// ─── Network ───
export const CHAIN_ID = 102031;
export const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
export const EXPLORER_URL = "https://creditcoin-testnet.blockscout.com";

// ─── Tokens ───
export const TOKENS = {
  wCTC: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address,
  lstCTC: "0x47ad69498520edb2e1e9464fedf5309504e26207" as Address,
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
  USDC: "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as Address,
} as const;

export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number; mockPriceUsd: number }> = {
  [TOKENS.wCTC]: { symbol: "wCTC", name: "Wrapped CTC", decimals: 18, mockPriceUsd: 2.50 },
  [TOKENS.lstCTC]: { symbol: "lstCTC", name: "Liquid Staked CTC", decimals: 18, mockPriceUsd: 2.60 },
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
      stabilityPool: "0x353f40353453f123f9073f117956e8fdf324e977" as Address,
      activePool: "0x94e0d44e8b03782f7616a3488b4f973d7f76b6a4" as Address,
      troveNFT: "0x32da60f2b720e67889c4a2722ae881c99c2dc281" as Address,
      sortedTroves: "0x645b38f477ea61bd71072face0892021208b8d49" as Address,
      priceFeed: "0x702121516551b72f7f1ee77906b2488bd8d2eb0a" as Address,
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
  agentVault: "0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40" as Address,
} as const;

// ─── Backend API ───
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE || "http://localhost:3002/api";
