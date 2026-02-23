import { useState } from 'react'
import { Shield, ShieldOff, Bot, Loader2, Wallet } from 'lucide-react'
import { usePrivyServerWallet } from '@/hooks/usePrivyServerWallet'

interface PermissionStatusProps {
    onDeactivated?: () => void
}

export function PermissionStatus({ onDeactivated }: PermissionStatusProps) {
    const { serverWallet, serverWalletLoading, hasServerWallet, deactivateServerWallet } = usePrivyServerWallet()
    const [deactivating, setDeactivating] = useState(false)

    const handleDeactivate = async () => {
        setDeactivating(true)
        try {
            await deactivateServerWallet()
            onDeactivated?.()
        } finally {
            setDeactivating(false)
        }
    }

    // Show spinner only on very first load (no data yet), not on background refetches
    if (serverWalletLoading && serverWallet === undefined) {
        return (
            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading agent status...</span>
            </div>
        )
    }

    if (!hasServerWallet) {
        return (
            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldOff className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-400">Agent Not Active</h3>
                </div>
                <p className="text-sm text-gray-500">
                    Activate the agent to start automated position management.
                    A Privy server wallet will be created for secure transaction signing.
                </p>
            </div>
        )
    }

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

            {/* Server wallet info */}
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Server Wallet
                    </span>
                    <span className="text-white font-mono text-xs">
                        {serverWallet?.serverWalletAddress
                            ? `${serverWallet.serverWalletAddress.slice(0, 6)}...${serverWallet.serverWalletAddress.slice(-4)}`
                            : '—'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Strategy
                    </span>
                    <span className="text-white capitalize">{serverWallet?.strategy ?? '—'}</span>
                </div>

                {serverWallet?.createdAt && (
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Active Since</span>
                        <span className="text-gray-300 text-xs">
                            {new Date(serverWallet.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            <div className="bg-dark-600/50 rounded-xl p-3 text-xs text-gray-500">
                The agent is monitoring your positions and will automatically execute
                transactions through the server wallet based on your strategy settings.
            </div>

            {/* Deactivate button */}
            <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="w-full py-2 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
                {deactivating ? 'Deactivating...' : 'Deactivate Agent'}
            </button>
        </div>
    )
}
