'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Fullscreen, MoreVertical } from 'lucide-react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { deleteAsset, updateAsset, type MediaAsset } from '@/lib/services/media-api'
import { MediaMenuDropdown } from '../../components/media-menu/MediaMenuDropdown'
import { isPointerInSpacesSlidePreviewDismissZone } from '../../lib/spaces-slide-preview-dismiss'
import {
  persistArtifactPreviewWidth,
  readStoredArtifactPreviewWidth,
} from '../../store/use-spaces-store'

const DEFAULT_WIDTH_PERCENT = 45
const MIN_WIDTH_PERCENT = 25
const MAX_WIDTH_PERCENT = 65

function isPointerLikelyFloatingUi(target: Element | null): boolean {
  return Boolean(
    target?.closest('.z-dropdown') ||
    target?.closest('.dropdown-menu-solid') ||
    target?.closest('.z-modal-content') ||
    target?.closest('.z-modal-backdrop') ||
    target?.closest('.z-modal-backdrop-above') ||
    target?.closest('.z-modal-layer-3') ||
    target?.closest('.z-modal-layer-4') ||
    target?.closest('[data-media-menu]'),
  )
}

function isPointerOnMediaCard(target: Element | null): boolean {
  return Boolean(target?.closest('[data-media-card]'))
}

interface MediaPreviewPanelHostProps {
  parentRef: RefObject<HTMLDivElement | null>
  selection: MediaAsset | null
  onClose: () => void
  onOpenFullView?: () => void
  onAssetUpdated?: (asset: MediaAsset) => void
  onAssetDeleted?: (assetId: string) => void
}

export function MediaPreviewPanelHost({
  parentRef,
  selection,
  onClose,
  onOpenFullView,
  onAssetUpdated,
  onAssetDeleted,
}: MediaPreviewPanelHostProps) {
  const panelAsideRef = useRef<HTMLElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement | null>(null)
  const defaultWidth = useMemo(() => readStoredArtifactPreviewWidth() ?? DEFAULT_WIDTH_PERCENT, [])
  const [widthPercent, setWidthPercent] = useState<number>(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const lastSelectionRef = useRef<MediaAsset | null>(selection)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      if (isPointerOnMediaCard(t)) return
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

  const rendered = selection ?? lastSelectionRef.current

  useEffect(() => {
    if (!selection) return
    setNameDraft(selection.name)
    setEditingName(false)
  }, [selection?.id])

  useEffect(() => {
    if (!selection || editingName) return
    setNameDraft(selection.name)
  }, [selection?.name, selection, editingName])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const commitNameEdit = useCallback(async () => {
    if (!rendered?.id) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameDraft(rendered.name)
      setEditingName(false)
      return
    }
    if (trimmed === rendered.name) {
      setEditingName(false)
      return
    }
    const updated = await updateAsset(rendered.id, { name: trimmed })
    onAssetUpdated?.(updated)
    setEditingName(false)
  }, [rendered?.id, rendered?.name, nameDraft, onAssetUpdated])

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

  const panelTransition = !isDragging
    ? { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] as const }
    : { duration: 0 }

  return (
    <AnimatePresence initial={false}>
      {selection && rendered ? (
        <motion.aside
          ref={panelAsideRef}
          key="media-preview-host"
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
            <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => void commitNameEdit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void commitNameEdit()
                      }
                    }}
                    className="body-3 px-spacing-2 w-full min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--background)] py-1 font-medium text-[var(--foreground)] outline-none focus:border-[var(--border)]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="body-3 hover:bg-hover-subtle px-spacing-1 w-full min-w-0 truncate rounded-md py-0.5 text-left font-medium text-[var(--foreground)]"
                  >
                    {rendered.name}
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-1">
                {rendered.public_url ? (
                  <a
                    href={rendered.public_url}
                    download={rendered.original_filename || rendered.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-solid border-[var(--color-border)] p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {onOpenFullView ? (
                  <>
                    <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
                    <button
                      type="button"
                      onClick={() => onOpenFullView()}
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-solid border-[var(--color-border)] p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                      aria-label="Open full view"
                    >
                      <Fullscreen className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
                <button
                  ref={moreBtnRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((o) => !o)
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-solid border-[var(--color-border)] p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  aria-label="Asset options"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="bg-muted/10 border-border p-spacing-3 flex min-h-[200px] flex-1 items-center justify-center border-b">
                {rendered.asset_type === 'video' && rendered.public_url ? (
                  <video
                    src={rendered.public_url}
                    controls
                    className="rounded-spacing-2 max-h-full max-w-full"
                  />
                ) : rendered.public_url ? (
                  <img
                    src={rendered.public_url}
                    alt=""
                    className="rounded-spacing-2 max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="body-4 text-muted-foreground">No preview URL</span>
                )}
              </div>
              {rendered.source_prompt ? (
                <div className="p-spacing-3 shrink-0">
                  <p className="body-4 text-muted-foreground mb-1 font-medium">Prompt</p>
                  <p className="body-3 whitespace-pre-wrap text-[var(--foreground)]">
                    {rendered.source_prompt}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          {menuOpen ? (
            <MediaMenuDropdown
              asset={rendered}
              anchorRef={moreBtnRef}
              onClose={() => setMenuOpen(false)}
              onChanged={(updated) => onAssetUpdated?.(updated)}
              onOpenFull={
                onOpenFullView
                  ? () => {
                      setMenuOpen(false)
                      onOpenFullView()
                    }
                  : undefined
              }
              onDeleted={() => {
                setDeleteTarget(rendered)
                setMenuOpen(false)
              }}
            />
          ) : null}
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => {
              if (!open && !deleting) setDeleteTarget(null)
            }}
            title="Delete asset?"
            description={`Are you sure you want to delete "${deleteTarget?.name || 'Untitled'}"? This cannot be undone.`}
            confirmText="Delete"
            confirmDisabled={deleting}
            confirmingText="Deleting..."
            onConfirm={async () => {
              if (!deleteTarget) return
              setDeleting(true)
              try {
                await deleteAsset(deleteTarget.id)
                onAssetDeleted?.(deleteTarget.id)
                onClose()
              } finally {
                setDeleting(false)
                setDeleteTarget(null)
              }
            }}
          />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
