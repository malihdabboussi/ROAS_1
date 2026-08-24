'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  isAbortError,
  mergeSearchResults,
  resultBadge,
  ResultIcon,
  useDebouncedValue,
} from '@/features/studio/components/studio-search-modal-helpers'
import { STUDIO_SEARCH_MESSAGES } from '@/features/studio/config/studio-search-messages.config'
import {
  fetchStudioGlobalSearch,
  fetchStudioSearchIdle,
  STUDIO_SEARCH_IDLE_PRESETS,
  type StudioGlobalSearchResult,
  type StudioSearchArtifactHit,
} from '@/features/studio/services/studio-search-api.service'
import {
  artifactHitToSelection,
  type StudioSearchModalSelection,
} from '@/features/studio/utils/open-studio-search-result'

type SearchableCampaign = { id: string; name: string; icon: string }
type Row = { key: string; index: number; result: StudioGlobalSearchResult; section?: string }

interface StudioSearchModalProps {
  open: boolean
  onClose: () => void
  campaigns: SearchableCampaign[]
  onSelect: (selection: StudioSearchModalSelection) => void
}

export function StudioSearchModal({ open, onClose, campaigns, onSelect }: StudioSearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [results, setResults] = useState<StudioGlobalSearchResult[]>([])
  const [idleRecents, setIdleRecents] = useState<StudioGlobalSearchResult[]>([])
  const [idlePresets, setIdlePresets] = useState<StudioGlobalSearchResult[]>(
    STUDIO_SEARCH_IDLE_PRESETS,
  )
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
      const controller = new AbortController()
      void fetchStudioSearchIdle(controller.signal)
        .then((payload) => {
          if (controller.signal.aborted) return
          setIdleRecents(payload.recents)
          setIdlePresets(payload.presets)
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return
          setIdleRecents([])
          setIdlePresets(STUDIO_SEARCH_IDLE_PRESETS)
        })
      return () => controller.abort()
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

  const rows = useMemo<Row[]>(() => {
    if (query.trim()) {
      return results.map((result, index) => ({
        key: `${result.kind}-${result.id}`,
        index,
        result,
      }))
    }
    const next: Row[] = []
    for (const result of idleRecents) {
      next.push({
        key: `recent-${result.kind}-${result.id}`,
        index: next.length,
        result,
        section: next.length === 0 ? STUDIO_SEARCH_MESSAGES.RECENTS : undefined,
      })
    }
    for (const result of idlePresets) {
      const firstCreateIndex = idlePresets.findIndex((item) => item.id.startsWith('create-'))
      const presetIndex = idlePresets.indexOf(result)
      next.push({
        key: `preset-${result.kind}-${result.id}`,
        index: next.length,
        result,
        section:
          presetIndex === 0
            ? STUDIO_SEARCH_MESSAGES.PRESETS
            : presetIndex === firstCreateIndex
              ? STUDIO_SEARCH_MESSAGES.CREATE
              : undefined,
      })
    }
    return next
  }, [idlePresets, idleRecents, query, results])

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(Math.max(0, rows.length - 1))
  }, [rows.length, activeIndex])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeElement = list.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    activeElement?.scrollIntoView?.({ block: 'nearest' })
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
        if (result.url === 'action:create-campaign' || result.url === 'action:create-request') {
          onSelect({
            type: 'action',
            action: result.url === 'action:create-campaign' ? 'create-campaign' : 'create-request',
          })
          return
        }
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

  const idleMode = !query.trim()
  const showIdleEmpty = idleMode && !loading && rows.length === 0

  return (
    <>
      <div
        className="z-modal-backdrop bg-modal-overlay fixed inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="z-modal-content fixed inset-0 flex items-center justify-center p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="border-border surface-card rounded-spacing-4 w-full max-w-xl overflow-hidden border shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="gap-spacing-2 px-spacing-4 py-spacing-3 border-border flex items-center border-b">
            <Search className="icon-sm text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={STUDIO_SEARCH_MESSAGES.PLACEHOLDER}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              className="body-2 text-foreground placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              title="Close search"
              className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="scrollbar-hide py-spacing-2 max-h-[360px] overflow-y-auto">
            {loading && (
              <p className="typo-caption px-spacing-4 py-spacing-1 text-muted-foreground">
                {STUDIO_SEARCH_MESSAGES.SEARCHING}
              </p>
            )}
            {failed ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-destructive">{STUDIO_SEARCH_MESSAGES.FAILED}</p>
              </div>
            ) : showIdleEmpty ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-muted-foreground">{STUDIO_SEARCH_MESSAGES.IDLE}</p>
              </div>
            ) : !loading && query.trim() && rows.length === 0 ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-muted-foreground">{STUDIO_SEARCH_MESSAGES.EMPTY}</p>
              </div>
            ) : (
              rows.map((row) => {
                const active = row.index === activeIndex
                const result = row.result
                const disabled =
                  result.kind === 'artifact' && !campaigns.some((c) => c.id === result.campaignId)
                return (
                  <div key={row.key}>
                    {row.section ? (
                      <p className="typo-caption text-muted-foreground px-spacing-4 py-spacing-1 uppercase tracking-wide">
                        {row.section}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      data-index={row.index}
                      disabled={disabled}
                      onClick={() => handleSelectRow(row)}
                      onMouseEnter={() => setActiveIndex(row.index)}
                      className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-40 ${
                        active ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                      }`}
                    >
                      <div className="text-muted-foreground flex h-7 w-7 items-center justify-center rounded-lg">
                        <ResultIcon result={result} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="body-2 text-foreground truncate">{result.label}</span>
                        {result.subtitle && (
                          <span className="typo-caption text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                      <span className="typo-caption border-border text-muted-foreground shrink-0 rounded border px-1.5 py-0.5">
                        {resultBadge(result)}
                      </span>
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="gap-spacing-3 px-spacing-4 py-spacing-2 border-border flex items-center border-t">
            <span className="typo-caption text-muted-foreground">↑↓ navigate</span>
            <span className="typo-caption text-muted-foreground">↵ select</span>
            <span className="typo-caption text-muted-foreground">esc close</span>
          </div>
        </div>
      </div>
    </>
  )
}
