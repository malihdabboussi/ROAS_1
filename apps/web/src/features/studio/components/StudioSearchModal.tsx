'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckSquare, FileText, MessageSquare, Package, Search, X } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { STUDIO_SEARCH_MESSAGES } from '@/features/studio/config/studio-search-messages.config'
import {
  fetchStudioGlobalSearch,
  type StudioGlobalSearchResult,
  type StudioSearchArtifactHit,
} from '@/features/studio/services/studio-search-api.service'
import {
  artifactHitToSelection,
  type StudioSearchModalSelection,
} from '@/features/studio/utils/open-studio-search-result'

type SearchableCampaign = { id: string; name: string; icon: string }
type Row = { key: string; index: number; result: StudioGlobalSearchResult }

const ARTIFACT_BADGE_LABEL: Record<NonNullable<StudioGlobalSearchResult['artifactKind']>, string> = {
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
    const timeout = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timeout)
  }, [value, ms])
  return debounced
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

function mergeSearchResults(
  current: StudioGlobalSearchResult[],
  incoming: StudioGlobalSearchResult[],
): StudioGlobalSearchResult[] {
  const merged = new Map(current.map((item) => [`${item.kind}-${item.id}`, item]))
  for (const item of incoming) merged.set(`${item.kind}-${item.id}`, item)
  return [...merged.values()]
}

function resultBadge(result: StudioGlobalSearchResult): string {
  if (result.kind === 'artifact' && result.artifactKind) {
    return ARTIFACT_BADGE_LABEL[result.artifactKind]
  }
  const labels: Record<Exclude<StudioGlobalSearchResult['kind'], 'artifact'>, string> = {
    task: 'Task',
    doc: 'Doc',
    deliverable: 'Deliverable',
    conversation: 'Conversation',
    campaign: 'Campaign',
  }
  return result.kind === 'artifact' ? 'Artifact' : labels[result.kind]
}

function ResultIcon({ result }: { result: StudioGlobalSearchResult }) {
  const className = 'h-4 w-4'
  if (result.kind === 'task') return <CheckSquare className={className} />
  if (result.kind === 'doc') return <FileText className={className} />
  if (result.kind === 'deliverable' || result.kind === 'artifact') {
    return <Package className={className} />
  }
  if (result.kind === 'campaign') {
    return <LucideIcon name={result.campaignIcon ?? 'folder-kanban'} className={className} />
  }
  return <MessageSquare className={className} />
}

interface StudioSearchModalProps {
  open: boolean
  onClose: () => void
  campaigns: SearchableCampaign[]
  onSelect: (selection: StudioSearchModalSelection) => void
}

export function StudioSearchModal({
  open,
  onClose,
  campaigns,
  onSelect,
}: StudioSearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [results, setResults] = useState<StudioGlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebouncedValue(query, 220)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    setResults([])
    setFailed(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    const q = debouncedQuery.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      setFailed(false)
      return
    }

    const controller = new AbortController()
    setResults([])
    setLoading(true)
    setFailed(false)
    void fetchStudioGlobalSearch(q, controller.signal, (partial) => {
      if (!controller.signal.aborted) {
        setResults((current) => mergeSearchResults(current, partial))
      }
    })
      .then((items) => setResults(items))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setResults([])
        setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [open, debouncedQuery])

  const rows = useMemo<Row[]>(
    () => results.map((result, index) => ({ key: `${result.kind}-${result.id}`, index, result })),
    [results],
  )

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(Math.max(0, rows.length - 1))
  }, [rows.length, activeIndex])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeElement = list.querySelector(
      `[data-index="${activeIndex}"]`,
    ) as HTMLElement | null
    activeElement?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelectRow = useCallback(
    (row: Row) => {
      const result = row.result
      if (result.kind === 'conversation') {
        onClose()
        onSelect({ type: 'conversation', id: result.id })
        return
      }
      if (result.kind === 'campaign') {
        onClose()
        onSelect({
          type: 'campaign',
          id: result.id,
          name: result.label,
          icon: result.campaignIcon,
        })
        return
      }
      if (result.kind === 'artifact' && result.artifactKind) {
        const campaign = campaigns.find((item) => item.id === result.campaignId)
        if (!campaign) return
        const hit: StudioSearchArtifactHit = {
          kind: result.artifactKind,
          id: result.id,
          campaign_id: result.campaignId ?? null,
          title: result.label,
          ...(result.sequenceId ? { sequence_id: result.sequenceId } : {}),
          ...(result.funnelId ? { funnel_id: result.funnelId } : {}),
        }
        const selection = artifactHitToSelection(hit, campaign)
        if (!selection) return
        onClose()
        onSelect(selection)
        return
      }
      if (result.url) {
        onClose()
        onSelect({ type: 'url', url: result.url })
      }
    },
    [campaigns, onClose, onSelect],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, rows.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (rows[activeIndex]) handleSelectRow(rows[activeIndex])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    },
    [activeIndex, handleSelectRow, onClose, rows],
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
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex items-center border-b border-[var(--color-border)]">
            <Search className="icon-sm flex-shrink-0 text-[var(--color-muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder={STUDIO_SEARCH_MESSAGES.PLACEHOLDER}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
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
            {loading && (
              <p className="typo-caption px-spacing-4 py-spacing-1 text-[var(--color-muted-foreground)]">
                {STUDIO_SEARCH_MESSAGES.SEARCHING}
              </p>
            )}
            {failed ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-destructive">{STUDIO_SEARCH_MESSAGES.FAILED}</p>
              </div>
            ) : !loading && query.trim() && rows.length === 0 ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-[var(--color-muted-foreground)]">
                  {STUDIO_SEARCH_MESSAGES.EMPTY}
                </p>
              </div>
            ) : (
              rows.map((row) => {
                const active = row.index === activeIndex
                const result = row.result
                const disabled = result.kind === 'artifact' && !campaigns.some((c) => c.id === result.campaignId)
                return (
                  <button
                    key={row.key}
                    type="button"
                    data-index={row.index}
                    disabled={disabled}
                    onClick={() => handleSelectRow(row)}
                    onMouseEnter={() => setActiveIndex(row.index)}
                    className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-40 ${
                      active ? 'bg-[var(--color-secondary)]' : 'hover:bg-[var(--color-secondary)]'
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]">
                      <ResultIcon result={result} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="body-2 truncate text-[var(--color-foreground)]">
                        {result.label}
                      </span>
                      {result.subtitle && (
                        <span className="typo-caption truncate text-[var(--color-muted-foreground)]">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                    <span className="typo-caption shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-muted-foreground)]">
                      {resultBadge(result)}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="gap-spacing-3 px-spacing-4 py-spacing-2 flex items-center border-t border-[var(--color-border)]">
            <span className="typo-caption text-[var(--color-muted-foreground)]">↑↓ navigate</span>
            <span className="typo-caption text-[var(--color-muted-foreground)]">↵ select</span>
            <span className="typo-caption text-[var(--color-muted-foreground)]">esc close</span>
          </div>
        </div>
      </div>
    </>
  )
}
