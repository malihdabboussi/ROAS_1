'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { TraceDetail } from './TraceDetail'
import type { AgentTrace, AgentTraceSummary } from '../types/agent-trace.types'

const MIN_WIDTH = 64
const MAX_WIDTH_PCT = 60

const panelTransition = {
  type: 'spring' as const,
  damping: 32,
  stiffness: 360,
  mass: 0.85,
}

const backdropTransition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] }

interface TraceSlidePanelProps {
  summary: AgentTraceSummary | null
  detail: AgentTrace | null
  detailLoading: boolean
  detailError: string | null
  onClose: () => void
  onRetry: () => void
}

export function TraceSlidePanel({
  summary,
  detail,
  detailLoading,
  detailError,
  onClose,
  onRetry,
}: TraceSlidePanelProps) {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth * (MAX_WIDTH_PCT / 100) : 480,
  )
  const [idCopied, setIdCopied] = useState(false)
  const dragRef = useRef({ startX: 0, startWidth: 0 })

  useEffect(() => {
    setIdCopied(false)
  }, [summary?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (summary) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [summary, onClose])

  useEffect(() => {
    if (summary) {
      document.body.style.overflow = 'hidden'
    }
  }, [summary])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleResizeStart = (e: ReactMouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: width }
    const onMove = (move: MouseEvent) => {
      const maxW = window.innerWidth * (MAX_WIDTH_PCT / 100)
      const deltaX = move.clientX - dragRef.current.startX
      const newWidth = dragRef.current.startWidth - deltaX
      setWidth(Math.min(maxW, Math.max(MIN_WIDTH, newWidth)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const maxW = typeof window !== 'undefined' ? window.innerWidth * (MAX_WIDTH_PCT / 100) : 600
  const panelWidth = Math.min(maxW, Math.max(MIN_WIDTH, width))

  return (
    <AnimatePresence
      onExitComplete={() => {
        document.body.style.overflow = ''
      }}
    >
      {summary ? (
        <>
          <motion.div
            key="trace-backdrop"
            role="presentation"
            className="fixed inset-0 z-40 bg-background/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="trace-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Trace detail"
            className="surface-card border-border fixed top-0 right-0 z-50 flex h-screen flex-col border-l shadow-2xl"
            style={{ width: panelWidth }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={panelTransition}
          >
            <div
              className="hover:bg-primary/30 absolute top-0 bottom-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize transition-colors"
              onMouseDown={handleResizeStart}
              aria-label="Resize panel"
            />
            <div className="border-border flex min-w-0 shrink-0 items-center justify-between gap-spacing-3 border-b p-spacing-4">
              <h2 className="title-h3 min-w-0 truncate text-lg">Trace</h2>
              <div className="gap-spacing-2 flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(summary.id).then(() => {
                      setIdCopied(true)
                      window.setTimeout(() => setIdCopied(false), 2000)
                    })
                  }}
                  className="button-glass-neutral body-4 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle text-foreground flex items-center font-medium transition-colors"
                >
                  {idCopied ? (
                    <Check className="icon-sm text-emerald-500" aria-hidden />
                  ) : (
                    <Copy className="icon-sm" aria-hidden />
                  )}
                  {idCopied ? 'Copied' : 'Copy ID'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-spacing-2 hover:bg-muted/50 rounded-spacing-2 p-spacing-2 transition-colors"
                  aria-label="Close"
                >
                  <X className="icon-sm" />
                </button>
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto p-spacing-4">
              {detailError ? (
                <div className="gap-spacing-4 flex flex-col items-start">
                  <p className="body-3 text-destructive">{detailError}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : detailLoading && !detail ? (
                <div className="py-spacing-12 flex min-h-[200px] items-center justify-center">
                  <VibeyLoadingOrb text="Loading trace…" state="processing" size="md" />
                </div>
              ) : detail ? (
                <TraceDetail trace={detail} />
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
