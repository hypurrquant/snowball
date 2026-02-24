import { useMutation, useQuery } from '@tanstack/react-query'
import { CHAT_API_BASE } from '@/config/api'

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

export interface ChatRequest {
    userAddress?: string
    message: string
    conversationId?: string
}

export interface RelatedData {
    currentCR?: string
    liquidationPrice?: string
    healthStatus?: 'safe' | 'warning' | 'danger'
}

export interface ChatResponse {
    reply: string
    conversationId: string
    suggestedActions?: string[]
    relatedData?: RelatedData
}

export function useChat() {
    return useMutation<ChatResponse, Error, ChatRequest>({
        mutationFn: async (body) => {
            const res = await fetch(`${CHAT_API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error('Chat API error')
            return res.json()
        },
    })
}

export function useChatHistory(conversationId?: string) {
    return useQuery<{ conversationId: string; messages: ChatMessage[] }>({
        queryKey: ['chat-history', conversationId],
        queryFn: async () => {
            const res = await fetch(`${CHAT_API_BASE}/chat/history?conversationId=${conversationId}`)
            if (!res.ok) throw new Error('Failed to fetch chat history')
            return res.json()
        },
        enabled: !!conversationId,
        staleTime: Infinity,
    })
}
