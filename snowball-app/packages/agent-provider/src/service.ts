import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  formatEther,
  type Address,
} from "viem";
import {
  creditcoinTestnet,
  CHAIN_ID,
  BorrowerOperationsABI,
  TroveManagerABI,
  StabilityPoolABI,
  ActivePoolABI,
  MockPriceFeedABI,
  MockWCTCABI,
} from "@snowball/shared";
import type { UnsignedTxData } from "@snowball/shared";
import { getAddresses } from "./addresses";

export class CDPProviderService {
  private client = createPublicClient({
    chain: creditcoinTestnet,
    transport: http(),
  });

  // ==================== Trove Operations ====================

  async buildOpenTroveTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;
    const collToken = branchIndex === 0 ? addresses.tokens.wCTC : addresses.tokens.lstCTC;

    const owner = params.owner as string;
    const ownerIndex = BigInt(params.ownerIndex as string ?? "0");
    const collAmount = BigInt(params.collAmount as string);
    const debtAmount = BigInt(params.debtAmount as string);
    const interestRate = BigInt(params.interestRate as string);
    const maxUpfrontFee = BigInt(params.maxUpfrontFee as string ?? debtAmount.toString());

    // Build approve TX for collateral
    const approveTx: UnsignedTxData = {
      to: collToken,
      data: encodeFunctionData({
        abi: parseAbi(MockWCTCABI as unknown as string[]),
        functionName: "approve",
        args: [branch.borrowerOperations as Address, collAmount],
      }),
      value: "0",
      chainId: CHAIN_ID,
    };

    // Build openTrove TX
    const openTroveTx: UnsignedTxData = {
      to: branch.borrowerOperations,
      data: encodeFunctionData({
        abi: parseAbi(BorrowerOperationsABI as unknown as string[]),
        functionName: "openTrove",
        args: [
          owner as Address,
          ownerIndex,
          collAmount,
          debtAmount,
          0n, // upperHint
          0n, // lowerHint
          interestRate,
          maxUpfrontFee,
        ],
      }),
      value: "0",
      chainId: CHAIN_ID,
    };

