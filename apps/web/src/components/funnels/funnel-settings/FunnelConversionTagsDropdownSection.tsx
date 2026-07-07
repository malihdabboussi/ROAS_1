'use client'

import { ChevronRight, Search, Tag as TagIcon, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { cn } from '@/lib/utils/cn'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { useDistinctContactTags } from './use-distinct-contact-tags'

export function FunnelConversionTagsDropdownSection(props: {
  funnel: Funnel
  isSaving: boolean
  onToggleFunnelTag: (funnelId: string, tagId: string) => void
}) {
  const { funnel, isSaving, onToggleFunnelTag } = props
  const anchorRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [draft, setDraft] = useState('')
  const { tags: suggestionPool, loading: suggestionsLoading } = useDistinctContactTags()

  const selectedLabels = useMemo(
    () => (funnel.tag_ids ?? []).map((x) => String(x).trim()).filter(Boolean),
    [funnel.tag_ids],
  )

  const q = draft.trim().toLowerCase()
  const suggestions = useMemo(() => {
    const sel = new Set(selectedLabels.map((s) => s.toLowerCase()))
    return suggestionPool.filter((t) => {
      const n = t.trim()
      if (!n) return false
      if (sel.has(n.toLowerCase())) return false
      if (!q) return true
      return n.toLowerCase().includes(q)
    })
  }, [suggestionPool, selectedLabels, q])

  const summary = `${selectedLabels.length} tag${selectedLabels.length === 1 ? '' : 's'}`

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
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

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between transition-colors hover:opacity-80"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <TagIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 font-semibold text-[var(--foreground)]">Conversion Tags</span>
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
            <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const label = draft.trim()
                    if (!label || selectedLabels.includes(label)) {
                      setDraft('')
                      return
                    }
                    setDraft('')
                    void onToggleFunnelTag(funnel.id, label)
                  }}
                  placeholder="Add or search tags…"
                  disabled={isSaving}
                  className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                />
                {draft ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setDraft('')}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
              {selectedLabels.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void onToggleFunnelTag(funnel.id, label)}
                      className="body-3 inline-flex cursor-pointer items-center rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-0.5 text-[var(--foreground)] disabled:opacity-50"
                      disabled={isSaving}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="space-y-0.5">
                {suggestionsLoading ? (
                  <p className="body-3 py-2 text-[var(--color-muted-foreground)]">
                    Loading suggestions…
                  </p>
                ) : (
                  suggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      disabled={isSaving}
                      onClick={() => void onToggleFunnelTag(funnel.id, tag)}
                      className="body-3 flex h-8 w-full items-center rounded-lg px-3 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                    >
                      {tag}
                    </button>
                  ))
                )}
                {!suggestionsLoading && suggestions.length === 0 && q ? (
                  <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching tags</p>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
