import { useMutation } from '@tanstack/react-query'
import { API_BASE } from '@/config/api'

export interface AgentRecommendRequest {
    userAddress: string
    collateralType: 'wCTC' | 'lstCTC'
    amount: string
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
}

export interface AgentRecommendResponse {
    strategy: string
    recommendedCR: number
    recommendedDebt: string
    recommendedInterestRate: string
    estimatedAPY: string
    liquidationPrice: string
    reasoning: string
}

export function useAgentRecommend() {
    return useMutation<AgentRecommendResponse, Error, AgentRecommendRequest>({
        mutationFn: async (body) => {
            const res = await fetch(`${API_BASE}/agent/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error('Failed to get agent recommendation')
            return res.json()
        },
    })
}
