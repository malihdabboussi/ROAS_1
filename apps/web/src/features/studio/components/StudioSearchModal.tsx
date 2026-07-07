'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Search, X } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { fetchStudioArtifactSearch } from '@/features/studio/services/studio-search-api.service'
import type { StudioSearchArtifactHit } from '@/features/studio/services/studio-search-api.service'
import {
  artifactHitToSelection,
  type StudioSearchModalSelection,
} from '@/features/studio/utils/open-studio-search-result'

type SearchableConversation = { id: string; title: string | null; campaign_id?: string | null }

type SearchableCampaign = { id: string; name: string; icon: string }

type Row =
  | { key: string; kind: 'conversation'; index: number; id: string; title: string }
  | { key: string; kind: 'campaign'; index: number; data: SearchableCampaign }
  | { key: string; kind: 'artifact'; index: number; hit: StudioSearchArtifactHit }

const BADGE_LABEL: Record<StudioSearchArtifactHit['kind'], string> = {
  offer: 'Offer',
  funnel: 'Funnel',
  website: 'Website',
  sequence: 'Sequence',
  email: 'Email',
  presentation: 'Presentation',
  avatar: 'Avatar',
  ad: 'Ad',
  ad_campaign: 'Ads',
  ad_set: 'Ad set',
  social_post: 'Social',
  blog_post: 'Blog',
  page: 'Page',
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

interface StudioSearchModalProps {
  open: boolean
  onClose: () => void
  conversations: SearchableConversation[]
  campaigns: SearchableCampaign[]
  onSelect: (sel: StudioSearchModalSelection) => void
}

export function StudioSearchModal({
  open,
  onClose,
  conversations,
  campaigns,
  onSelect,
}: StudioSearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [artifactHits, setArtifactHits] = useState<StudioSearchArtifactHit[]>([])
  const [artifactLoading, setArtifactLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebouncedValue(query, 220)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setArtifactHits([])
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const q = debouncedQuery.trim()
    if (q.length < 1) {
      setArtifactHits([])
      setArtifactLoading(false)
      return
    }
    let cancelled = false
    setArtifactLoading(true)
    void fetchStudioArtifactSearch(q)
      .then((items) => {
        if (!cancelled) setArtifactHits(items)
      })
      .finally(() => {
        if (!cancelled) setArtifactLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, debouncedQuery])

  const qLower = query.trim().toLowerCase()

  const rows: Row[] = useMemo(() => {
    const list: Row[] = []
    let index = 0

    const convs = conversations.filter(
      (c) => c.title && (!qLower || (c.title ?? '').toLowerCase().includes(qLower)),
    )
    for (const c of convs) {
      list.push({
        key: `conv-${c.id}`,
        kind: 'conversation',
        index: index++,
        id: c.id,
        title: c.title ?? 'Untitled',
      })
    }

    const camps = campaigns.filter((c) => !qLower || c.name.toLowerCase().includes(qLower))
    for (const c of camps) {
      list.push({
        key: `camp-${c.id}`,
        kind: 'campaign',
        index: index++,
        data: c,
      })
    }

    const qArtifact = debouncedQuery.trim().toLowerCase()
    if (qArtifact.length >= 1) {
      for (const hit of artifactHits) {
        if (!hit.campaign_id) continue
        list.push({
          key: `art-${hit.kind}-${hit.id}`,
          kind: 'artifact',
          index: index++,
          hit,
        })
      }
    }

    return list
  }, [conversations, campaigns, artifactHits, qLower, debouncedQuery])

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(Math.max(0, rows.length - 1))
  }, [rows.length, activeIndex])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelectRow = useCallback(
    (row: Row) => {
      onClose()
      if (row.kind === 'conversation') {
        onSelect({ type: 'conversation', id: row.id })
        return
      }
      if (row.kind === 'campaign') {
        onSelect({
          type: 'campaign',
          id: row.data.id,
          name: row.data.name,
          icon: row.data.icon,
        })
        return
      }
      const campaign = campaigns.find((c) => c.id === row.hit.campaign_id)
      if (!campaign) return
      const sel = artifactHitToSelection(row.hit, campaign)
      if (sel) onSelect(sel)
    },
    [onClose, onSelect, campaigns],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, rows.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (rows[activeIndex]) handleSelectRow(rows[activeIndex])
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [rows, activeIndex, handleSelectRow, onClose],
  )

  if (!open) return null

  return (
    <>
      <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" onClick={onClose} aria-hidden />
      <div
        className="z-modal-content fixed inset-0 flex items-center justify-center p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="rounded-spacing-4 w-full max-w-[560px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex items-center border-b border-[var(--color-border)]">
            <Search className="icon-sm flex-shrink-0 text-[var(--color-muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks, campaigns, artifacts…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              className="body-2 flex-1 bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="scrollbar-hide py-spacing-2 max-h-[360px] overflow-y-auto">
            {artifactLoading && debouncedQuery.trim().length >= 1 && (
              <p className="typo-caption px-spacing-4 py-spacing-1 text-[var(--color-muted-foreground)]">
                Searching artifacts…
              </p>
            )}
            {rows.length === 0 ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-[var(--color-muted-foreground)]">No results</p>
              </div>
            ) : (
              rows.map((row) => {
                const isActive = row.index === activeIndex

                if (row.kind === 'conversation') {
                  return (
                    <button
                      key={row.key}
                      type="button"
                      data-index={row.index}
                      onClick={() => handleSelectRow(row)}
                      onMouseEnter={() => setActiveIndex(row.index)}
                      className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--color-secondary)]'
                          : 'hover:bg-[var(--color-secondary)]'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="body-2 min-w-0 flex-1 truncate text-[var(--color-foreground)]">
                        {row.title}
                      </span>
                      <span className="typo-caption shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-muted-foreground)]">
                        Conversation
                      </span>
                    </button>
                  )
                }

                if (row.kind === 'campaign') {
                  return (
                    <button
                      key={row.key}
                      type="button"
                      data-index={row.index}
                      onClick={() => handleSelectRow(row)}
                      onMouseEnter={() => setActiveIndex(row.index)}
                      className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--color-secondary)]'
                          : 'hover:bg-[var(--color-secondary)]'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]">
                        <LucideIcon name={row.data.icon} className="h-4 w-4" />
                      </div>
                      <span className="body-2 min-w-0 flex-1 truncate text-[var(--color-foreground)]">
                        {row.data.name}
                      </span>
                      <span className="typo-caption shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-muted-foreground)]">
                        Campaign
                      </span>
                    </button>
                  )
                }

                const camp = campaigns.find((c) => c.id === row.hit.campaign_id)
                return (
                  <button
                    key={row.key}
                    type="button"
                    data-index={row.index}
                    disabled={!camp}
                    onClick={() => camp && handleSelectRow(row)}
                    onMouseEnter={() => setActiveIndex(row.index)}
                    className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-40 ${
                      isActive ? 'bg-[var(--color-secondary)]' : 'hover:bg-[var(--color-secondary)]'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="body-2 truncate text-[var(--color-foreground)]">
                        {row.hit.title}
                      </span>
                      {camp && (
                        <span className="typo-caption truncate text-[var(--color-muted-foreground)]">
                          {camp.name}
                        </span>
                      )}
                    </div>
                    <span className="typo-caption shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-muted-foreground)]">
                      {BADGE_LABEL[row.hit.kind]}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="gap-spacing-3 px-spacing-4 py-spacing-2 flex items-center border-t border-[var(--color-border)]">
            <span className="typo-caption text-[var(--color-muted-foreground)]">
              <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span className="typo-caption text-[var(--color-muted-foreground)]">
              <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              select
            </span>
            <span className="typo-caption text-[var(--color-muted-foreground)]">
              <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]">
                esc
              </kbd>{' '}
              close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
