'use client'

import { Check, ChevronRight, Search, Zap, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Funnel, Sequence } from '@/lib/artifacts/artifact-types'
import type { WorkflowEdge } from '@/lib/workflows/workflow-api'
import { cn } from '@/lib/utils/cn'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export function FunnelConversionSequenceSection(props: {
  funnel: Funnel
  sequences: Sequence[]
  funnelSequenceEdges: WorkflowEdge[]
  sequenceEdgeLoading: boolean
  sequenceEdgeSaving: boolean
  onConnect: (funnelId: string, sequenceId: string) => void
  onDisconnect: (edgeId: string) => void
}) {
  const {
    funnel,
    sequences,
    funnelSequenceEdges,
    sequenceEdgeLoading,
    sequenceEdgeSaving,
    onConnect,
    onDisconnect,
  } = props

  const [sequenceSearch, setSequenceSearch] = useState('')
  const anchorRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const connectedEdges = useMemo(
    () => funnelSequenceEdges.filter((e) => e.from_id === funnel.id),
    [funnelSequenceEdges, funnel.id],
  )

  const edgeBySequenceId = useMemo(() => {
    const m = new Map<string, WorkflowEdge>()
    for (const e of connectedEdges) {
      m.set(e.to_id, e)
    }
    return m
  }, [connectedEdges])

  const filteredSequences = useMemo(() => {
    const q = sequenceSearch.trim().toLowerCase()
    if (!q) return sequences
    return sequences.filter((s) =>
      String(s.name ?? '').toLowerCase().includes(q),
    )
  }, [sequences, sequenceSearch])

  const summary = useMemo(() => {
    if (sequenceEdgeLoading) return 'Loading…'
    if (connectedEdges.length === 0) return 'None'
    if (connectedEdges.length === 1) {
      const seq = sequences.find((s) => s.id === connectedEdges[0]!.to_id)
      return seq?.name?.trim() || '1 sequence'
    }
    return `${connectedEdges.length} sequences`
  }, [sequenceEdgeLoading, connectedEdges, sequences])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }, [open])

  useEffect(() => {
    if (!open) setSequenceSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleToggleSequence = (sequenceId: string) => {
    if (sequenceEdgeSaving) return
    const edge = edgeBySequenceId.get(sequenceId)
    if (edge) onDisconnect(edge.id)
    else void onConnect(funnel.id, sequenceId)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between transition-colors hover:opacity-80"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 font-semibold text-[var(--foreground)]">
            Conversion Sequence
          </span>
        </div>
        <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
          <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
            {summary}
          </span>
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
              open && 'rotate-90',
            )}
          />
        </div>
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
            className="dropdown-menu-solid fixed z-[99999] flex max-h-96 flex-col overflow-hidden rounded-xl shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {sequenceEdgeLoading ? (
              <div className="px-4 py-3">
                <p className="body-3 text-[var(--color-muted-foreground)]">Loading...</p>
              </div>
            ) : sequences.length === 0 ? (
              <div className="px-4 py-3">
                <p className="body-3 text-[var(--color-muted-foreground)]">
                  No sequences in this campaign.
                </p>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    <input
                      type="search"
                      value={sequenceSearch}
                      onChange={(e) => setSequenceSearch(e.target.value)}
                      placeholder="Search sequences…"
                      disabled={sequenceEdgeSaving}
                      className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                    />
                    {sequenceSearch ? (
                      <button
                        type="button"
                        disabled={sequenceEdgeSaving}
                        onClick={() => setSequenceSearch('')}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
                  <div className="space-y-0.5">
                    {filteredSequences.map((s) => {
                      const edge = edgeBySequenceId.get(s.id)
                      const selected = !!edge
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={sequenceEdgeSaving}
                          onClick={() => handleToggleSequence(s.id)}
                          className="body-3 flex h-8 min-h-8 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {s.name?.trim() || 'Untitled Sequence'}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {selected && edge ? (
                              <span className="text-[10px] capitalize text-[var(--color-muted-foreground)]">
                                {edge.status}
                              </span>
                            ) : null}
                            {selected ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--foreground)]" />
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                    {!sequenceEdgeSaving &&
                      sequenceSearch.trim() &&
                      filteredSequences.length === 0 && (
                        <p className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">
                          No matching sequences.
                        </p>
                      )}
                  </div>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
