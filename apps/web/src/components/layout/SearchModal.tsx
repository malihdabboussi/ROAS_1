'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Plus, Search, X } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'

/* ============================================================================
   Types
   ============================================================================ */

interface SearchableConversation {
  id: string
  title: string | null
  campaign_id?: string | null
}

interface SearchableCampaign {
  id: string
  name: string
  icon: string
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
  conversations: SearchableConversation[]
  campaigns: SearchableCampaign[]
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onSelectCampaign: (campaign: { id: string; name: string }) => void
}

/* ============================================================================
   Search Result types
   ============================================================================ */

type SearchResult =
  | { type: 'new-chat' }
  | { type: 'conversation'; data: SearchableConversation }
  | { type: 'campaign'; data: SearchableCampaign }

/* ============================================================================
   SearchModal
   ============================================================================ */

export function SearchModal({
  open,
  onClose,
  conversations,
  campaigns,
  onNewChat,
  onSelectConversation,
  onSelectCampaign,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Reset on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus input after mount
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // ── Filtered results ───────────────────────────────────────────────────
  const results: SearchResult[] = useMemo(() => {
    const items: SearchResult[] = [{ type: 'new-chat' }]
    const q = query.toLowerCase().trim()

    const matchingCampaigns = campaigns.filter((c) => !q || c.name.toLowerCase().includes(q))
    const matchingConversations = conversations.filter(
      (c) => c.title && (!q || c.title.toLowerCase().includes(q)),
    )

    matchingCampaigns.forEach((c) => items.push({ type: 'campaign', data: c }))
    matchingConversations.forEach((c) => items.push({ type: 'conversation', data: c }))

    return items
  }, [query, conversations, campaigns])

  // ── Clamp active index ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(Math.max(0, results.length - 1))
  }, [results.length, activeIndex])

  // ── Scroll active item into view ───────────────────────────────────────
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // ── Handle select ──────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose()
      switch (result.type) {
        case 'new-chat':
          onNewChat()
          break
        case 'conversation':
          onSelectConversation(result.data.id)
          break
        case 'campaign':
          onSelectCampaign({ id: result.data.id, name: result.data.name })
          break
      }
    },
    [onClose, onNewChat, onSelectConversation, onSelectCampaign],
  )

  // ── Keyboard nav ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[activeIndex]) handleSelect(results[activeIndex])
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [results, activeIndex, handleSelect, onClose],
  )

  // ── Close on backdrop click ────────────────────────────────────────────
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="z-modal-content fixed inset-0 flex items-center justify-center">
        <div
          className="rounded-spacing-4 w-full max-w-[560px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex items-center border-b border-[var(--color-border)]">
            <Search className="icon-sm flex-shrink-0 text-[var(--color-muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks and campaigns..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              className="body-2 flex-1 bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
            />
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="scrollbar-hide py-spacing-2 max-h-[360px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-spacing-4 py-spacing-8 text-center">
                <p className="body-2 text-[var(--color-muted-foreground)]">No results found</p>
              </div>
            ) : (
              results.map((result, index) => {
                const isActive = index === activeIndex

                if (result.type === 'new-chat') {
                  return (
                    <button
                      key="new-chat"
                      data-index={index}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]'
                      }`}
                    >
                      <div className="bg-[var(--color-primary)]/15 flex h-7 w-7 items-center justify-center rounded-lg">
                        <Plus className="h-4 w-4 text-[var(--color-primary)]" />
                      </div>
                      <span className="body-2 font-medium">New Task</span>
                    </button>
                  )
                }

                if (result.type === 'campaign') {
                  return (
                    <button
                      key={`campaign-${result.data.id}`}
                      data-index={index}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--color-secondary)]'
                          : 'hover:bg-[var(--color-secondary)]'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]">
                        <LucideIcon name={result.data.icon} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="body-2 block truncate text-[var(--color-foreground)]">
                          {result.data.name}
                        </span>
                        <span className="typo-caption text-[var(--color-muted-foreground)]">
                          Campaign
                        </span>
                      </div>
                    </button>
                  )
                }

                // conversation
                return (
                  <button
                    key={`conv-${result.data.id}`}
                    data-index={index}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors ${
                      isActive ? 'bg-[var(--color-secondary)]' : 'hover:bg-[var(--color-secondary)]'
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="body-2 block min-w-0 flex-1 truncate text-[var(--color-foreground)]">
                      {result.data.title ?? 'Untitled Task'}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer hint */}
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
