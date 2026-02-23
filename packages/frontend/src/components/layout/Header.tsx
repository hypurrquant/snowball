import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { AlertTriangle, Wallet, LogOut } from 'lucide-react'

export function Header() {
    const { ready, authenticated, login, logout, user } = usePrivy()
    const { address, chain } = useAccount()

    const unsupported = chain && chain.id !== 102031

    const displayAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : user?.email?.address ?? 'Connected'

    return (
        <header className="h-16 bg-dark-800/80 backdrop-blur-md border-b border-dark-400/30 flex items-center justify-between px-6 sticky top-0 z-30">
            {/* Network badge */}
            <div className="flex items-center gap-2 bg-dark-700 rounded-xl px-3 py-1.5 border border-dark-400/40">
                {unsupported ? (
                    <>
                        <AlertTriangle className="w-3 h-3 text-status-danger" />
                        <span className="text-xs font-medium text-status-danger">Wrong Network</span>
                    </>
                ) : (
                    <>
                        <div className="w-2 h-2 rounded-full bg-status-safe animate-pulse" />
                        <span className="text-xs font-medium text-gray-300">Creditcoin Testnet</span>
                    </>
                )}
            </div>

            {/* Wallet */}
            <div>
                {!ready ? (
                    <div className="h-9 w-32 bg-dark-600 rounded-xl animate-pulse" />
                ) : authenticated ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-dark-700 border border-dark-400/40 rounded-xl px-4 py-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ice-400 to-ice-600" />
                            <span className="text-sm font-medium text-white font-mono">
                                {displayAddress}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 bg-dark-700 hover:bg-dark-600 border border-dark-400/40 rounded-xl px-3 py-2 text-gray-400 hover:text-white transition-all duration-200"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={login}
                        className="flex items-center gap-2 bg-gradient-to-r from-ice-500 to-ice-600 hover:from-ice-400 hover:to-ice-500 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-ice transition-all duration-200 hover:shadow-ice-lg"
                    >
                        <Wallet className="w-4 h-4" />
                        Login
                    </button>
                )}
            </div>
        </header>
    )
}
