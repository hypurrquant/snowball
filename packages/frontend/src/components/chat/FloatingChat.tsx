import { useState } from 'react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import { ChatWindow } from './ChatWindow'
import { useLocation } from 'react-router-dom'

export function FloatingChat() {
    const [open, setOpen] = useState(false)
    const location = useLocation()

    // Don't show on the full chat page
    if (location.pathname === '/chat') return null

    return (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Chat popup */}
            {open && (
                <div className="w-80 rounded-2xl overflow-hidden shadow-[0_8px_48px_rgba(0,0,0,0.6)] border border-dark-400/50 animate-slide-up flex flex-col bg-dark-800">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-dark-700 to-dark-600 border-b border-dark-400/30">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center text-[10px]">❄</div>
                            <span className="text-sm font-semibold text-white">Snowball Assistant</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-status-safe animate-pulse" />
                        </div>
                        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>
                    <ChatWindow compact />
                </div>
            )}

            {/* FAB button */}
            <button
                onClick={() => setOpen(!open)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-ice-lg transition-all duration-300 ${open
                        ? 'bg-dark-600 border border-dark-400/50 text-gray-300 hover:text-white'
                        : 'bg-gradient-to-br from-ice-400 to-ice-600 text-white hover:shadow-[0_0_32px_rgba(96,165,250,0.5)]'
                    }`}
            >
                {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    )
}
