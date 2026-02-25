import { useWriteContract, useReadContracts, useAccount } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import { NonfungiblePositionManagerABI, MockERC20ABI } from "@/abis";
import { Address } from "viem";

export function useAddLiquidity() {
    const { address } = useAccount();
    const { writeContractAsync: mintAsync, isPending: isMintPending } = useWriteContract();
    const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();

    const mint = async ({
        token0,
        token1,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        slippageTolerance = 0.5,
    }: {
        token0: Address;
        token1: Address;
        tickLower: number;
        tickUpper: number;
        amount0Desired: bigint;
        amount1Desired: bigint;
        slippageTolerance?: number;
    }) => {
        if (!address) return;

        const amount0Min = amount0Desired * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);
        const amount1Min = amount1Desired * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

        return mintAsync({
            address: CONTRACTS.nonfungiblePositionManager,
            abi: NonfungiblePositionManagerABI,
            functionName: "mint",
            args: [{
                token0,
                token1,
                deployer: CONTRACTS.snowballPoolDeployer,
                tickLower,
                tickUpper,
                amount0Desired,
                amount1Desired,
                amount0Min,
                amount1Min,
                recipient: address,
                deadline,
            }],
        });
    };

    const approveToken = async (token: Address, amount: bigint) => {
        return approveAsync({
            address: token,
            abi: MockERC20ABI,
            functionName: "approve",
            args: [CONTRACTS.nonfungiblePositionManager, amount],
        });
    };

    return {
        mint,
        isMintPending,
        approveToken,
        isApprovePending,
    };
}
