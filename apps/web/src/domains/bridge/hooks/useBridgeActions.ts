"use client";

import { erc20Abi, type Address } from "viem";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { bridgeContracts, USC_CHAIN_KEY } from "../lib/bridgeConfig";
import { creditcoinTestnet, sepoliaChain } from "@/core/config/chain";

export function useBridgeActions() {
  const config = useConfig();
  const ccWrite = useChainWriteContract(creditcoinTestnet.id);
  const sepoliaWrite = useChainWriteContract(sepoliaChain.id);

  const approveUSDC = async (amount: bigint) => {
    const hash = await ccWrite.writeContractAsync({
      address: bridgeContracts.usdc.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [bridgeContracts.vault.address, amount],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  const depositToVault = async (amount: bigint) => {
    const hash = await ccWrite.writeContractAsync({
      address: bridgeContracts.vault.address,
      abi: bridgeContracts.vault.abi,
      functionName: "deposit",
      args: [amount, USC_CHAIN_KEY],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  const mintDN = async (to: Address, amount: bigint) => {
    const hash = await sepoliaWrite.writeContractAsync({
      address: bridgeContracts.dnToken.address,
      abi: bridgeContracts.dnToken.abi,
      functionName: "mint",
      args: [to, amount],
    });
    await waitForTransactionReceipt(config, { hash, chainId: sepoliaChain.id });
    return hash;
  };

  const burnDN = async (amount: bigint) => {
    const hash = await sepoliaWrite.writeContractAsync({
      address: bridgeContracts.dnToken.address,
      abi: bridgeContracts.dnToken.abi,
      functionName: "bridgeBurn",
      args: [amount, USC_CHAIN_KEY],
    });
    await waitForTransactionReceipt(config, { hash, chainId: sepoliaChain.id });
    return hash;
  };

  return {
    approveUSDC,
    depositToVault,
    mintDN,
    burnDN,
    isApproving: ccWrite.isPending,
    isSigning: sepoliaWrite.isPending,
  };
}
