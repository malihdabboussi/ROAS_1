'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUp, CalendarDays, RefreshCw, Search, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { formatRelativeArtifactDate, openArtifactInShell } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'
import {
  DELEGATION_DESK_MESSAGES,
  DELEGATION_TOAST_MESSAGES,
} from '../config/delegation-messages.config'
import {
  DELEGATION_DESK_FILTERS,
  delegationStatusBadge,
  delegationStatusLabel,
  filterDelegationDeskItems,
  type DelegationDeskFilter,
} from '../lib/delegation-desk-view'
import { captureDelegationThought, ensureDelegationDesk } from '../services/delegation-desk.service'
import { fetchSpaceItems, fetchSpaces } from '../services/spaces.service'
import type { Space, SpaceItem } from '../types'

export function DelegationDeskWorkspace() {
  const [desk, setDesk] = useState<Space | null>(null)
  const [items, setItems] = useState<SpaceItem[]>([])
  const [thought, setThought] = useState('')
  // Effect-set so SSR and first client render agree (avoids hydration mismatch).
  const [addHint, setAddHint] = useState('⌘ Enter to add')
  useEffect(() => {
    if (!/Mac|iPhone|iPad/i.test(navigator.userAgent)) setAddHint('Ctrl+Enter to add')
  }, [])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DelegationDeskFilter>('outstanding')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadDesk = useCallback(async () => {
    setLoadError(false)
    setLoading(true)
    try {
      const spaces = await fetchSpaces({ limit: 100 })
      const { desk: nextDesk } = await ensureDelegationDesk(spaces)
      const nextItems = await fetchSpaceItems(nextDesk.id, {
        item_kind: 'all',
        parent_scope: 'top_level',
      })
      setDesk(nextDesk)
      setItems(nextItems)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDesk()
  }, [loadDesk])

  const visibleItems = useMemo(
    () => filterDelegationDeskItems(items, filter, search),
    [filter, items, search],
  )

  const captureThought = async () => {
    if (!desk || !thought.trim() || saving) return
    setSaving(true)
    try {
      const created = await captureDelegationThought(desk.id, thought)
      setItems((current) => [created, ...current])
      setThought('')
      setFilter('outstanding')
      toast.success(DELEGATION_TOAST_MESSAGES.THOUGHT_CAPTURED)
    } catch {
      toast.error(DELEGATION_TOAST_MESSAGES.THOUGHT_CAPTURE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="lg" text={DELEGATION_DESK_MESSAGES.LOADING} />
      </main>
    )
  }

  if (loadError || !desk) {
    return (
      <main className="gap-spacing-4 flex h-full flex-col items-center justify-center text-center">
        <p className="body-2 text-foreground">{DELEGATION_DESK_MESSAGES.LOAD_FAILED}</p>
        <button
          type="button"
          className="button-default button-glass-neutral body-3"
          onClick={() => void loadDesk()}
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border px-spacing-6 py-spacing-5 shrink-0 border-b">
        <div className="gap-spacing-3 flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="title-h6 text-foreground gap-spacing-2 flex items-center">
              <SendHorizontal className="icon-md text-muted-foreground shrink-0" aria-hidden />
              DELEGATION DESK
            </h1>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-2xl">
              {DELEGATION_DESK_MESSAGES.DESCRIPTION}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon-bare shrink-0"
            onClick={() => void loadDesk()}
            aria-label="Refresh Delegation Desk"
          >
            <RefreshCw className="icon-sm" aria-hidden />
          </button>
        </div>

        <div className="surface-card border-border rounded-spacing-3 p-spacing-3 mt-spacing-5 border">
          <textarea
            className="input-glass body-2 text-foreground w-full resize-none border-0 bg-transparent shadow-none focus:ring-0"
            rows={3}
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void captureThought()
              }
            }}
            placeholder={DELEGATION_DESK_MESSAGES.PLACEHOLDER}
          />
          <div className="mt-spacing-2 flex items-center justify-between">
            <span className="typo-caption text-muted-foreground">{addHint}</span>
            <button
              type="button"
              className="button-default button-glass-primary body-3 gap-spacing-2"
              disabled={!thought.trim() || saving}
              onClick={() => void captureThought()}
            >
              <ArrowUp className="icon-xs" aria-hidden />
              {saving ? 'Adding...' : 'Add to desk'}
            </button>
          </div>
        </div>
      </header>

      <div className="px-spacing-6 py-spacing-3 gap-spacing-3 border-border flex shrink-0 flex-wrap items-center border-b">
        <div className="relative min-w-0 flex-1">
          <Search
            className="icon-left-center text-muted-foreground icon-sm pointer-events-none"
            aria-hidden
          />
          <input
            className="input-glass input-leading body-3 h-spacing-9 rounded-spacing-2 w-full"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outstanding work..."
          />
        </div>
        <div className="gap-spacing-1 flex max-w-full overflow-x-auto" aria-label="Desk views">
          {DELEGATION_DESK_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                'button-compact body-3 shrink-0',
                filter === option.id
                  ? 'button-glass-purple'
                  : 'button-glass-neutral text-muted-foreground',
              )}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-spacing-6 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="gap-spacing-2 flex h-full flex-col items-center justify-center text-center">
            <SendHorizontal className="icon-lg text-muted-foreground" aria-hidden />
            <p className="body-2 text-foreground font-medium">{DELEGATION_DESK_MESSAGES.EMPTY}</p>
            <p className="body-3 text-muted-foreground max-w-md">
              {search.trim()
                ? 'Try another search or choose a different view.'
                : DELEGATION_DESK_MESSAGES.EMPTY_DETAIL}
            </p>
          </div>
        ) : (
          <ul className="border-border bg-card divide-border rounded-spacing-3 divide-y overflow-hidden border">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="hover:bg-hover-subtle px-spacing-4 py-spacing-3 gap-spacing-3 flex w-full min-w-0 items-center text-left transition-colors"
                  onClick={() =>
                    openArtifactInShell({
                      id: item.id,
                      entityId: item.id,
                      entityTable: 'space_items',
                      spaceId: desk.id,
                      title: item.title,
                      content: item.description,
                      type: 'task',
                    })
                  }
                >
                  <span className="min-w-0 flex-1">
                    <span className="body-2 text-foreground block truncate font-medium">
                      {item.title}
                    </span>
                    {item.description && item.description !== item.title ? (
                      <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`badge-glass ${delegationStatusBadge(item.status)} typo-caption shrink-0`}
                  >
                    {delegationStatusLabel(item.status)}
                  </span>
                  <span className="typo-caption text-muted-foreground gap-spacing-1 hidden shrink-0 items-center sm:flex">
                    {item.due_date ? (
                      <>
                        <CalendarDays className="icon-xs" aria-hidden />
                        {new Date(item.due_date).toLocaleDateString()}
                      </>
                    ) : (
                      formatRelativeArtifactDate(item.updated_at || item.created_at)
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
