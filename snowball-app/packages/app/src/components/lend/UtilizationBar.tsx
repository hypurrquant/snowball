export function UtilizationBar({ utilization, target = 90 }: { utilization: number, target?: number }) {
    const bounded = Math.min(100, Math.max(0, utilization));
    const isHigh = bounded >= target;

    return (
        <div className="space-y-1 w-full">
            <div className="h-2 w-full bg-dark-600 rounded-full overflow-hidden relative">
                <div
                    className={`h-full transition-all duration-500 ${isHigh ? 'bg-red-500' : 'bg-gradient-to-r from-ice-600 to-ice-400'}`}
                    style={{ width: `${bounded}%` }}
                />
                <div
                    className="absolute top-0 bottom-0 bg-white/20 w-px"
                    style={{ left: `${target}%` }}
                />
            </div>
        </div>
    )
}
