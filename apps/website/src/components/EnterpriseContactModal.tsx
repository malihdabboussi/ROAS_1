'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { EnterpriseContactForm } from '@/components/EnterpriseContactForm'
import { SiteLogo } from '@/components/SiteLogo'

const GLASS = {
  overlay: { background: 'var(--overlay-scrim)', backdropFilter: 'blur(8px)' },
  card: {
    background: 'linear-gradient(135deg, var(--glass-stop-05) 0%, var(--glass-stop-02) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 8px 32px var(--shadow-modal), inset 0 1px 0 var(--glass-stop-10)',
  },
} as const

export function EnterpriseContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto px-4 py-8"
      style={GLASS.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[440px] rounded-2xl p-8" style={GLASS.card}>
        <div className="mb-6 flex items-center justify-end">
          <button onClick={onClose} className="text-color-muted transition-colors hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="mb-6 text-center">
          <SiteLogo forceDark className="mx-auto mb-3 !h-12" />
          <h2 className="h3 text-white">Enterprise Inquiry</h2>
          <p className="text-color-muted body-3 mt-1">
            Tell us about your team and we&apos;ll get back to you.
          </p>
        </div>
        <EnterpriseContactForm onDone={onClose} />
      </div>
    </div>
  )
}
