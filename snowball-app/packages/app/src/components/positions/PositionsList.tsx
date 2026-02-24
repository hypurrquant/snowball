import { useState } from 'react'
import { Position } from '@/hooks/useUserPositions'
import { TroveCard } from './TroveCard'
import { AdjustTroveModal } from './AdjustTroveModal'
import { CloseTroveModal } from './CloseTroveModal'
import { AdjustRateModal } from './AdjustRateModal'
import { useNavigate } from 'react-router-dom'

interface PositionsListProps {
    positions: Position[]
    loading?: boolean
}

type ModalType = 'adjust' | 'close' | 'rate' | null

export function PositionsList({ positions, loading }: PositionsListProps) {
    const navigate = useNavigate()
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
    const [modalType, setModalType] = useState<ModalType>(null)

    const openModal = (pos: Position, type: ModalType) => {
        setSelectedPosition(pos)
        setModalType(type)
    }

    const closeModal = () => {
        setSelectedPosition(null)
        setModalType(null)
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-56 bg-dark-700 rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (!positions.length) {
        return (
            <div className="text-center py-12 space-y-3">
                <div className="text-4xl">❄️</div>
                <p className="text-gray-400 font-medium">No positions yet</p>
                <p className="text-gray-600 text-sm">Open your first Trove on the Borrow page!</p>
                <button
                    onClick={() => navigate('/borrow')}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-ice-500 to-ice-600 text-white rounded-xl text-sm font-semibold shadow-ice hover:shadow-ice-lg transition-all"
                >
                    Open Position →
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4">
                {positions.map((pos) => (
                    <TroveCard
                        key={`${pos.branch}-${pos.troveId}`}
                        position={pos}
                        onAdjust={() => openModal(pos, 'adjust')}
                        onClose={() => openModal(pos, 'close')}
                        onAdjustRate={() => openModal(pos, 'rate')}
                    />
                ))}
            </div>

            {/* Modals */}
            {selectedPosition && modalType === 'adjust' && (
                <AdjustTroveModal position={selectedPosition} onClose={closeModal} />
            )}
            {selectedPosition && modalType === 'close' && (
                <CloseTroveModal position={selectedPosition} onClose={closeModal} />
            )}
            {selectedPosition && modalType === 'rate' && (
                <AdjustRateModal position={selectedPosition} onClose={closeModal} />
            )}
        </>
    )
}
