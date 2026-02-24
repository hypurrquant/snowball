import { parseAbi } from 'viem'
import {
  BorrowerOperationsABI,
  TroveManagerABI,
  StabilityPoolABI,
  ActivePoolABI,
  TroveNFTABI,
  SortedTrovesABI,
  MockPriceFeedABI,
  SbUSDTokenABI,
  MockWCTCABI,
  MockLstCTCABI,
  MultiTroveGetterABI,
} from '@snowball/shared'
import addresses from './addresses.json'

// Parsed ABIs (viem needs parsed form for type inference)
export const abis = {
  borrowerOperations: parseAbi(BorrowerOperationsABI),
  troveManager: parseAbi(TroveManagerABI),
  stabilityPool: parseAbi(StabilityPoolABI),
  activePool: parseAbi(ActivePoolABI),
  troveNFT: parseAbi(TroveNFTABI),
  sortedTroves: parseAbi(SortedTrovesABI),
  priceFeed: parseAbi(MockPriceFeedABI),
  sbUSD: parseAbi(SbUSDTokenABI),
  wCTC: parseAbi(MockWCTCABI),
  lstCTC: parseAbi(MockLstCTCABI),
  multiTroveGetter: parseAbi(MultiTroveGetterABI),
} as const

export function getMultiTroveGetter(): `0x${string}` {
  return addresses.shared.multiTroveGetter as `0x${string}`
}

const BRANCHES = [addresses.branches.wCTC, addresses.branches.lstCTC] as const

export type BranchAddresses = {
  borrowerOperations: `0x${string}`
  troveManager: `0x${string}`
  stabilityPool: `0x${string}`
  activePool: `0x${string}`
  sortedTroves: `0x${string}`
  troveNFT: `0x${string}`
  priceFeed: `0x${string}`
}

export function getBranchAddresses(branch: 0 | 1): BranchAddresses {
  const b = BRANCHES[branch]
  return {
    borrowerOperations: b.borrowerOperations as `0x${string}`,
    troveManager: b.troveManager as `0x${string}`,
    stabilityPool: b.stabilityPool as `0x${string}`,
    activePool: b.activePool as `0x${string}`,
    sortedTroves: b.sortedTroves as `0x${string}`,
    troveNFT: b.troveNFT as `0x${string}`,
    priceFeed: b.priceFeed as `0x${string}`,
  }
}

export function getCollToken(branch: 0 | 1): `0x${string}` {
  return (branch === 0 ? addresses.tokens.wCTC : addresses.tokens.lstCTC) as `0x${string}`
}

export function getSbUSDToken(): `0x${string}` {
  return addresses.tokens.sbUSD as `0x${string}`
}

export const BRANCH_SYMBOLS = ['wCTC', 'lstCTC'] as const
