'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** Clicks on these surfaces while doc panel is open must NOT dismiss it (chat, portaled menus/modals, floating toolbars). */
function isPointerOnRetainedSurface(target: Element): boolean {
  return Boolean(
    target.closest('[data-spaces-chat-panel]') ||
    target.closest('.z-dropdown') ||
    target.closest('.dropdown-menu-solid') ||
    target.closest('.dropdown-glass') ||
    target.closest('.z-modal-content') ||
    target.closest('.z-modal-backdrop') ||
    target.closest('.z-modal-backdrop-above') ||
    target.closest('.z-modal-layer-3') ||
    target.closest('.z-modal-layer-4') ||
    target.closest('[role="dialog"]') ||
    target.closest('[aria-modal="true"]') ||
    target.closest('[data-icon-picker-popup]') ||
    target.closest('[data-form-slash-popover]') ||
    target.closest('[data-doc-menu]') ||
    target.closest('[data-doc-export-menu]') ||
    target.closest('[data-doc-table-controls]') ||
    target.closest('[data-doc-slash-menu]') ||
    target.closest('[data-doc-drop-indicator]') ||
    target.closest('[data-doc-image-insert-dropdown]') ||
    target.closest('[data-media-menu]'),
  )
}

export function DocEditorPanelPortalShell({
  portalTarget,
  isResizing,
  requestClosePanel,
  panelSlideExiting,
  panelWidth,
  handleResizePointerDown,
  onSlideAnimationComplete,
  children,
}: {
  portalTarget: HTMLElement | null
  isResizing: boolean
  requestClosePanel: () => void
  panelSlideExiting: boolean
  panelWidth: number
  handleResizePointerDown: (e: React.PointerEvent) => void
  onSlideAnimationComplete: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  /** Outer container is `pointer-events-none` so chat/underlying UI stays clickable; dismissal goes through a document listener that skips the panel itself, chat, and portaled floating UI. */
  useEffect(() => {
    if (!portalTarget) return
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const t = e.target
      if (!(t instanceof Element)) return
      if (panelRef.current?.contains(t)) return
      if (isPointerOnRetainedSurface(t)) return
      requestClosePanel()
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [portalTarget, requestClosePanel])

  if (!portalTarget) return null

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[60] flex justify-end overflow-hidden',
        isResizing && 'select-none',
      )}
    >
      <motion.div
        ref={panelRef}
        className="pointer-events-auto flex max-h-full shrink-0 items-stretch py-3"
        initial={{ x: '100%' }}
        animate={{ x: panelSlideExiting ? '100%' : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        onAnimationComplete={onSlideAnimationComplete}
      >
        <div
          className="group relative flex w-4 flex-shrink-0 cursor-col-resize items-center justify-center"
          onPointerDown={handleResizePointerDown}
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
        >
          <div
            className={`resize-divider-line-blue-compact absolute left-1/2 w-px -translate-x-1/2 transition-opacity ${
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
            }`}
          />
          <GripVertical
            className={`h-4 w-4 transition-opacity ${isResizing ? 'opacity-0' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
          />
        </div>
        <div
          className="flex min-h-0 flex-col overflow-hidden rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--background)] shadow-xl"
          style={{ width: panelWidth }}
        >
          {children}
        </div>
      </motion.div>
    </div>,
    portalTarget,
  )
}
