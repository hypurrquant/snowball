import { ExternalLink } from 'lucide-react'

const NAV_ACTIONS = new Set([
    '담보 추가', '부채 상환', '포지션 조정', '포지션 상세', 'CR 조정하기',
    '이자율 조정', '이자율 변경하기', 'Conservative 전략 적용', 'Moderate 전략 적용',
    '포지션 열기', 'sbUSD 빌리기', 'wCTC로 포지션 열기', 'lstCTC로 포지션 열기',
    'SP 예치하기', 'Stability Pool 예치', 'SP 잔액 확인', '에이전트 활성화', '에이전트 목록',
])

interface QuickActionsProps {
    actions: string[]
    onSelect: (action: string) => void
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
    if (!actions.length) return null
    return (
        <div className="flex flex-wrap gap-2 py-2">
            {actions.map((action) => {
                const isNav = NAV_ACTIONS.has(action)
                return (
                    <button
                        key={action}
                        onClick={() => onSelect(action)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-dark-600 border border-ice-400/20 text-ice-300 hover:bg-ice-400/10 hover:border-ice-400/50 transition-all duration-200 font-medium"
                    >
                        {action}
                        {isNav && <ExternalLink className="w-3 h-3 opacity-60" />}
                    </button>
                )
            })}
        </div>
    )
}
