import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback } from 'react'
import { abis, getSmartAccountFactory } from '@/config/contracts'
import { API_BASE } from '@/config/api'

const FACTORY_ADDRESS = getSmartAccountFactory()

// Agent backend wallet address (should match AGENT_ADDRESS env var)
const AGENT_ADDRESS = import.meta.env.VITE_AGENT_ADDRESS as `0x${string}` | undefined

export function useSmartAccount() {
    const { address } = useAccount()
    const { writeContractAsync } = useWriteContract()
    const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>()

    // Check if user has a SmartAccount
    const { data: hasAccount, refetch: refetchHasAccount } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: abis.smartAccountFactory,
        functionName: 'hasAccount',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    })

    // Get SmartAccount address
    const { data: accountAddress, refetch: refetchAccountAddress } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: abis.smartAccountFactory,
        functionName: 'getAccountAddress',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    })

    // Check if agent is authorized (only if account exists)
    const { data: isAgentAuthorized, refetch: refetchAgentAuth } = useReadContract({
        address: accountAddress as `0x${string}` | undefined,
        abi: abis.smartAccount,
        functionName: 'authorized',
        args: AGENT_ADDRESS ? [AGENT_ADDRESS] : undefined,
        query: { enabled: !!accountAddress && !!hasAccount && !!AGENT_ADDRESS },
    })

    // Wait for pending tx
    useWaitForTransactionReceipt({
        hash: pendingTxHash,
        query: {
            enabled: !!pendingTxHash,
        },
    })

    // Create SmartAccount
    const createAccount = useCallback(async () => {
        if (!address) throw new Error('No wallet connected')
        const hash = await writeContractAsync({
            address: FACTORY_ADDRESS,
            abi: abis.smartAccountFactory,
            functionName: 'createAccount',
            args: [address],
        })
        setPendingTxHash(hash)
        await refetchHasAccount()
        await refetchAccountAddress()
        return hash
    }, [address, writeContractAsync, refetchHasAccount, refetchAccountAddress])

    // Add agent
    const addAgent = useCallback(async (agent: `0x${string}`) => {
        if (!accountAddress) throw new Error('No SmartAccount')
        const hash = await writeContractAsync({
            address: accountAddress as `0x${string}`,
            abi: abis.smartAccount,
            functionName: 'addAgent',
            args: [agent],
        })
        setPendingTxHash(hash)
        await refetchAgentAuth()
        return hash
    }, [accountAddress, writeContractAsync, refetchAgentAuth])

    // Remove agent
    const removeAgent = useCallback(async (agent: `0x${string}`) => {
        if (!accountAddress) throw new Error('No SmartAccount')
        const hash = await writeContractAsync({
            address: accountAddress as `0x${string}`,
            abi: abis.smartAccount,
            functionName: 'removeAgent',
            args: [agent],
        })
        setPendingTxHash(hash)
        await refetchAgentAuth()
        return hash
    }, [accountAddress, writeContractAsync, refetchAgentAuth])

    // Register with backend
    const registerWithBackend = useCallback(async (params: {
        strategy: string
        minCR: number
        autoRebalance: boolean
        autoRateAdjust: boolean
    }) => {
        if (!address || !accountAddress) throw new Error('No wallet or SmartAccount')
        const res = await fetch(`${API_BASE}/agent/server-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: address,
                smartAccountAddress: accountAddress,
                ...params,
            }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to register' }))
            throw new Error(err.error)
        }
        return res.json()
    }, [address, accountAddress])

    // Deactivate agent (backend + on-chain)
    const deactivateAgent = useCallback(async () => {
        if (!address) return
        // Backend deactivation
        await fetch(`${API_BASE}/agent/server-wallet`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: address }),
        })
        // On-chain: remove agent if authorized
        if (AGENT_ADDRESS && isAgentAuthorized && accountAddress) {
            try {
                await removeAgent(AGENT_ADDRESS)
            } catch {
                // Agent may already be removed
            }
        }
    }, [address, isAgentAuthorized, accountAddress, removeAgent])

    const refetch = useCallback(async () => {
        await Promise.all([refetchHasAccount(), refetchAccountAddress(), refetchAgentAuth()])
    }, [refetchHasAccount, refetchAccountAddress, refetchAgentAuth])

    return {
        address,
        hasAccount: !!hasAccount,
        accountAddress: hasAccount ? (accountAddress as `0x${string}`) : undefined,
        isAgentAuthorized: !!isAgentAuthorized,
        agentAddress: AGENT_ADDRESS,
        createAccount,
        addAgent,
        removeAgent,
        registerWithBackend,
        deactivateAgent,
        refetch,
    }
}
