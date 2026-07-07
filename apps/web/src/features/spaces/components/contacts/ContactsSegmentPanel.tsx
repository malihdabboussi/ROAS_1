'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Check,
  Filter,
  Globe,
  Pencil,
  PieChart,
  Plus,
  Search,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useSegments } from '@/features/properties/hooks/useSegments'
import type {
  CreateSegmentRequest,
  Segment,
  SegmentFilters,
  UpdateSegmentRequest,
} from '@/lib/properties/segments'
import { SegmentDeleteDialog } from '@/features/settings/components/settings-content/properties/segments/SegmentDeleteDialog'
import { SegmentEditorDialog } from '@/features/settings/components/settings-content/properties/segments/SegmentEditorDialog'
import { formatDateForGrid } from '@/lib/properties/format-date'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

function SegmentPreviewCard({
  segment,
  panelLeft,
  rowTop,
}: {
  segment: Segment
  panelLeft: number
  rowTop: number
}) {
  const f = segment.filters
  const hasAny =
    (f.campaigns?.length ?? 0) > 0 ||
    (f.funnels?.length ?? 0) > 0 ||
    (f.tags?.length ?? 0) > 0 ||
    (f.contact_type?.length ?? 0) > 0 ||
    (f.country?.length ?? 0) > 0 ||
    f.date_range?.from ||
    f.date_range?.to

  return createPortal(
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none fixed z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-xl"
      style={{ top: rowTop, right: `calc(100vw - ${panelLeft}px + 8px)` }}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{segment.name}</p>
      {segment.description ? (
        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{segment.description}</p>
      ) : null}
      <div className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
        {segment.lead_count.toLocaleString()} leads · updated{' '}
        {formatDateForGrid(segment.updated_at)}
      </div>
      {hasAny ? (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
          {f.campaigns && f.campaigns.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <Users className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">
                {f.campaigns.length} campaign{f.campaigns.length > 1 ? 's' : ''}
              </span>
            </div>
          ) : null}
          {f.funnels && f.funnels.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <Filter className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">
                {f.funnels.length} funnel{f.funnels.length > 1 ? 's' : ''}
              </span>
            </div>
          ) : null}
          {f.tags && f.tags.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <Tag className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">{f.tags.join(', ')}</span>
            </div>
          ) : null}
          {f.contact_type && f.contact_type.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <UserCheck className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">{f.contact_type.join(', ')}</span>
            </div>
          ) : null}
          {f.country && f.country.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <Globe className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">{f.country.join(', ')}</span>
            </div>
          ) : null}
          {f.date_range?.from || f.date_range?.to ? (
            <div className="flex items-start gap-1.5">
              <Calendar className="mt-px h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--foreground)]">
                {f.date_range.from ?? '—'} → {f.date_range.to ?? 'now'}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--color-muted-foreground)]">
          No filters configured
        </p>
      )}
    </motion.div>,
    document.body,
  )
}

interface ContactsSegmentPanelProps {
  open: boolean
  onClose: () => void
  activeSegmentId: string | null
  onApplySegment: (segmentId: string | null, segmentName: string | null) => void
  /** When provided, panel docks below view-tabs row matching CustomizeViewPanel's stage. */
  stageBounds?: { top: number; height: number } | null
}

