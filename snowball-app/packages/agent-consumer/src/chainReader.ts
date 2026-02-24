import {
  createPublicClient,
  http,
  parseAbi,
  formatEther,
  type Address,
  type Abi,
} from "viem";
import { chainLogger } from "./logger";
import {
  creditcoinTestnet,
  RPC_URL,
  ActivePoolABI,
  StabilityPoolABI,
  MockPriceFeedABI,
  TroveManagerABI,
  TroveNFTABI,
  MockWCTCABI,
  SbUSDTokenABI,
  CollateralRegistryABI,
  WCTC_MCR,
  LSTCTC_MCR,
  DECIMAL_PRECISION,
} from "@snowball/shared";
import type { SPUserDeposit } from "@snowball/shared";
import type {
  ProtocolStats,
  MarketData,
  UserPosition,
  UserBalance,
  AgentInfo,
} from "@snowball/shared";
import { getAddresses } from "./addresses";

// JSON ABI for IdentityRegistry — parseAbi can't handle tuple return types
const IdentityRegistryJsonABI: Abi = [
  {
    type: "function",
    name: "totalAgents",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentInfo",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "agentType", type: "string" },
          { name: "endpoint", type: "address" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
];

// Batch JSON-RPC transport: batches multiple readContract calls into fewer HTTP
// round-trips at the RPC level. No Multicall3 contract needed on-chain.
const client = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(RPC_URL, {
    batch: true,
  }),
});

const BRANCH_SYMBOLS = ["wCTC", "lstCTC"] as const;
const BRANCH_MCR_PCT = ["110.00", "120.00"];
const BRANCH_CCR_PCT = ["150.00", "160.00"];
const BRANCH_MCR_RAW = [WCTC_MCR, LSTCTC_MCR];

// Pre-parse ABIs once
const activePoolAbi = parseAbi(ActivePoolABI as unknown as string[]);
const stabilityPoolAbi = parseAbi(StabilityPoolABI as unknown as string[]);
const priceFeedAbi = parseAbi(MockPriceFeedABI as unknown as string[]);
const troveManagerAbi = parseAbi(TroveManagerABI as unknown as string[]);
const troveNFTAbi = parseAbi(TroveNFTABI as unknown as string[]);
const wctcAbi = parseAbi(MockWCTCABI as unknown as string[]);
const sbUSDAbi = parseAbi(SbUSDTokenABI as unknown as string[]);

// Helper: read a single contract value
function read(address: Address, abi: any, functionName: string, args?: any[]) {
  return client.readContract({ address, abi, functionName, args });
}

// Helper: count active agents from registry
async function getActiveAgentCount(): Promise<number> {
  const addresses = getAddresses();
  if (!addresses.erc8004) return 0;
  try {
    const total = await read(
      addresses.erc8004.identityRegistry as Address,
      IdentityRegistryJsonABI,
      "totalAgents",
    ) as bigint;
    return Number(total);
  } catch {
    return 0;
  }
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  const addresses = getAddresses();
  const branches = [addresses.branches.wCTC, addresses.branches.lstCTC];

  try {
    // Batch JSON-RPC: 6 readContract calls batched into 1 HTTP request
    const [
      collBalance0, boldDebt0, price0,
      collBalance1, boldDebt1, price1,
      activeAgents,
    ] = await Promise.all([
      read(branches[0].activePool as Address, activePoolAbi, "getCollBalance"),
      read(branches[0].activePool as Address, activePoolAbi, "getBoldDebt"),
      read(branches[0].priceFeed as Address, priceFeedAbi, "lastGoodPrice"),
      read(branches[1].activePool as Address, activePoolAbi, "getCollBalance"),
      read(branches[1].activePool as Address, activePoolAbi, "getBoldDebt"),
      read(branches[1].priceFeed as Address, priceFeedAbi, "lastGoodPrice"),
      getActiveAgentCount(),
    ]);

    const totalCollUSD =
      ((collBalance0 as bigint) * (price0 as bigint)) / DECIMAL_PRECISION +
      ((collBalance1 as bigint) * (price1 as bigint)) / DECIMAL_PRECISION;
    const totalDebt = (boldDebt0 as bigint) + (boldDebt1 as bigint);

    return {
      totalCollateralUSD: formatEther(totalCollUSD),
      totalBorrowedUSD: formatEther(totalDebt),
      sbUSDPrice: "1.00", // Protocol peg price — sbUSD is the unit of account
      activeAgents,
    };
  } catch {
    return {
      totalCollateralUSD: "0",
      totalBorrowedUSD: "0",
      sbUSDPrice: "1.00",
      activeAgents: 0,
    };
  }
}

