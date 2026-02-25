import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { Address } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { QuoterV2ABI, SnowballRouterABI, MockERC20ABI } from "@/abis";

export function useSwap(tokenIn?: Address, tokenOut?: Address, amountIn?: bigint) {
    const { address } = useAccount();

    // 1. QuoterV2 - get quote
    const { data: quoteDataRaw, isLoading: isQuoteLoading } = useReadContract({
        address: CONTRACTS.quoterV2,
        abi: QuoterV2ABI,
        functionName: "quoteExactInputSingle",
        args: tokenIn && tokenOut && amountIn && amountIn > BigInt(0)
            ? [{
                tokenIn,
                tokenOut,
                deployer: CONTRACTS.snowballPoolDeployer,
                amountIn,
                limitSqrtPrice: BigInt(0),
            }]
            : undefined,
        query: { enabled: !!tokenIn && !!tokenOut && !!amountIn && amountIn > BigInt(0) },
    });

    // quoteDataRaw is an array returned from QuoterV2:
    // [amountOut, amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate, fee]
    const quoteData = quoteDataRaw as [bigint, bigint, bigint, number, bigint, number] | undefined;

    const expectedAmountOut = quoteData ? quoteData[0] : undefined;
    const fee = quoteData ? quoteData[5] : undefined;

    // 2. Token Approval
    const { data: allowanceRaw } = useReadContract({
        address: tokenIn,
        abi: MockERC20ABI,
        functionName: "allowance",
        args: tokenIn && address ? [address, CONTRACTS.snowballRouter] : undefined,
        query: { enabled: !!tokenIn && !!address },
    });

    const allowance = (allowanceRaw != null ? allowanceRaw : BigInt(0)) as bigint;

    const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();
    const isApprovalNeeded = amountIn && allowance !== undefined ? allowance < amountIn : false;

    const approve = async () => {
        if (!tokenIn || !amountIn) return;
        return approveAsync({
            address: tokenIn,
            abi: MockERC20ABI,
            functionName: "approve",
            args: [CONTRACTS.snowballRouter, amountIn],
        });
    };

    // 3. Swap Execution
    const { writeContractAsync: swapAsync, isPending: isSwapPending } = useWriteContract();

    const swap = async (slippageTolerance: number = 0.5) => {
        if (!tokenIn || !tokenOut || !amountIn || !expectedAmountOut || !address) return;

        // simple min amount out based on slippage
        const minAmountOut = expectedAmountOut * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

        return swapAsync({
            address: CONTRACTS.snowballRouter,
            abi: SnowballRouterABI,
            functionName: "exactInputSingle",
            args: [{
                tokenIn,
                tokenOut,
                deployer: CONTRACTS.snowballPoolDeployer,
                recipient: address,
                deadline,
                amountIn,
                amountOutMinimum: minAmountOut,
                limitSqrtPrice: BigInt(0),
            }],
        });
    };

    return {
        expectedAmountOut,
        fee,
        isQuoteLoading,
        isApprovalNeeded,
        approve,
        isApprovePending,
        swap,
        isSwapPending,
    };
}
