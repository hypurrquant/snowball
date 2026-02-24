import { ExternalLink } from 'lucide-react'
import { EXPLORER_BASE } from '@/config/api'

interface TxLinkProps {
    hash: string
    short?: boolean
    className?: string
}

export function TxLink({ hash, short = true, className = '' }: TxLinkProps) {
    const display = short ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash
    return (
        <a
            href={`${EXPLORER_BASE}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-ice-400 hover:text-ice-300 font-mono text-xs transition-colors ${className}`}
        >
            {display}
            <ExternalLink className="w-3 h-3" />
        </a>
    )
}
