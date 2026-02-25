import { parseEther } from "viem";

export const LEND_ADDRESSES = {
  snowballLend: "0x7d604b31297b36aace73255931f65e891cf289d3",
  adaptiveCurveIRM: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
  vaultFactory: "0x6e97df392462b8c2b8d13e2cd77a90168925edf6",
  publicAllocator: "0x35b35a8c835eaf78b43137a51c4adccfc5d653b4",
} as const;

export const LEND_TOKENS = {
  wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969",
  lstCTC: "0x72968ff9203dc5f352c5e42477b84d11c8c8f153",
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",
  mockUSDC: "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed",
} as const;

export const LEND_ORACLES = {
  wCTC: "0x42ca12a83c14e95f567afc940b0118166d8bd852",
  lstCTC: "0x192f1feb36f319e79b3bba25a17359ee72266a14",
  sbUSD: "0xc39f222e034f4bd4f3c858e6fde9ce4398400a26",
} as const;

export const LEND_MARKETS = [
  {
    id: "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261" as `0x${string}`,
    name: "wCTC / sbUSD",
    loanToken: LEND_TOKENS.sbUSD,
    collateralToken: LEND_TOKENS.wCTC,
    oracle: LEND_ORACLES.wCTC,
    irm: LEND_ADDRESSES.adaptiveCurveIRM,
    lltv: parseEther("0.77"),
    loanSymbol: "sbUSD",
    collSymbol: "wCTC",
    loanDecimals: 18,
    collDecimals: 18,
  },
  {
    id: "0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e" as `0x${string}`,
    name: "lstCTC / sbUSD",
    loanToken: LEND_TOKENS.sbUSD,
    collateralToken: LEND_TOKENS.lstCTC,
    oracle: LEND_ORACLES.lstCTC,
    irm: LEND_ADDRESSES.adaptiveCurveIRM,
    lltv: parseEther("0.80"),
    loanSymbol: "sbUSD",
    collSymbol: "lstCTC",
    loanDecimals: 18,
    collDecimals: 18,
  },
  {
    id: "0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681" as `0x${string}`,
    name: "sbUSD / USDC",
    loanToken: LEND_TOKENS.mockUSDC,
    collateralToken: LEND_TOKENS.sbUSD,
    oracle: LEND_ORACLES.sbUSD,
    irm: LEND_ADDRESSES.adaptiveCurveIRM,
    lltv: parseEther("0.86"),
    loanSymbol: "USDC",
    collSymbol: "sbUSD",
    loanDecimals: 6,
    collDecimals: 18,
  },
];
