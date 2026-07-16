'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { getAsset, type MediaAsset } from '@/lib/services/media-api'
import { isPointerInSpacesSlidePreviewDismissZone } from '../../lib/spaces-slide-preview-dismiss'
import {
  persistArtifactPreviewWidth,
  readStoredArtifactPreviewWidth,
} from '../../store/use-spaces-store'
import { MediaImageWorkspace } from './MediaImageWorkspace'

const DEFAULT_WIDTH_PERCENT = 52
const MIN_WIDTH_PERCENT = 32
const MAX_WIDTH_PERCENT = 72

function isPointerLikelyFloatingUi(target: Element | null): boolean {
  return Boolean(
    target?.closest('.z-dropdown') ||
      target?.closest('.dropdown-menu-solid') ||
      target?.closest('.z-modal-content') ||
      target?.closest('.z-modal-backdrop') ||
      target?.closest('.z-modal-backdrop-above') ||
      target?.closest('.z-modal-layer-3') ||
      target?.closest('.z-modal-layer-4') ||
      target?.closest('[data-media-menu]') ||
      target?.closest('[data-dropdown]'),
  )
}

function isPointerOnMediaCard(target: Element | null): boolean {
  return Boolean(target?.closest('[data-media-card]'))
}

interface MediaImageWorkspacePanelHostProps {
  parentRef: RefObject<HTMLDivElement | null>
  mediaId: string | null
  spaceId: string
  campaignId: string | null
  onClose: () => void
  onMetaChange?: (meta: { id: string; title: string } | null) => void
}

export function MediaImageWorkspacePanelHost({
  parentRef,
  mediaId,
  spaceId,
  campaignId,
  onClose,
  onMetaChange,
}: MediaImageWorkspacePanelHostProps) {
  const panelAsideRef = useRef<HTMLElement | null>(null)
  const defaultWidth = useMemo(() => readStoredArtifactPreviewWidth() ?? DEFAULT_WIDTH_PERCENT, [])
  const [widthPercent, setWidthPercent] = useState<number>(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [asset, setAsset] = useState<MediaAsset | null>(null)
  const [loadError, setLoadError] = useState(false)
  const lastMediaIdRef = useRef<string | null>(mediaId)

  useEffect(() => {
    if (!mediaId) return
    const onPointerDownCapture = (e: PointerEvent) => {
      if (isDragging) return
      const el = panelAsideRef.current
      const t = e.target
      if (!(t instanceof Element)) return
      if (el?.contains(t)) return
      if (!isPointerInSpacesSlidePreviewDismissZone(t)) return
      if (isPointerLikelyFloatingUi(t)) return
      if (isPointerOnMediaCard(t)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [mediaId, onClose, isDragging])

  useEffect(() => {
    if (mediaId) lastMediaIdRef.current = mediaId
  }, [mediaId])

  useEffect(() => {
    persistArtifactPreviewWidth(widthPercent)
  }, [widthPercent])

  useEffect(() => {
    if (!mediaId) {
      setAsset(null)
      setLoadError(false)
      onMetaChange?.(null)
      return
    }
    let cancelled = false
    setLoadError(false)
    void getAsset(mediaId)
      .then((row) => {
        if (cancelled) return
        setAsset(row)
        if (row) onMetaChange?.({ id: row.id, title: row.name })
      })
      .catch(() => {
        if (cancelled) return
        setAsset(null)
        setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [mediaId, onMetaChange])

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
    const handlePointerUp = () => setIsDragging(false)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, parentRef])

  const open = Boolean(mediaId || lastMediaIdRef.current)
  const renderedAsset = asset
  const panelTransition = !isDragging
    ? { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] as const }
    : { duration: 0 }

  return (
    <AnimatePresence initial={false}>
      {mediaId && open ? (
        <motion.aside
          ref={panelAsideRef}
          key="media-workspace-host"
          initial={{ flexBasis: '0%' }}
          animate={{ flexBasis: `${widthPercent}%` }}
          exit={{ flexBasis: '0%' }}
          transition={panelTransition}
          className="relative z-10 flex min-h-0 min-w-0 shrink-0 grow-0 overflow-hidden"
        >
          <ResizableDivider
            onMouseDown={handleMouseDown}
            isDragging={isDragging}
            compact
            showGrip={false}
          />
          <div className="card-glass flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {loadError ? (
              <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center">
                Couldn’t load this media asset.
              </div>
            ) : renderedAsset ? (
              <MediaImageWorkspace
                asset={renderedAsset}
                spaceId={spaceId}
                campaignId={campaignId}
              />
            ) : (
              <div className="py-spacing-12 flex flex-1 items-center justify-center">
                <VibeyLoadingOrb text="Loading media…" state="processing" size="lg" />
              </div>
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
