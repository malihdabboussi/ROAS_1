'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { isPointerInSpacesSlidePreviewDismissZone } from '../../lib/spaces-slide-preview-dismiss'
import {
  persistArtifactPreviewWidth,
  readStoredArtifactPreviewWidth,
} from '../../store/use-spaces-store'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { CampaignSlidePreviewBody } from './campaign-slide-preview-body'

const DEFAULT_WIDTH_PERCENT = 45
const MIN_WIDTH_PERCENT = 25
const MAX_WIDTH_PERCENT = 65

/** Don’t collapse the artifact panel when interacting with overlays portaled outside the panel. */
function isPointerLikelyFloatingUi(target: Element | null): boolean {
  return Boolean(
    target?.closest('.z-dropdown') ||
    target?.closest('.dropdown-menu-solid') ||
    target?.closest('.z-modal-content') ||
    target?.closest('.z-modal-backdrop') ||
    target?.closest('.z-modal-layer-3') ||
    target?.closest('[data-icon-picker-popup]') ||
    target?.closest('[data-form-slash-popover]'),
  )
}

/** Clicking another artifact card should swap preview content, not close/reopen the panel. */
function isPointerOnArtifactCard(target: Element | null): boolean {
  return Boolean(target?.closest('[data-artifact-card]'))
}

interface ArtifactPreviewPanelHostProps {
  /** Right-area flex-row container the panel measures against for drag math. */
  parentRef: RefObject<HTMLDivElement | null>
  campaignId: string
  selection: ArtifactPreviewSelection | null
  onClose: () => void
  onOpenFullView?: () => void
}

export function ArtifactPreviewPanelHost({
  parentRef,
  campaignId,
  selection,
  onClose,
  onOpenFullView,
}: ArtifactPreviewPanelHostProps) {
  const panelAsideRef = useRef<HTMLElement | null>(null)
  const defaultWidth = useMemo(() => readStoredArtifactPreviewWidth() ?? DEFAULT_WIDTH_PERCENT, [])
  const [widthPercent, setWidthPercent] = useState<number>(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const lastSelectionRef = useRef<ArtifactPreviewSelection | null>(selection)

  useEffect(() => {
    if (!selection) return
    const onPointerDownCapture = (e: PointerEvent) => {
      if (isDragging) return
      const el = panelAsideRef.current
      const t = e.target
      if (!(t instanceof Element)) return
      if (el?.contains(t)) return
      if (!isPointerInSpacesSlidePreviewDismissZone(t)) return
      if (isPointerLikelyFloatingUi(t)) return
      if (isPointerOnArtifactCard(t)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [selection, onClose, isDragging])

  useEffect(() => {
    if (selection) lastSelectionRef.current = selection
  }, [selection])

  useEffect(() => {
    persistArtifactPreviewWidth(widthPercent)
  }, [widthPercent])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const container = parentRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0) return
      const fromRight = rect.right - e.clientX
      const percent = (fromRight / rect.width) * 100
      const clamped = Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, percent))
      setWidthPercent(clamped)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, parentRef])

  const renderedSelection = selection ?? lastSelectionRef.current

  /** Flex-basis (% of row) avoids % width fighting flex-shrink — smoother sibling reflow vs grid jumps. */
  const panelTransition = !isDragging
    ? { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] as const }
    : { duration: 0 }

  return (
    <AnimatePresence initial={false}>
      {selection && renderedSelection ? (
        <motion.aside
          ref={panelAsideRef}
          key="artifact-preview-host"
          initial={{ flexBasis: '0%' }}
          animate={{ flexBasis: `${widthPercent}%` }}
          exit={{ flexBasis: '0%' }}
          transition={panelTransition}
          className="flex min-h-0 min-w-0 shrink-0 grow-0 overflow-hidden"
        >
          <ResizableDivider
            onMouseDown={handleMouseDown}
            isDragging={isDragging}
            compact
            showGrip={false}
          />
          <div className="card-glass flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <CampaignSlidePreviewBody
              campaignId={campaignId}
              selection={renderedSelection}
              onSlideClose={onClose}
              slideOverShowCloseButton={false}
              onOpenFullView={onOpenFullView}
            />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
