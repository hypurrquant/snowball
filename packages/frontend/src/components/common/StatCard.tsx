import React from 'react'

interface StatCardProps {
    label: string
    value: string | number
    sub?: string
    icon?: React.ReactNode
    trend?: 'up' | 'down' | 'neutral'
    loading?: boolean
}

export function StatCard({ label, value, sub, icon, loading }: StatCardProps) {
    return (
        <div className="relative overflow-hidden bg-dark-700 border border-dark-400/50 rounded-2xl p-5 hover:border-ice-400/30 hover:shadow-card-hover transition-all duration-300 group">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-ice-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-dark-500 rounded-lg animate-pulse" />
                    ) : (
                        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                    )}
                    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
                </div>
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-ice-400/10 flex items-center justify-center text-ice-400">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
