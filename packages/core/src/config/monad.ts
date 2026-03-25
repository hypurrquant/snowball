import type { Address } from "viem";

// ─── Monad Chain ────────────────────────────────────────────────────────────
export const MONAD_CHAIN_ID = 143;
export const MONAD_TESTNET_CHAIN_ID = 10143;

// ─── Token Addresses (Mainnet) ──────────────────────────────────────────────
export const MONAD_TOKENS = {
  WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as Address,
  USDC: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as Address,
  AUSD: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a" as Address,
  WETH: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242" as Address,
  WBTC: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c" as Address,
  USDT0: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D" as Address,
  // LST tokens
  aprMON: "0x0c65A0BC65a5D819235B71F554D210D3F80E0852" as Address,
  sMON: "0xA3227C5969757783154C60bF0bC1944180ed81B9" as Address,
  shMON: "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c" as Address,
  gMON: "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081" as Address,
} as const;

// ─── Uniswap V3 (DEX, ~$60M TVL) ───────────────────────────────────────────
export const MONAD_UNISWAP = {
  factory: "0x204faca1764b154221e35c0d20abb3c525710498" as Address,
  swapRouter02: "0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900" as Address,
  quoterV2: "0x661e93cca42afacb172121ef892830ca3b70f08d" as Address,
  nonfungiblePositionManager: "0x7197e214c0b767cfb76fb734ab638e2c192f4e53" as Address,
  universalRouter: "0x0d97dc33264bfc1c226207428a79b26757fb9dc3" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  tickLens: "0xf025e0fe9e331a0ef05c2ad3c4e9c64b625cda6f" as Address,
} as const;

// ─── Morpho (Permissionless Isolated Lending, ~$90M TVL) ────────────────────
export const MONAD_MORPHO = {
  morpho: "0xD5D960E8C380B724a48AC59E2DfF1b2CB4a1eAee" as Address,
  adaptiveCurveIRM: "0x09475a3D6eA8c314c592b1a3799bDE044E2F400F" as Address,
  chainlinkOracleV2Factory: "0xC8659Bcd5279DB664Be973aEFd752a5326653739" as Address,
  metaMorphoFactory: "0x33f20973275B2F574488b18929cd7DCBf1AbF275" as Address,
  publicAllocator: "0xfd70575B732F9482F4197FE1075492e114E97302" as Address,
  preLiquidationFactory: "0xB5b3e541abD19799E0c65905a5a42BD37d6c94c0" as Address,
  v2: {
    vaultFactory: "0x8B2F922162FBb60A6a072cC784A2E4168fB0bb0c" as Address,
    registry: "0x6a42f8b46224baA4DbBBc2F860F4F3080768a6d2" as Address,
  },
  bundler3: "0x82b684483e844422FD339df0b67b3B111F02c66E" as Address,
  generalAdapter1: "0x725AB8CAd931BCb80Fdbf10955a806765cCe00e5" as Address,
} as const;

// ─── Curve (StableSwap DEX, ~$21M TVL) ──────────────────────────────────────
export const MONAD_CURVE = {
  router: "0xFF5Cb29241F002fFeD2eAa224e3e996D24A6E8d1" as Address,
  addressProvider: "0x4574921eb950d3Fd5B01562162EC566Cb8bc3648" as Address,
  metaRegistry: "0xe6dA14500f0b5783E2325F9C5a7eE5d99DA0fB42" as Address,
  stableswapFactory: "0x8271e06E5887FE5ba05234f5315c19f3Ec90E8aD" as Address,
  twocryptoFactory: "0xe7FBd704B938cB8fe26313C3464D4b7B7348c88C" as Address,
  tricryptoFactory: "0x6E28493348446503db04A49621d8e6C9A40015FB" as Address,
  depositAndStakeZap: "0xB2Be7692B07b640C9f2ee1187cee2fAec741F872" as Address,
} as const;

