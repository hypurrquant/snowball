// Contract types (copied from snowball/packages/shared)

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