export async function getMarkets(): Promise<MarketData[]> {
  const addresses = getAddresses();
  const branches = [addresses.branches.wCTC, addresses.branches.lstCTC];
  const collAddrs = [addresses.tokens.wCTC, addresses.tokens.lstCTC];

  try {
    // Batch JSON-RPC: 10 readContract calls batched into 1 HTTP request
    const results = await Promise.all(
      branches.flatMap((b) => [
        read(b.activePool as Address, activePoolAbi, "getCollBalance"),
        read(b.activePool as Address, activePoolAbi, "getBoldDebt"),
        read(b.activePool as Address, activePoolAbi, "aggWeightedDebtSum"),
        read(b.stabilityPool as Address, stabilityPoolAbi, "getTotalBoldDeposits"),
        read(b.priceFeed as Address, priceFeedAbi, "lastGoodPrice"),
      ]),
    );

    const markets: MarketData[] = [];

    for (let i = 0; i < 2; i++) {
      const base = i * 5;
      const collBalance = results[base] as bigint;
      const boldDebt = results[base + 1] as bigint;
      const aggWeightedDebt = results[base + 2] as bigint;
      const spDeposits = results[base + 3] as bigint;
      const price = results[base + 4] as bigint;

      const collUSD = (collBalance * price) / DECIMAL_PRECISION;
      const cr = boldDebt > 0n
        ? Number(formatEther((collBalance * price * 100n) / boldDebt)).toFixed(2)
        : "0.00";
      const ltv = collUSD > 0n
        ? Number(formatEther((boldDebt * 100n * DECIMAL_PRECISION) / collUSD)).toFixed(2)
        : "0.00";

      // Compute avg interest rate: aggWeightedDebtSum / boldDebt (in 1e18 precision)
      const avgRate = boldDebt > 0n
        ? (Number(formatEther(aggWeightedDebt)) / Number(formatEther(boldDebt)) * 100).toFixed(2)
        : "0.00";

      // SP APY = annualized interest share flowing to SP depositors
      const spAPY = (spDeposits > 0n && boldDebt > 0n)
        ? (Number(formatEther(aggWeightedDebt)) / Number(formatEther(spDeposits)) * 100).toFixed(2)
        : "0.00";

      markets.push({
        branch: i,
        collateralSymbol: BRANCH_SYMBOLS[i],
        collateralAddress: collAddrs[i],
        totalCollateral: collBalance.toString(),
        totalCollateralUSD: formatEther(collUSD),
        currentCR: cr,
        mcr: BRANCH_MCR_PCT[i],
        ccr: BRANCH_CCR_PCT[i],
        ltv,
        totalBorrow: boldDebt.toString(),
        avgInterestRate: avgRate,
        spDeposits: spDeposits.toString(),
        spAPY,
      });
    }

    return markets;
  } catch {
    return [0, 1].map((i) => ({
      branch: i,
      collateralSymbol: BRANCH_SYMBOLS[i],
      collateralAddress: collAddrs[i],
      totalCollateral: "0",
      totalCollateralUSD: "0.00",
      currentCR: "0.00",
      mcr: BRANCH_MCR_PCT[i],
      ccr: BRANCH_CCR_PCT[i],
      ltv: "0.00",
      totalBorrow: "0",
      avgInterestRate: "0.00",
      spDeposits: "0",
      spAPY: "0.00",
    }));
  }
}

export async function getUserPositions(userAddress: string): Promise<UserPosition[]> {
  const addresses = getAddresses();
  const positions: UserPosition[] = [];

  for (let i = 0; i < 2; i++) {
    const branch = i === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    try {
      // Step 1: batch NFT balance + price
      const [nftBalance, price] = await Promise.all([
        read(branch.troveNFT as Address, troveNFTAbi, "balanceOf", [userAddress as Address]) as Promise<bigint>,
        read(branch.priceFeed as Address, priceFeedAbi, "lastGoodPrice") as Promise<bigint>,
      ]);

      if (nftBalance === 0n) continue;

      // Step 2: batch all tokenOfOwnerByIndex calls
      const troveIds = await Promise.all(
        Array.from({ length: Number(nftBalance) }, (_, j) =>
          read(branch.troveNFT as Address, troveNFTAbi, "tokenOfOwnerByIndex", [userAddress as Address, BigInt(j)]) as Promise<bigint>,
        ),
      );

      // Step 3: batch all trove data reads (4 calls per trove)
      const troveDataFlat = await Promise.all(
        troveIds.flatMap((troveId) => [
          read(branch.troveManager as Address, troveManagerAbi, "getTroveStatus", [troveId]) as Promise<bigint>,
          read(branch.troveManager as Address, troveManagerAbi, "getTroveDebt", [troveId]) as Promise<bigint>,
          read(branch.troveManager as Address, troveManagerAbi, "getTroveColl", [troveId]) as Promise<bigint>,
          read(branch.troveManager as Address, troveManagerAbi, "getTroveAnnualInterestRate", [troveId]) as Promise<bigint>,
        ]),
      );

      const mcrNum = i === 0 ? 1.1 : 1.2;

      for (let j = 0; j < troveIds.length; j++) {
        const base = j * 4;
        const status = Number(troveDataFlat[base]);
        const debt = troveDataFlat[base + 1];
        const coll = troveDataFlat[base + 2];
        const interestRate = troveDataFlat[base + 3];

        if (status !== 1) continue; // Only active troves

        const collUSD = (coll * price) / DECIMAL_PRECISION;
        const cr = debt > 0n
          ? Number(formatEther((coll * price * 100n) / debt)).toFixed(2)
          : "0.00";
        const liqPrice = (debt > 0n && coll > 0n)
          ? parseFloat(formatEther((debt * BigInt(Math.round(mcrNum * 1e18))) / coll)).toFixed(4)
          : "0.00";

        const statusMap: Record<number, UserPosition["status"]> = {
          1: "active",
          2: "closedByOwner",
          3: "closedByLiquidation",
          4: "closedByRedemption",
        };

        positions.push({
          troveId: Number(troveIds[j]),
          branch: i,
          collateralSymbol: BRANCH_SYMBOLS[i],
          collateral: coll.toString(),
          collateralUSD: formatEther(collUSD),
          debt: debt.toString(),
          cr,
          interestRate: (Number(formatEther(interestRate)) * 100).toFixed(2),
          liquidationPrice: liqPrice,
          agentManaged: false,
          agentStrategy: "conservative",
          status: statusMap[status] ?? "active",
        });
      }
    } catch {
      // Branch not accessible
    }
  }

  return positions;
}

