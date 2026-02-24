import { useAgentHistory } from '@/hooks/useAgentHistory'
import { TxLink } from '@/components/common/TxLink'
import { Clock, RefreshCw } from 'lucide-react'

interface ActivityLogProps {
    agentId?: number
}

// Fallback formatted timestamp
function formatTime(ts: number) {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffH = diffMs / (1000 * 60 * 60)
    if (diffH < 24) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    const diffD = Math.floor(diffH / 24)
    return `${diffD}d ago`
}

export function ActivityLog({ agentId = 1 }: ActivityLogProps) {
    const { data, isLoading, isError } = useAgentHistory(agentId)

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-dark-500 rounded-xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (isError || !data?.entries?.length) {
        return (
            <div className="text-center py-6 text-gray-500 text-sm">
                <RefreshCw className="w-4 h-4 mx-auto mb-2 opacity-40" />
                No activity yet
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {data.entries.map((entry, i) => (
                <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-dark-600/50 transition-colors"
                >
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs min-w-[48px] flex-shrink-0 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timestamp)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium truncate">{entry.action}</p>
                        {entry.details && (
                            <p className="text-xs text-gray-500 truncate">{entry.details}</p>
                        )}
                    </div>
                    {entry.txHash && <TxLink hash={entry.txHash} />}
                </div>
            ))}
        </div>
    )
}
