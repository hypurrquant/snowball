import type { Address } from "viem";

// ─── HyperEVM Chain ─────────────────────────────────────────────────────────
export const HYPEREVM_CHAIN_ID = 999;

// ─── Token Addresses ────────────────────────────────────────────────────────
export const HYPEREVM_TOKENS = {
  WHYPE: "0x5555555555555555555555555555555555555555" as Address,
  stHYPE: "0xfFaa4a3D97fE9107Cef8a3F48c069F577Ff76cC1" as Address,
  wstHYPE: "0x94e8396e0869c9F2200760aF0621aFd240E1CF38" as Address,
  kHYPE: "0xfD739d4e423301CE9385c1fb8850539D657C296D" as Address,
  USDC: "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as Address,
  USDT0: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" as Address,
  USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34" as Address,
  UBTC: "0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463" as Address,
  UETH: "0xBe6727B535545C67d5cAa73dEa54865B92CF7907" as Address,
  feUSD: "0x02c6a2fa58cc01a18b8d9e00ea48d65e4df26c70" as Address,
} as const;

// ─── HyperLend (Aave V3.2 + FraxLend V3 Fork, ~$650M TVL) ─────────────────
export const HYPERLEND = {
  pool: "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b" as Address,
  poolAddressesProvider: "0x72c98246a98bFe64022a3190e7710E157497170C" as Address,
  oracle: "0xC9Fb4fbE842d57EAc1dF3e641a281827493A630e" as Address,
  poolConfigurator: "0x8CB4310dD38F6fD59388C9DE225f328092bdC379" as Address,
  protocolDataProvider: "0x5481bf8d3946E6A3168640c1D7523eB59F055a29" as Address,
  wrappedTokenGateway: "0x49558c794ea2aC8974C9F27886DDfAa951E99171" as Address,
  rewardsController: "0x2aF0d6754A58723c50b5e73E45D964bFDD99fE2F" as Address,
  ui: {
    poolDataProvider: "0x3Bb92CF81E38484183cc96a4Fb8fBd2d73535807" as Address,
    incentiveDataProvider: "0xD47dc1F30994539B3fA000C70bB5E5D0bE203b54" as Address,
    walletBalanceProvider: "0x99478e5c8d0597730844Fd93dB8AB4723b96e149" as Address,
  },
  isolated: {
    pairDeployer: "0xD5B33d3c6e750A51fd4E90dbf4AFa2586E33d02c" as Address,
    pairRegistry: "0xf55AF86c9EC3a7d5fa6367c00a120E6B262f718d" as Address,
  },
  looping: {
    strategyManagerFactory: "0xc3Ed646181Ca80562e96d9e6CF4AF317d22F34b0" as Address,
    loopingHelper: "0x2f5F23ED499ABcDef7116f75e3365C553D2b4913" as Address,
  },
  markets: [
    { symbol: "wHYPE", underlying: "0x5555555555555555555555555555555555555555" as Address, hToken: "0x0D745EAA9E70bb8B6e2a0317f85F1d536616bD34" as Address, debtToken: "0x747d0d4Ba0a2083651513cd008deb95075683e82" as Address, decimals: 18 },
    { symbol: "USDT0", underlying: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" as Address, hToken: "0x10982ad645D5A112606534d8567418Cf64c14cB5" as Address, debtToken: "0x1EF897622D62335e7FC88Fb0605FbBa28eC0b01d" as Address, decimals: 6 },
    { symbol: "USDC", underlying: "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as Address, hToken: "0x744E4f26ee30213989216E1632D9BE3547C4885b" as Address, debtToken: "0xD612513cB3b2C52abCD6d4b338374C09AdA4657d" as Address, decimals: 6 },
    { symbol: "USDe", underlying: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34" as Address, hToken: "0x333819c04975554260AaC119948562a0E24C2bd6" as Address, debtToken: "0x1EFA0f7A12cEF73e23dE30b7013a252231Ea50f9" as Address, decimals: 18 },
    { symbol: "UBTC", underlying: "0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463" as Address, hToken: "0xd2012c6DfF7634f9513A56a1871b93e4505EA851" as Address, debtToken: "0xE16a14972bcDE3f9Bd637502C86384533F27DA07" as Address, decimals: 8 },
    { symbol: "UETH", underlying: "0xBe6727B535545C67d5cAa73dEa54865B92CF7907" as Address, hToken: "0xdBA3B25643C11be9BDF457D6b3926992A735c523" as Address, debtToken: "0x14E10FA4E016183a024c74ACF539bb875c54e70C" as Address, decimals: 18 },
    { symbol: "wstHYPE", underlying: "0x94e8396e0869c9F2200760aF0621aFd240E1CF38" as Address, hToken: "0x0Ab8AAE3335Ed4B373A33D9023b6A6585b149D33" as Address, debtToken: "0x45686A849e77CCb909F5d575F51C372bf26103D6" as Address, decimals: 18 },
    { symbol: "sUSDe", underlying: "0xf6ba4169e1a1B467D32B8884C4B42de6454B4E4f" as Address, hToken: "0xf6ba4169e1a1B467D32B8884C4B42de6454B4E4f" as Address, debtToken: "0x044388Eed86eF67c126Db5A66428F30797B0ABF5" as Address, decimals: 18 },
    { symbol: "kHYPE", underlying: "0xfD739d4e423301CE9385c1fb8850539D657C296D" as Address, hToken: "0xa55DE93CDE5A34c5521B7584022846829CB74366" as Address, debtToken: "0x185697d814330430b8D4B3121fAB9c811B59798D" as Address, decimals: 18 },
  ],
} as const;

// ─── Felix (Liquity V2 Fork — feUSD CDP + Morpho Blue, ~$1B+ TVL) ──────────
export const FELIX = {
  feUSD: "0x02c6a2fa58cc01a18b8d9e00ea48d65e4df26c70" as Address,
  collateralRegistry: "0x9de1e57049c475736289cb006212f3e1dce4711b" as Address,
  hintHelpers: "0xa32e89c658f7fdcc0bdb2717f253bacd99f864d4" as Address,
  multiTroveGetter: "0x708809ac6ac45ba95532c961fd46228fa6dd761e" as Address,
  metadataNFT: "0x23cd9747f12ee09c55172e3716b3cfd995edef14" as Address,
  curvePool: "0xF593aE314749d0c92B450F0a13E7e1791f352bB7" as Address,
  morphoBlueCore: "0x68e37de8d93d3496ae143f2e900490f6280c57cd" as Address,
  vanilla: {
    USDe: "0x835febf893c6dddee5cf762b0f8e31c5b06938ab" as Address,
    USDT0: "0xfc5126377f0efc0041c0969ef9ba903ce67d151e" as Address,
    HYPE: "0x2900ABd73631b2f60747e687095537B673c06A76" as Address,
    USDC: "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27" as Address,
    USDhl: "0x9c59a9389D8f72De2CdAf1126F36EA4790E2275e" as Address,
    USDH: "0x207ccaE51Ad2E1C240C4Ab4c94b670D438d2201C" as Address,
  },
  branches: {
    HYPE: {
      borrowerOperations: "0x5b271dc20ba7beb8eee276eb4f1644b6a217f0a3" as Address,
      troveManager: "0x3100f4e7bda2ed2452d9a57eb30260ab071bbe62" as Address,
      stabilityPool: "0x576c9c501473e01ae23748de28415a74425efd6b" as Address,
      sortedTroves: "0xd1caa4218808eb94d36e1df7247f7406f43f2ef6" as Address,
      priceFeed: "0x12a1868b89789900e413a6241ca9032dd1873a51" as Address,
      troveNFT: "0x5ad1512e7006fdbd0f3ebb8aa35c5e9234a03aa7" as Address,
      activePool: "0x39ebba742b6917d49d4a9ac7cf5c70f84d34cc9e" as Address,
      zapper: "0x999876BC29Bc2251539C900a1bCfC6C934991F49" as Address,
    },
    UBTC: {
      borrowerOperations: "0x36b7bd65276eda7cdc5f730da5cdb7ee7736672e" as Address,
      troveManager: "0xbbe5f227275f24b64bd290a91f55723a00214885" as Address,
      stabilityPool: "0xabf0369530205ae56dd4c49629474c65d1168924" as Address,
      activePool: "0x8d99575ebbbda038a626ca769561c16fdd7a5939" as Address,
      priceFeed: "0xf59f338424062dd1d44a9b4dd2721128a45358ab" as Address,
      zapper: "0xefbd9cfe88235f0e648aefb52c8e8dc152a9ad6f" as Address,
    },
    kHYPE: {
      borrowerOperations: "0x3a2a181ab6e4ffb77c87ee201041a0806dadc397" as Address,
      troveManager: "0x7c07bb77b1cf9a5b40d92f805c10d90c90957e4a" as Address,
      stabilityPool: "0x56a346e0730cb209a93964c41cd36098030779ab" as Address,
      activePool: "0xbfd0b103a49faf426f36864d19f5d871bf411a5a" as Address,
    },
    wstHYPE: {
      borrowerOperations: "0x389c03c1f77981d158fbe286e7cafac2bb2fe83e" as Address,
      troveManager: "0x58446c58caa8a6f6cc8be343f812ebf0b997c001" as Address,
      stabilityPool: "0xadfba621a75beced7dd1727b2067047b7eeedc8b" as Address,
      activePool: "0x7abca40474d6b5f000f801d7fe7e0df4c89425ff" as Address,
    },
  },
} as const;

// ─── HypurrFi (Aave V3 Fork, ~$300M TVL) ───────────────────────────────────
export const HYPURRFI = {
  pool: "0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b" as Address,
  poolAddressesProvider: "0xA73ff12D177D8F1Ec938c3ba0e87D33524dD5594" as Address,
  poolConfigurator: "0x532Bb57DE005EdFd12E7d39a3e9BF8E8A8F544af" as Address,
  oracle: "0x9BE2ac1ff80950DCeb816842834930887249d9A8" as Address,
  protocolDataProvider: "0x895C799a5bbdCb63B80bEE5BD94E7b9138D977d6" as Address,
  wrappedHypeGateway: "0xd1EF87FeFA83154F83541b68BD09185e15463972" as Address,
  ui: {
    poolDataProvider: "0x7b883191011AEAe40581d3Fa1B112413808C9c00" as Address,
    incentiveDataProvider: "0x8ebA6fc4Ff6Ba4F12512DD56d0E4aaC6081f5274" as Address,
    walletBalanceProvider: "0xE913De89D8c868aEF96D3b10dAAE1900273D7Bb2" as Address,
  },
} as const;

// ─── HyperSwap (Uniswap V2+V3 Fork, ~$57M TVL) ────────────────────────────
export const HYPERSWAP = {
  v3: {
    factory: "0xb1c0fa0b789320044a6f623cfe5ebda9562602e3" as Address,
    swapRouter: "0x4e2960a8cd19b467b82d26d83facb0fae26b094d" as Address,
    nonfungiblePositionManager: "0x6eda206207c09e5428f281761ddc0d300851fbc8" as Address,
    tickLens: "0x8f1ea97ffdfeda3be7eabfed95ef49f909b2975a" as Address,
  },
  v2: {
    factory: "0x724412c00059bf7d6ee7d4a1d0d5cd4de3ea1c48" as Address,
    router: "0xb4a9c4e6ea8e2191d2fa5b380452a634fb21240a" as Address,
  },
  // Legacy alias
  factory: "0x724412c00059bf7d6ee7d4a1d0d5cd4de3ea1c48" as Address,
  router: "0xb4a9c4e6ea8e2191d2fa5b380452a634fb21240a" as Address,
} as const;

// ─── KittenSwap (Algebra AMM + ve(3,3), ~$1.8M TVL) ────────────────────────
export const KITTENSWAP = {
  factory: "0x5f95E92c338e6453111Fc55ee66D4AafccE661A7" as Address,
  swapRouter: "0x4e73E421480a7E0C24fB3c11019254edE194f736" as Address,
  nonfungiblePositionManager: "0x9ea4459c8DefBF561495d95414b9CF1E2242a3E2" as Address,
  quoterV2: "0xc58874216AFe47779ADED27B8AAd77E8Bd6eBEBb" as Address,
  tickLens: "0x652071af348a44d38be519fa17ee9183a6e38f99" as Address,
  governance: {
    KITTEN: "0x618275f8efe54c2afa87bfb9f210a52f0ff89364" as Address,
    veKITTEN: "0x29d3a21ff35a519e00cf6d272f2ad897b109bd84" as Address,
    voter: "0xb7F7053F7e6c210e6777D5BA758E4b3ECa6C88A0" as Address,
  },
} as const;

// ─── Laminar (Uniswap V2+V3 Fork, ~$3.2M TVL) ─────────────────────────────
export const LAMINAR = {
  v3: {
    factory: "0x40059a6f242c3de0e639693973004921b04d96ad" as Address,
    swapRouter02: "0x0693ca7a4ef80032d194df0dce8007bc597fa736" as Address,
    nonfungiblePositionManager: "0xfdf8b1f915198ed043ee52ec367c3df8ed5c9d79" as Address,
    quoterV2: "0xfaa395ba815a7fb88f463057ec1ef4f84ef78e18" as Address,
    tickLens: "0x336d77442a9d033771143d4b8f1b330683c48f3f" as Address,
  },
  v2: {
    factory: "0x8f45c2143a875de1e31b1c3f523b4c6529e11615" as Address,
  },
} as const;

// ─── Valantis (Modular STEX AMM, ~$153M TVL) ───────────────────────────────
export const VALANTIS = {
  protocolFactory: "0x7E028ac56cB2AF75292F3D967978189698C24732" as Address,
  sovereignPoolFactory: "0xe105af173402b07100aE5648385E1F182bCE21B6" as Address,
  swapRouter: "0x5Abe35DDb420703bA6Dd7226ACDCb24be71192e5" as Address,
  stexLens: "0x95e88072c3fe908101a13584d7A0ff87DaDd88f3" as Address,
  pools: {
    stHYPE_WHYPE: "0x5365b6EF09253C7aBc0A9286eC578A9f4B413B7D" as Address,
    kHYPE_WHYPE: "0x88B214eC94276B825E641820D5C97a9042F9Dd60" as Address,
  },
} as const;

// ─── Kinetiq (LST — kHYPE, ~$639M TVL) ─────────────────────────────────────
export const KINETIQ = {
  kHYPE: "0xfD739d4e423301CE9385c1fb8850539D657C296D" as Address,
  stakingManager: "0x393D0B87Ed38fc779FD9611144aE649BA6082109" as Address,
  stakingAccountant: "0x9209648Ec9D448EF57116B73A2f081835643dc7A" as Address,
  validatorManager: "0x4b797A93DfC3D18Cf98B7322a2b142FA8007508f" as Address,
  oracleManager: "0x192826e470bd65FDC2CB472eDd834D096233049b" as Address,
  kmHYPE: "0x360C140E5344A1A0593D44B4ea6Fc7C3DAf0C473" as Address,
} as const;

// ─── StakedHYPE (LST — stHYPE/wstHYPE, ~$200M TVL) ────────────────────────
export const STAKEDHYPE = {
  stHYPE: "0xfFaa4a3D97fE9107Cef8a3F48c069F577Ff76cC1" as Address,
  wstHYPE: "0x94e8396e0869c9F2200760aF0621aFd240E1CF38" as Address,
  overseer: "0xB96f07367e69e86d6e9C3F29215885104813eeAE" as Address,
  stexPool: "0x5365b6EF09253C7aBc0A9286eC578A9f4B413B7D" as Address,
} as const;

// ─── Hyperbeat (Yield Aggregator, ~$65M TVL) ────────────────────────────────
export const HYPERBEAT = {
  beHYPE: "0xd8FC8F0b03eBA61F64D08B0bef69d80916E5DdA9" as Address,
  stakingCore: "0xCeaD893b162D38e714D82d06a7fe0b0dc3c38E0b" as Address,
  withdrawManager: "0x9d0B0877b9f2204CF414Ca7862E4f03506822538" as Address,
  vaults: {
    HYPE: "0x96c6cbb6251ee1c257b2162ca0f39aa5fa44b1fb" as Address,
    UBTC: "0xc061d38903b99ac12713b550c2cb44b221674f94" as Address,
    USDT: "0x5e105266db42f78fa814322bce7f388b4c2e61eb" as Address,
    USDC: "0x057ced81348D57Aad579A672d521d7b4396E8a61" as Address,
    LST: "0x81e064d0eB539de7c3170EDF38C1A42CBd752A76" as Address,
    liquidHYPE: "0x441794d6a8f9a3739f5d4e98a728937b33489d29" as Address,
  },
} as const;

// ─── Harmonix (Delta-Neutral Yield, ~$4.7M TVL) ────────────────────────────
export const HARMONIX = {
  vaults: {
    kHYPE: "0x1368ee9d1212ae5b26ff166049220051a9eebc42" as Address,
    HYPE: "0xfde5b0626fc80e36885e2fa9cd5ad9d7768d725c" as Address,
  },
  HAR: "0x391121d817da42ed3434d281aedbbcc416a2af18" as Address,
  staking: "0x02a1d5fba537c7156f5374d2c740fab4bdf00520" as Address,
} as const;

// ─── Looped (Leveraged HYPE, ~$15.8M TVL) ───────────────────────────────────
export const LOOPED = {
  LHYPE: "0x5748ae796AE46A4F1348a1693de4b50560485562" as Address,
  teller: "0xFd83C1ca0c04e096d129275126fade1dC45BF4F0" as Address,
  manager: "0xe661393C409f7CAec8564bc49ED92C22A63e81d0" as Address,
  accountant: "0xcE621a3CA6F72706678cFF0572ae8d15e5F001c3" as Address,
  LOOP: "0x00fDBc53719604D924226215bc871D55e40a1009" as Address,
} as const;
