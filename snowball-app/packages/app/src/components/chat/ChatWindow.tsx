import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Snowflake, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useChat, ChatMessage, RelatedData } from '@/hooks/useChat'
import { ChatBubble } from './ChatBubble'
import { QuickActions } from './QuickActions'
import { CRGauge } from '@/components/common/CRGauge'

// Actions that navigate to a page instead of sending a chat message
const ACTION_ROUTES: Record<string, string> = {
    '담보 추가': '/dashboard',
    '부채 상환': '/dashboard',
    '포지션 조정': '/dashboard',
    '포지션 상세': '/dashboard',
    'CR 조정하기': '/dashboard',
    '이자율 조정': '/dashboard',
    '이자율 변경하기': '/dashboard',
    'Conservative 전략 적용': '/dashboard',
    'Moderate 전략 적용': '/dashboard',
    '포지션 열기': '/borrow',
    'sbUSD 빌리기': '/borrow',
    'wCTC로 포지션 열기': '/borrow',
    'lstCTC로 포지션 열기': '/borrow',
    'SP 예치하기': '/earn',
    'Stability Pool 예치': '/earn',
    'SP 잔액 확인': '/earn',
    '에이전트 활성화': '/agent',
    '에이전트 목록': '/agent',
}

const DEFAULT_ACTIONS = ['Position Summary', 'Strategy Recommendations', 'What is Liquidation?', 'Interest Rate Explained', 'What is a Trove?', 'wCTC vs lstCTC']

interface ChatWindowProps {
    compact?: boolean
}

export function ChatWindow({ compact = false }: ChatWindowProps) {
    const { address } = useAccount()
    const navigate = useNavigate()
    const { mutate: sendMessage, isPending } = useChat()
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Hello! I\'m the Snowball Assistant. Ask me anything about CTC collateral deposits, sbUSD borrowing, liquidation prevention strategies, and more! 🎯',
            timestamp: Date.now() / 1000,
        }
    ])
    const [input, setInput] = useState('')
    const [conversationId, setConversationId] = useState<string | undefined>()
    const [suggestedActions, setSuggestedActions] = useState<string[]>(DEFAULT_ACTIONS)
    const [relatedData, setRelatedData] = useState<RelatedData | undefined>()
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleAction = (action: string) => {
        const route = ACTION_ROUTES[action]
        if (route) {
            navigate(route)
            return
        }
        handleSend(action)
    }

    const handleSend = (text?: string) => {
        const msg = text ?? input.trim()
        if (!msg) return

        const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() / 1000 }
        setMessages((prev) => [...prev, userMsg])
        setInput('')

        sendMessage(
            { userAddress: address, message: msg, conversationId },
            {
                onSuccess: (data) => {
                    setConversationId(data.conversationId)
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: data.reply, timestamp: Date.now() / 1000 },
                    ])
                    if (data.suggestedActions?.length) setSuggestedActions(data.suggestedActions)
                    setRelatedData(data.relatedData)
                },
                onError: () => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: 'Sorry, I was unable to respond. Please try again shortly.',
                            timestamp: Date.now() / 1000,
                        },
                    ])
                },
            }
        )
    }

    return (
        <div className={`flex flex-col bg-dark-800 ${compact ? '' : 'h-full'}`}>
            {/* Messages */}
            <div className={`flex-1 overflow-y-auto space-y-4 p-4 ${compact ? 'max-h-72' : ''}`}>
                {messages.map((msg, i) => (
                    <ChatBubble key={i} {...msg} />
                ))}
                {isPending && (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Snowflake className="w-4 h-4 text-ice-400 animate-spin" />
                        <span className="text-xs">Thinking...</span>
                    </div>
                )}
                {/* Related data inline visualization */}
                {relatedData?.currentCR && (
                    <div className="bg-dark-700 rounded-xl p-3 border border-dark-400/40 text-xs space-y-2">
                        <p className="text-gray-400">Position Status</p>
                        <CRGauge cr={parseFloat(relatedData.currentCR)} mcr={110} />
                        {relatedData.liquidationPrice && (
                            <p className="text-gray-400">Liq. Price: <span className="text-white font-mono">${parseFloat(relatedData.liquidationPrice).toFixed(4)}</span></p>
                        )}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-1 text-ice-400 hover:text-ice-300 transition-colors font-medium mt-1"
                        >
                            <ExternalLink className="w-3 h-3" /> Go to Dashboard to adjust
                        </button>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick Actions */}
            {!compact && (
                <div className="px-4">
                    <QuickActions actions={suggestedActions} onSelect={handleAction} />
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-dark-400/30">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-dark-700 border border-dark-400/40 focus:border-ice-400/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isPending}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-ice-500 to-ice-600 flex items-center justify-center text-white shadow-ice hover:shadow-ice-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
