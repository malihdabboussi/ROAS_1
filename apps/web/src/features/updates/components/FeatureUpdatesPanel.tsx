'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { FeatureUpdateMockup } from '@/features/updates/components/FeatureUpdateMockups'
import type { FeatureUpdate } from '@/features/updates/types'

export interface FeatureUpdatesPanelProps {
  open: boolean
  anchorEl: HTMLElement | null
  updates: FeatureUpdate[]
  loading: boolean
  onClose: () => void
  onSelect: (update: FeatureUpdate) => void
}

export function FeatureUpdatesPanel({
  open,
  anchorEl,
  updates,
  loading,
  onClose,
  onSelect,
}: FeatureUpdatesPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorEl) return
    const updatePos = () => {
      const rect = anchorEl.getBoundingClientRect()
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const panelW = 320
      if (isMobile) {
        const left = Math.max(8, rect.left + rect.width / 2 - panelW / 2)
        setPos({ bottom: Math.max(8, window.innerHeight - rect.bottom), left })
      } else {
        let left = rect.right + 8
        if (left + panelW > window.innerWidth - 8) {
          left = rect.left - panelW - 8
        }
        const bottom = Math.max(8, window.innerHeight - rect.bottom)
        setPos({ bottom, left })
      }
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open, anchorEl])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorEl?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorEl])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      data-feature-updates-panel
      className="surface-card border-border rounded-spacing-4 fixed z-[999] flex max-h-[70vh] w-[320px] flex-col overflow-hidden border shadow-lg"
      style={{ bottom: pos.bottom, left: pos.left }}
    >
      <div className="px-spacing-4 pb-spacing-2 pt-spacing-4">
        <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wider">
          What&apos;s New
        </span>
      </div>
      <div className="px-spacing-3 pb-spacing-3 flex flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="gap-spacing-4 py-spacing-8 flex flex-col items-center justify-center">
            <VibeyLoadingOrb state="processing" size="sm" />
            <p className="body-3 text-muted-foreground">Loading updates…</p>
          </div>
        ) : updates.length === 0 ? (
          <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-4 text-center">
            No updates yet
          </p>
        ) : (
          <div className="space-y-spacing-2">
            {updates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelect(u)}
                className="hover:bg-hover-subtle rounded-spacing-2 p-spacing-2 gap-spacing-3 flex w-full cursor-pointer text-left transition-all"
              >
                <div className="min-w-0 flex-1">
                  <span className="body-2 text-foreground block truncate font-medium">
                    {u.title}
                  </span>
                  <p className="body-4 text-muted-foreground mt-spacing-1 line-clamp-2">
                    {u.description}
                  </p>
                </div>
                <div className="rounded-spacing-2 h-14 w-20 shrink-0 overflow-hidden">
                  <FeatureUpdateMockup title={u.title} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
