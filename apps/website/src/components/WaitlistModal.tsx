'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { WaitlistJoinForm } from '@/components/WaitlistJoinForm'

const GLASS = {
  overlay: { background: 'var(--overlay-scrim)', backdropFilter: 'blur(8px)' },
  card: {
    background: 'linear-gradient(135deg, var(--glass-stop-05) 0%, var(--glass-stop-02) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 8px 32px var(--shadow-modal), inset 0 1px 0 var(--glass-stop-10)',
  },
} as const

export function WaitlistModal({
  open,
  onClose,
  pendingMessage,
}: {
  open: boolean
  onClose: () => void
  pendingMessage: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      style={GLASS.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[400px] rounded-2xl p-8" style={GLASS.card}>
        <div className="mb-6 flex items-center justify-end">
          <button onClick={onClose} className="text-color-muted transition-colors hover:text-white">
            <X size={20} />
          </button>
        </div>
        <WaitlistJoinForm initialNotes={pendingMessage || undefined} onDone={onClose} />
      </div>
    </div>
  )
}