export async function getUserBalance(userAddress: string): Promise<UserBalance> {
  const addresses = getAddresses();

  try {
    // Batch JSON-RPC: 3 token balances + 1 native balance
    const [nativeCTC, wCTC, lstCTC, sbUSD] = await Promise.all([
      client.getBalance({ address: userAddress as Address }),
      read(addresses.tokens.wCTC as Address, wctcAbi, "balanceOf", [userAddress as Address]) as Promise<bigint>,
      read(addresses.tokens.lstCTC as Address, wctcAbi, "balanceOf", [userAddress as Address]) as Promise<bigint>,
      read(addresses.tokens.sbUSD as Address, sbUSDAbi, "balanceOf", [userAddress as Address]) as Promise<bigint>,
    ]);

    return {
      nativeCTC: nativeCTC.toString(),
      wCTC: wCTC.toString(),
      lstCTC: lstCTC.toString(),
      sbUSD: sbUSD.toString(),
    };
  } catch {
    return { nativeCTC: "0", wCTC: "0", lstCTC: "0", sbUSD: "0" };
  }
}

export async function getUserSPDeposits(userAddress: string): Promise<SPUserDeposit[]> {
  const addresses = getAddresses();
  const branches = [addresses.branches.wCTC, addresses.branches.lstCTC];

  try {
    // Batch JSON-RPC: 2 branches × 3 reads = 6 calls
    const results = await Promise.all(
      branches.flatMap((b) => [
        read(b.stabilityPool as Address, stabilityPoolAbi, "getCompoundedBoldDeposit", [userAddress as Address]),
        read(b.stabilityPool as Address, stabilityPoolAbi, "getDepositorBoldGain", [userAddress as Address]),
        read(b.stabilityPool as Address, stabilityPoolAbi, "getDepositorCollGain", [userAddress as Address]),
      ]),
    );

    return [0, 1].map((i) => {
      const base = i * 3;
      return {
        branch: i,
        collateralSymbol: BRANCH_SYMBOLS[i],
        deposit: (results[base] as bigint).toString(),
        boldGain: (results[base + 1] as bigint).toString(),
        collGain: (results[base + 2] as bigint).toString(),
      };
    });
  } catch {
    return [0, 1].map((i) => ({
      branch: i,
      collateralSymbol: BRANCH_SYMBOLS[i],
      deposit: "0",
      boldGain: "0",
      collGain: "0",
    }));
  }
}

export async function getAgentList(): Promise<AgentInfo[]> {
  const addresses = getAddresses();
  if (!addresses.erc8004) return [];

  try {
    const totalAgents = await read(
      addresses.erc8004.identityRegistry as Address,
      IdentityRegistryJsonABI,
      "totalAgents",
    ) as bigint;

    if (totalAgents === 0n) return [];

    // Batch JSON-RPC: 2 reads per agent (getAgentInfo + ownerOf)
    const results = await Promise.all(
      Array.from({ length: Number(totalAgents) }, (_, i) => [
        read(addresses.erc8004!.identityRegistry as Address, IdentityRegistryJsonABI, "getAgentInfo", [BigInt(i + 1)]),
        read(addresses.erc8004!.identityRegistry as Address, IdentityRegistryJsonABI, "ownerOf", [BigInt(i + 1)]),
      ]).flat(),
    );

    const agents: AgentInfo[] = [];
    for (let i = 0; i < Number(totalAgents); i++) {
      const info = results[i * 2] as any;
      const owner = results[i * 2 + 1] as string;

      agents.push({
        id: i + 1,
        name: info?.name || info?.[0] || `Agent ${i + 1}`,
        agentType: info?.agentType || info?.[1] || "unknown",
        owner: owner || "0x",
        endpoint: info?.endpoint || info?.[2] || "0x",
        registeredAt: Number(info?.registeredAt || info?.[3] || 0),
        isActive: info?.isActive ?? info?.[4] ?? true,
      });
    }

    return agents;
  } catch (err) {
    chainLogger.error({ err }, "getAgentList error");
    return [];
  }
}