    // Return both TXs as a batch
    return {
      ...openTroveTx,
      gasLimit: "500000",
    };
  }

  async buildAdjustTroveTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    const troveId = BigInt(params.troveId as string);
    const collChange = BigInt(params.collChange as string ?? "0");
    const isCollIncrease = Boolean(params.isCollIncrease);
    const debtChange = BigInt(params.debtChange as string ?? "0");
    const isDebtIncrease = Boolean(params.isDebtIncrease);
    const maxUpfrontFee = BigInt(params.maxUpfrontFee as string ?? "0");

    return {
      to: branch.borrowerOperations,
      data: encodeFunctionData({
        abi: parseAbi(BorrowerOperationsABI as unknown as string[]),
        functionName: "adjustTrove",
        args: [
          troveId,
          collChange,
          isCollIncrease,
          debtChange,
          isDebtIncrease,
          0n, // upperHint
          0n, // lowerHint
          maxUpfrontFee,
        ],
      }),
      value: "0",
      gasLimit: "400000",
      chainId: CHAIN_ID,
    };
  }

  async buildCloseTroveTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    const troveId = BigInt(params.troveId as string);

    return {
      to: branch.borrowerOperations,
      data: encodeFunctionData({
        abi: parseAbi(BorrowerOperationsABI as unknown as string[]),
        functionName: "closeTrove",
        args: [troveId],
      }),
      value: "0",
      gasLimit: "300000",
      chainId: CHAIN_ID,
    };
  }

  async buildAdjustTroveInterestRateTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    const troveId = BigInt(params.troveId as string);
    const newInterestRate = BigInt(params.newInterestRate as string);
    const maxUpfrontFee = BigInt(params.maxUpfrontFee as string ?? "0");

    return {
      to: branch.borrowerOperations,
      data: encodeFunctionData({
        abi: parseAbi(BorrowerOperationsABI as unknown as string[]),
        functionName: "adjustTroveInterestRate",
        args: [
          troveId,
          newInterestRate,
          0n, // upperHint
          0n, // lowerHint
          maxUpfrontFee,
        ],
      }),
      value: "0",
      gasLimit: "300000",
      chainId: CHAIN_ID,
    };
  }

  // ==================== Stability Pool Operations ====================

  async buildSPDepositTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;
    const amount = BigInt(params.amount as string);

    return {
      to: branch.stabilityPool,
      data: encodeFunctionData({
        abi: parseAbi(StabilityPoolABI as unknown as string[]),
        functionName: "provideToSP",
        args: [amount],
      }),
      value: "0",
      gasLimit: "300000",
      chainId: CHAIN_ID,
    };
  }

  async buildSPWithdrawTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;
    const amount = BigInt(params.amount as string);

    return {
      to: branch.stabilityPool,
      data: encodeFunctionData({
        abi: parseAbi(StabilityPoolABI as unknown as string[]),
        functionName: "withdrawFromSP",
        args: [amount],
      }),
      value: "0",
      gasLimit: "300000",
      chainId: CHAIN_ID,
    };
  }

  async buildSPClaimTx(params: Record<string, unknown>): Promise<UnsignedTxData> {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    return {
      to: branch.stabilityPool,
      data: encodeFunctionData({
        abi: parseAbi(StabilityPoolABI as unknown as string[]),
        functionName: "claimReward",
        args: [],
      }),
      value: "0",
      gasLimit: "200000",
      chainId: CHAIN_ID,
    };
  }

  // ==================== Query Operations ====================

  async getTroveStatus(params: Record<string, unknown>) {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;
    const troveId = BigInt(params.troveId as string);

    const abi = parseAbi(TroveManagerABI as unknown as string[]);

    const [status, debt, coll, interestRate] = await Promise.all([
      this.client.readContract({
        address: branch.troveManager as Address,
        abi,
        functionName: "getTroveStatus",
        args: [troveId],
      }),
      this.client.readContract({
        address: branch.troveManager as Address,
        abi,
        functionName: "getTroveDebt",
        args: [troveId],
      }),
      this.client.readContract({
        address: branch.troveManager as Address,
        abi,
        functionName: "getTroveColl",
        args: [troveId],
      }),
      this.client.readContract({
        address: branch.troveManager as Address,
        abi,
        functionName: "getTroveAnnualInterestRate",
        args: [troveId],
      }),
    ]);

    const price = await this.client.readContract({
      address: branch.priceFeed as Address,
      abi: parseAbi(MockPriceFeedABI as unknown as string[]),
      functionName: "lastGoodPrice",
    }) as bigint;

    const collBigInt = coll as bigint;
    const debtBigInt = debt as bigint;
    const cr = debtBigInt > 0n
      ? formatEther((collBigInt * price) / debtBigInt)
      : "Infinity";

    return {
      status: Number(status),
      debt: (debt as bigint).toString(),
      coll: (coll as bigint).toString(),
      interestRate: (interestRate as bigint).toString(),
      cr,
      price: (price as bigint).toString(),
    };
  }

  async getPrice(params: Record<string, unknown>) {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    const price = await this.client.readContract({
      address: branch.priceFeed as Address,
      abi: parseAbi(MockPriceFeedABI as unknown as string[]),
      functionName: "lastGoodPrice",
    });

    return { price: (price as bigint).toString(), formatted: formatEther(price as bigint) };
  }

  async getBranchStats(params: Record<string, unknown>) {
    const addresses = getAddresses();
    const branchIndex = Number(params.branchIndex ?? 0);
    const branch = branchIndex === 0 ? addresses.branches.wCTC : addresses.branches.lstCTC;

    const activePoolAbi = parseAbi(ActivePoolABI as unknown as string[]);
    const spAbi = parseAbi(StabilityPoolABI as unknown as string[]);
    const priceFeedAbi = parseAbi(MockPriceFeedABI as unknown as string[]);

    const [collBalance, boldDebt, spDeposits, price] = await Promise.all([
      this.client.readContract({
        address: branch.activePool as Address,
        abi: activePoolAbi,
        functionName: "getCollBalance",
      }),
      this.client.readContract({
        address: branch.activePool as Address,
        abi: activePoolAbi,
        functionName: "getBoldDebt",
      }),
      this.client.readContract({
        address: branch.stabilityPool as Address,
        abi: spAbi,
        functionName: "getTotalBoldDeposits",
      }),
      this.client.readContract({
        address: branch.priceFeed as Address,
        abi: priceFeedAbi,
        functionName: "lastGoodPrice",
      }),
    ]);

    const collBigInt = collBalance as bigint;
    const debtBigInt = boldDebt as bigint;
    const priceBigInt = price as bigint;
    const collUSD = (collBigInt * priceBigInt) / (10n ** 18n);

    return {
      collBalance: collBigInt.toString(),
      collBalanceUSD: formatEther(collUSD),
      boldDebt: debtBigInt.toString(),
      spDeposits: (spDeposits as bigint).toString(),
      price: priceBigInt.toString(),
      cr: debtBigInt > 0n
        ? formatEther((collBigInt * priceBigInt * 100n) / debtBigInt)
        : "Infinity",
    };
  }
}