export function ContactsSegmentPanel({
  open,
  onClose,
  activeSegmentId,
  onApplySegment,
  stageBounds = null,
}: ContactsSegmentPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Deferred fetch: the panel is mounted whenever the contacts view is active,
  // but segments only load once it actually opens (each open revalidates via
  // the 60s segments cache in segments-api).
  const { segments, isLoading, createSegment, updateSegment, deleteSegment } = useSegments({
    enabled: open,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [deletingSegment, setDeletingSegment] = useState<Segment | null>(null)
  const [segmentName, setSegmentName] = useState('')
  const [segmentDescription, setSegmentDescription] = useState('')
  const [segmentFilters, setSegmentFilters] = useState<SegmentFilters>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredSegment, setHoveredSegment] = useState<{ segment: Segment; top: number } | null>(
    null,
  )
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRowEnter = useCallback((segment: Segment, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    const rowRect = e.currentTarget.getBoundingClientRect()
    hoverTimerRef.current = setTimeout(() => {
      setHoveredSegment({ segment, top: rowRect.top })
    }, 320)
  }, [])

  const handleRowLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
    setHoveredSegment(null)
  }, [])

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setHoveredSegment(null)
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dialogOpen || deleteDialogOpen) return
      onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, dialogOpen, deleteDialogOpen])

  useEffect(() => {
    if (!open) return
    const onPointerDownCapture = (e: PointerEvent) => {
      if (dialogOpen || deleteDialogOpen) return
      const panel = panelRef.current
      if (!panel) return
      const path = e.composedPath()
      const inside = path.some((n) => {
        if (n === panel) return true
        if (n instanceof Element && n.closest(`[${VIBEY_SPACE_FLOATING_CONTROL}]`)) return true
        if (n instanceof Element && n.closest('[data-radix-dialog-content]')) return true
        if (n instanceof Node) return panel.contains(n)
        return false
      })
      if (inside) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [open, onClose, dialogOpen, deleteDialogOpen])

  const openCreateDialog = () => {
    setEditingSegment(null)
    setSegmentName('')
    setSegmentDescription('')
    setSegmentFilters({})
    setDialogOpen(true)
  }

  const openEditDialog = (s: Segment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSegment(s)
    setSegmentName(s.name)
    setSegmentDescription(s.description || '')
    setSegmentFilters(s.filters || {})
    setDialogOpen(true)
  }

  const openDeleteDialog = (s: Segment, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingSegment(s)
    setDeleteDialogOpen(true)
  }

  const handleSaveSegment = async () => {
    if (!segmentName.trim()) return
    setIsSaving(true)
    try {
      if (editingSegment) {
        await updateSegment(editingSegment.id, {
          name: segmentName.trim(),
          description: segmentDescription.trim() || null,
          filters: segmentFilters,
        } as UpdateSegmentRequest)
      } else {
        await createSegment({
          name: segmentName.trim(),
          description: segmentDescription.trim() || undefined,
          filters: segmentFilters,
        } as CreateSegmentRequest)
      }
      setDialogOpen(false)
      setEditingSegment(null)
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingSegment) return
    setIsDeleting(true)
    try {
      if (activeSegmentId === deletingSegment.id) {
        onApplySegment(null, null)
      }
      await deleteSegment(deletingSegment.id)
      setDeleteDialogOpen(false)
      setDeletingSegment(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredSegments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return segments
    return segments.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    )
  }, [segments, searchQuery])

  const panelInner = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <PieChart className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="truncate text-sm font-semibold text-[var(--foreground)]">Segments</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search segments…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] py-1.5 pl-8 pr-2 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
            />
          </div>
          <button
            type="button"
            onClick={openCreateDialog}
            className="badge-glass badge-glass-green body-3 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <VibeyLoadingOrb size="sm" state="processing" />
          </div>
        ) : segments.length === 0 ? (
          <p className="body-3 text-muted-foreground px-2 py-8 text-center">
            No segments yet. Create one to filter this list.
          </p>
        ) : filteredSegments.length === 0 ? (
          <p className="body-3 text-muted-foreground px-2 py-8 text-center">
            No segments match your search.
          </p>
        ) : (
          <>
            <div className="flex flex-col">
              {filteredSegments.map((segment) => {
                const isActive = activeSegmentId === segment.id
                return (
                  <div
                    key={segment.id}
                    className="group/seg flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--color-hover-subtle)]"
                    onMouseEnter={(e) => handleRowEnter(segment, e)}
                    onMouseLeave={handleRowLeave}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onApplySegment(segment.id, segment.name)
                          onClose()
                        }
                      }}
                      onClick={() => {
                        onApplySegment(segment.id, segment.name)
                        onClose()
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
                    >
                      {isActive ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--foreground)]">
                        {segment.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                        {segment.lead_count.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative flex h-6 min-w-[4rem] shrink-0 items-center justify-end">
                      <span className="body-4 pointer-events-none absolute right-0 whitespace-nowrap text-[var(--color-muted-foreground)] transition-opacity group-focus-within/seg:opacity-0 group-hover/seg:opacity-0">
                        {formatDateForGrid(segment.updated_at)}
                      </span>
                      <div className="absolute right-0 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/seg:opacity-100 group-hover/seg:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => openEditDialog(segment, e)}
                          className="rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                          aria-label="Edit segment"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openDeleteDialog(segment, e)}
                          className="rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-destructive)]"
                          aria-label="Delete segment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hoveredSegment != null && (
              <AnimatePresence>
                <SegmentPreviewCard
                  key={hoveredSegment.segment.id}
                  segment={hoveredSegment.segment}
                  panelLeft={panelRef.current ? panelRef.current.getBoundingClientRect().left : 0}
                  rowTop={hoveredSegment.top}
                />
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      <AnimatePresence>
        {open ? (
          stageBounds ? (
            <motion.div
              key="contacts-segment-panel-stage"
              className="right-spaces-board-inset pointer-events-none fixed left-0 z-50 flex justify-end overflow-hidden"
              style={{ top: stageBounds.top, height: stageBounds.height }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                ref={panelRef}
                className="pointer-events-auto flex h-full max-h-full min-h-0 w-[420px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--background)]"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
              >
                {panelInner}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="contacts-segment-panel"
              ref={panelRef}
              className="pointer-events-auto fixed right-3 top-3 z-50 flex h-[calc(100vh-1.5rem)] w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-lg"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {panelInner}
            </motion.div>
          )
        ) : null}
      </AnimatePresence>

      <SegmentEditorDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setEditingSegment(null)
          setDialogOpen(o)
        }}
        isEditing={!!editingSegment}
        segmentName={segmentName}
        segmentDescription={segmentDescription}
        segmentFilters={segmentFilters}
        isSaving={isSaving}
        onSegmentNameChange={setSegmentName}
        onSegmentDescriptionChange={setSegmentDescription}
        onSegmentFiltersChange={setSegmentFilters}
        onSave={handleSaveSegment}
      />

      <SegmentDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deletingSegment={deletingSegment}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />
    </>
  )
}
