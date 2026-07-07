'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, MessageSquarePlus, Pencil, Search, X } from 'lucide-react'
import {
  listPublicConversations,
  renamePublicConversation,
  type PublicConversationSummary,
} from '../services/public-agent.service'
import type { PublicAgentInfo } from '../types/public-agent.types'

interface EmbeddedConversationsListProps {
  agent: PublicAgentInfo
  accent: string
  accentText: string
  visitorId: string
  visitorEmail: string | null
  onOpenConversation: (id: string) => void
  onStartNew: () => void
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  if (Number.isNaN(diffMs)) return ''
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function EmbeddedConversationsList({
  agent,
  accent,
  accentText,
  visitorId,
  visitorEmail,
  onOpenConversation,
  onStartNew,
}: EmbeddedConversationsListProps) {
  const [items, setItems] = useState<PublicConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listPublicConversations(
      agent.userSlug,
      agent.agentKey,
      visitorId,
      visitorEmail,
    )
    setItems(list)
    setLoading(false)
  }, [agent.userSlug, agent.agentKey, visitorId, visitorEmail])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((c) => {
      const t = (c.title ?? '').toLowerCase()
      const p = (c.last_preview ?? '').toLowerCase()
      return t.includes(q) || p.includes(q)
    })
  }, [items, query])

  const startRename = (item: PublicConversationSummary) => {
    setRenamingId(item.id)
    setRenameDraft(item.title)
  }

  const commitRename = async () => {
    if (!renamingId) return
    const next = renameDraft.trim()
    const original = items.find((c) => c.id === renamingId)?.title ?? ''
    setRenamingId(null)
    if (!next || next === original) return
    setItems((prev) => prev.map((c) => (c.id === renamingId ? { ...c, title: next } : c)))
    const ok = await renamePublicConversation(
      agent.userSlug,
      agent.agentKey,
      renamingId,
      visitorId,
      next,
    )
    if (!ok) {
      setItems((prev) => prev.map((c) => (c.id === renamingId ? { ...c, title: original } : c)))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-2.5">
            <Search className="h-3.5 w-3.5 text-white/40" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-8 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSearchOpen(false)
              }}
              className="rounded-md p-1 text-white/50 transition-colors hover:text-white"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="flex-1 text-sm font-semibold text-white/90">Conversations</p>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Search conversations"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onStartNew}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: accent, color: accentText }}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="px-3 py-6 text-center text-xs text-white/30">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-white/70">
              {items.length === 0 ? 'No conversations yet.' : 'No matches.'}
            </p>
            {items.length === 0 ? (
              <button
                type="button"
                onClick={onStartNew}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                style={{ background: accent, color: accentText }}
              >
                Start a conversation
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((item) => {
              const isRenaming = renamingId === item.id
              return (
                <li key={item.id}>
                  <div className="group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
                    {isRenaming ? (
                      <>
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void commitRename()
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              setRenamingId(null)
                            }
                          }}
                          className="h-7 min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-white/30"
                          maxLength={120}
                        />
                        <button
                          type="button"
                          onClick={() => void commitRename()}
                          className="rounded-md p-1 text-white/70 transition-colors hover:text-white"
                          aria-label="Save title"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="rounded-md p-1 text-white/50 transition-colors hover:text-white"
                          aria-label="Cancel rename"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenConversation(item.id)}
                          className="flex min-w-0 flex-1 flex-col items-start text-left"
                        >
                          <div className="flex w-full items-center gap-2">
                            <span className="truncate text-sm font-medium text-white/90">
                              {item.title || 'Conversation'}
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-white/40">
                              {formatRelative(item.last_activity_at || item.updated_at)}
                            </span>
                          </div>
                          {item.last_preview ? (
                            <span className="mt-0.5 line-clamp-1 text-xs text-white/45">
                              {item.last_preview}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(item)}
                          className="rounded-md p-1 text-white/30 opacity-0 transition-all hover:text-white group-hover:opacity-100"
                          aria-label="Rename conversation"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
