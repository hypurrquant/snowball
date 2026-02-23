interface ChatBubbleProps {
    role: 'user' | 'assistant'
    content: string
    timestamp?: number
}

function renderMarkdown(text: string) {
    // Split by double newlines for paragraphs, single newlines for lines
    const blocks = text.split(/\n\n+/)

    return blocks.map((block, bi) => {
        const lines = block.split('\n')
        return (
            <div key={bi} className={bi > 0 ? 'mt-2' : ''}>
                {lines.map((line, li) => {
                    // Table row
                    if (line.startsWith('|')) {
                        const cells = line.split('|').filter(Boolean).map((c) => c.trim())
                        if (cells.every((c) => /^-+$/.test(c))) return null // separator row
                        return (
                            <div key={li} className="flex gap-3 text-xs py-0.5">
                                {cells.map((cell, ci) => (
                                    <span key={ci} className={ci === 0 ? 'text-gray-400 w-24 flex-shrink-0' : 'text-white'}>
                                        {renderInline(cell)}
                                    </span>
                                ))}
                            </div>
                        )
                    }
                    // Bullet item
                    if (line.startsWith('- ')) {
                        return (
                            <div key={li} className="flex gap-1.5 pl-1">
                                <span className="text-ice-400 flex-shrink-0">·</span>
                                <span>{renderInline(line.slice(2))}</span>
                            </div>
                        )
                    }
                    // Regular line
                    return <div key={li}>{renderInline(line)}</div>
                })}
            </div>
        )
    })
}

function renderInline(text: string) {
    // Parse **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="font-semibold text-white">{part.slice(2, -2)}</span>
        }
        return <span key={i}>{part}</span>
    })
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
    const isUser = role === 'user'
    const time = timestamp ? new Date(timestamp * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[80%] space-y-1`}>
                {!isUser && (
                    <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center text-[10px]">❄</div>
                        <span className="text-[10px] text-gray-500 font-medium">Snowball Assistant</span>
                    </div>
                )}
                <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                            ? 'bg-gradient-to-br from-ice-500 to-ice-600 text-white rounded-tr-sm shadow-ice'
                            : 'bg-dark-600 border border-dark-400/40 text-gray-200 rounded-tl-sm'
                        }`}
                >
                    {isUser ? content : renderMarkdown(content)}
                </div>
                {time && <p className={`text-[10px] text-gray-600 ${isUser ? 'text-right' : 'text-left'} px-1`}>{time}</p>}
            </div>
        </div>
    )
}
