import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { Shield, ShieldOff, Bot, Loader2, Wallet, Coins, ArrowDownToLine } from 'lucide-react'
import { useSmartAccount } from '@/hooks/useSmartAccount'
import addresses from '@/config/addresses.json'

interface PermissionStatusProps {
    onDeactivated?: () => void
}

export function PermissionStatus({ onDeactivated }: PermissionStatusProps) {
    const {
        hasAccount,
        accountAddress,
        isAgentAuthorized,
        agentAddress,
        deactivateAgent,
        removeAgent,
        refetch,
    } = useSmartAccount()
    const [deactivating, setDeactivating] = useState(false)
    const [withdrawing, setWithdrawing] = useState(false)

    // Token balances in SmartAccount
    const { data: wCTCBalance } = useReadContract({
        address: addresses.tokens.wCTC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: accountAddress ? [accountAddress] : undefined,
        query: { enabled: !!accountAddress },
    })
    const { data: lstCTCBalance } = useReadContract({
        address: addresses.tokens.lstCTC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: accountAddress ? [accountAddress] : undefined,
        query: { enabled: !!accountAddress },
    })
    const { data: sbUSDBalance } = useReadContract({
        address: addresses.tokens.sbUSD as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: accountAddress ? [accountAddress] : undefined,
        query: { enabled: !!accountAddress },
    })

    const handleDeactivate = async () => {
        setDeactivating(true)
        try {
            await deactivateAgent()
            await refetch()
            onDeactivated?.()
        } finally {
            setDeactivating(false)
        }
    }

    const loading = !hasAccount && accountAddress === undefined

    if (loading) {
        return (
            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading agent status...</span>
            </div>
        )
    }

    if (!hasAccount || !isAgentAuthorized) {
        return (
            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldOff className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-400">Agent Not Active</h3>
                </div>
                <p className="text-sm text-gray-500">
                    {!hasAccount
                        ? 'Create a SmartAccount to start automated position management.'
                        : 'Authorize the agent on your SmartAccount to enable automated management.'}
                </p>
            </div>
        )
    }

    const formatBal = (val: bigint | undefined) =>
        val !== undefined ? (Number(val) / 1e18).toFixed(4) : '—'

    return (
        <div className="bg-dark-700 border border-status-safe/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-status-safe" />
                    <h3 className="font-semibold text-white">Agent Active</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-status-safe/20 text-status-safe">
                    RUNNING
                </span>
            </div>

            {/* SmartAccount info */}
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> SmartAccount
                    </span>
                    <span className="text-white font-mono text-xs">
                        {accountAddress
                            ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
                            : '—'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Agent
                    </span>
                    <span className="text-white font-mono text-xs">
                        {agentAddress
                            ? `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`
                            : '—'}
                    </span>
                </div>
            </div>

            {/* Token balances */}
            <div className="space-y-1.5">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> SmartAccount Balances
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-dark-600/50 rounded-lg p-2 text-center">
                        <p className="text-gray-500">wCTC</p>
                        <p className="text-white font-mono">{formatBal(wCTCBalance)}</p>
                    </div>
                    <div className="bg-dark-600/50 rounded-lg p-2 text-center">
                        <p className="text-gray-500">lstCTC</p>
                        <p className="text-white font-mono">{formatBal(lstCTCBalance)}</p>
                    </div>
                    <div className="bg-dark-600/50 rounded-lg p-2 text-center">
                        <p className="text-gray-500">sbUSD</p>
                        <p className="text-white font-mono">{formatBal(sbUSDBalance)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-dark-600/50 rounded-xl p-3 text-xs text-gray-500">
                The agent is monitoring your positions via your SmartAccount and will
                automatically execute transactions based on your strategy settings.
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleDeactivate}
                    disabled={deactivating}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                    {deactivating ? 'Deactivating...' : 'Remove Agent'}
                </button>
            </div>
        </div>
    )
}
