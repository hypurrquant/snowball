import { Snowflake } from 'lucide-react'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { QuickActions } from '@/components/chat/QuickActions'
import { useState } from 'react'

const DEFAULT_QUICK_ACTIONS = ['Position Summary', 'Strategy Recommendations', 'What is Liquidation?', 'Interest Rate Explained', 'How to Use sbUSD?']

export function Chat() {
    const [externalMessage, setExternalMessage] = useState<string | undefined>()

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center shadow-ice">
                    <Snowflake className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Snowball Assistant</h1>
                    <p className="text-xs text-gray-500">AI analyzes your positions and recommends strategies</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-status-safe">
                    <div className="w-2 h-2 rounded-full bg-status-safe animate-pulse" />
                    Online
                </div>
            </div>

            {/* Quick actions */}
            <QuickActions
                actions={DEFAULT_QUICK_ACTIONS}
                onSelect={(action) => setExternalMessage(action)}
            />

            {/* Chat window */}
            <div className="flex-1 bg-dark-700 border border-dark-400/40 rounded-2xl overflow-hidden flex flex-col min-h-0">
                <ChatWindow />
            </div>
        </div>
    )
}