// ─── Kuru Exchange (CLOB + AMM Hybrid DEX, ~$1.2M TVL) ─────────────────────
export const KURU = {
  flowEntrypoint: "0xb3e6778480b2E488385E8205eA05E20060B813cb" as Address,
  flowRouter: "0x0d3a1BE29E9dEd63c7a5678b31e847D68F71FFa2" as Address,
  forwarder: "0x974E61BBa9C4704E8Bcc1923fdC3527B41323FAA" as Address,
  marginAccount: "0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5" as Address,
  router: "0xd651346d7c789536ebf06dc72aE3C8502cd695CC" as Address,
} as const;

// ─── Curvance (ERC-4626 Vault Lending, ~$58M TVL) ──────────────────────────
export const CURVANCE = {
  centralRegistry: "0x1310f352f1389969Ece6741671c4B919523912fF" as Address,
  daoTimelock: "0x2677738657F27e1A3591E00AD7E5a78807688C08" as Address,
  oracleManager: "0x32faD39e79FAC67f80d1C86CbD1598043e52CDb6" as Address,
  protocolReader: "0x878cDfc2F3D96a49A5CbD805FAF4F3080768a6d2" as Address,
  markets: {
    aprMON: { manager: "0x5EA0a1Cf3501C954b64902c5e92100b8A2CaB1Ac" as Address, cToken: "0xD9E2025b907E95EcC963A5018f56B87575B4aB26" as Address, cWMON: "0xF32B334042DC1EB9732454cc9bc1a06205d184f2" as Address },
    shMON: { manager: "0xE1C24B2E93230FBe33d32Ba38ECA3218284143e2" as Address, cToken: "0x926C101Cf0a3dE8725Eb24a93E980f9FE34d6230" as Address, cWMON: "0x0fcEd51b526BfA5619F83d97b54a57e3327eB183" as Address },
    sMON: { manager: "0xe5970cDB1916B2cCF6185C86C174EEE2d330D05B" as Address, cToken: "0x494876051B0E85dCe5ecd5822B1aD39b9660c928" as Address, cWMON: "0xebE45A6ceA7760a71D8e0fa5a0AE80a75320D708" as Address },
    gMON: { manager: "0xb00aFF53a4Df2b4E2f97a3d9ffaDb55564C8E42F" as Address, cToken: "0x5ca6966543c0786f547446234492D2F11C82f11f" as Address, cWMON: "0xf473568b26B8C5aadCa9fbC0eA17E1728d5ec925" as Address },
  },
} as const;

// ─── Neverland (Aave V3 Fork, ~$116M peak TVL) ─────────────────────────────
export const NEVERLAND = {
  pool: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585" as Address,
  poolAddressesProvider: "0x49D75170F55C964dfdd6726c74fdEDEe75553A0f" as Address,
  poolDataProvider: "0xfd0b6b6F736376F7B99ee989c749007c7757fDba" as Address,
  aclManager: "0x73A78AFa04b629e22db3BEC357bfc4a8B4f149DF" as Address,
  oracle: "0x94bbA11004B9877d13bb5E1aE29319b6f7bDEdD4" as Address,
  wrappedTokenGateway: "0x800409dBd7157813BB76501c30e04596Cc478f25" as Address,
  DUST: "0xAD96C3dffCD6374294e2573A7fBBA96097CC8d7c" as Address,
} as const;

// ─── Upshift (Multi-strategy Yield, ~$82M TVL) ─────────────────────────────
export const UPSHIFT = {
  earnAUSD: "0x36eDbF0C834591BFdfCaC0Ef9605528c75c406aA" as Address,
} as const;

// ─── Legacy aliases ─────────────────────────────────────────────────────────
export const EULER = {
  pool: "0x0000000000000000000000000000000000000000" as Address,
} as const;

export const AMBIENT = {
  crocSwapDex: "0x0000000000000000000000000000000000000000" as Address,
} as const;
