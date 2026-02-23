interface QuickActionsProps {
    actions: string[]
    onSelect: (action: string) => void
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
    if (!actions.length) return null
    return (
        <div className="flex flex-wrap gap-2 py-2">
            {actions.map((action) => (
                <button
                    key={action}
                    onClick={() => onSelect(action)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-dark-600 border border-ice-400/20 text-ice-300 hover:bg-ice-400/10 hover:border-ice-400/50 transition-all duration-200 font-medium"
                >
                    {action}
                </button>
            ))}
        </div>
    )
}
