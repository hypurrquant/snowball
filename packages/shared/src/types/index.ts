// ==================== Contract Types ====================

export interface DeployedAddresses {
  network: {
    name: string;
    chainId: number;
    rpc: string;
    explorer: string;
  };
  tokens: {
    wCTC: string;
    lstCTC: string;
    sbUSD: string;
  };
  branches: {
    wCTC: BranchAddresses;
    lstCTC: BranchAddresses;
  };
  shared: {
    collateralRegistry: string;
    hintHelpers: string;
    multiTroveGetter: string;
    agentVault?: string;
  };
  erc8004?: {
    identityRegistry: string;
    reputationRegistry: string;
    validationRegistry: string;
  };
}

export interface BranchAddresses {
  addressesRegistry: string;
  borrowerOperations: string;
  troveManager: string;
  stabilityPool: string;
  activePool: string;
  defaultPool: string;
  gasPool: string;
  collSurplusPool: string;
  sortedTroves: string;
  troveNFT: string;
  priceFeed: string;
}

export interface AlgebraAddresses {
  network: {
    name: string;
    chainId: number;
  };
  core: {
    snowballFactory: string;
    snowballPoolDeployer: string;
    snowballCommunityVault: string;
    snowballVaultFactoryStub: string;
    snowballRouter: string;
    dynamicFeePlugin: string;
    nonfungiblePositionManager: string;
    nonfungibleTokenPositionDescriptor: string;
    quoterV2: string;
  };
  mockTokens: {
    sbUSD: string;
    wCTC: string;
    lstCTC: string;
    USDC: string;
  };
  pools: Record<string, string>;
}

export interface MorphoAddresses {
  network: {
    name: string;
    chainId: number;
  };
  core: {
    snowballLend: string;
    adaptiveCurveIRM: string;
  };
  tokens: {
    wCTC: string;
    lstCTC: string;
    sbUSD: string;
    mockUSDC: string;
  };
  vaults: {
    snowballVaultFactory: string;
    publicAllocator: string;
  };
  oracles: Record<string, string>;
  markets: Record<
    string,
    {
      loanToken: string;
      collateralToken: string;
      oracle: string;
      irm: string;
      lltv: string;
    }
  >;
}
