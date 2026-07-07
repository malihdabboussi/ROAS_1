'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Component, Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  triggerSpaceChannelBrainstormCreate,
  triggerSpaceChannelBrainstormThread,
} from '../lib/channel-space-brainstorm-toolbar'
import { channelsService, type ChannelMessage } from '../services/channels.service'

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

function sortMessagesByCreatedAt(messages: ChannelMessage[]): ChannelMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

/** Same window as `useChannelMessages` (API max 200, oldest-first batch). */
async function fetchChannelMessagesForMenu(channelId: string): Promise<ChannelMessage[]> {
  const rows = await channelsService.listMessages(channelId, { limit: 200 })
  return sortMessagesByCreatedAt(rows)
}

type BrainstormRow = {
  parentMessage: ChannelMessage
  agentKeys: string[]
  label: string
  searchText: string
}

function buildBrainstormRows(messages: ChannelMessage[]): BrainstormRow[] {
  const parents = messages.filter((m) => {
    const meta = m.metadata as Record<string, unknown> | null
    return !!(meta?.brainstorm as { agent_keys?: string[] })?.agent_keys
  })

  return parents
    .map((parent) => {
      const meta = parent.metadata as Record<string, unknown>
      const brainstormConfig = meta.brainstorm as { agent_keys: string[] }
      const agentKeys = brainstormConfig.agent_keys
      const replies = messages.filter((m) => m.reply_to_id === parent.id)
      const lastReply = replies[replies.length - 1] ?? null
      const preview = lastReply?.content ? stripHtml(lastReply.content).slice(0, 120) : ''
      const label = parent.thread_name || agentKeys.join(', ')
      const dateStr = new Date(parent.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const searchText = [label, ...agentKeys, dateStr, preview].join(' ').toLowerCase()
      return { parentMessage: parent, agentKeys, label, searchText }
    })
    .reverse()
}

export function SpaceChannelBrainstormMenu({ channelId }: { channelId: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loadedMessages, setLoadedMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(false)

  const rows = useMemo(() => buildBrainstormRows(loadedMessages), [loadedMessages])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.searchText.includes(q))
  }, [rows, query])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const all = await fetchChannelMessagesForMenu(channelId)
    setLoadedMessages(all)
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    if (!open) return
    void loadMessages()
  }, [open, loadMessages])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    setOpen(false)
    setLoadedMessages([])
    setQuery('')
  }, [channelId])

  return (
    <Tooltip label="Brainstorms" side="bottom">
      <div ref={rootRef} className="relative inline-flex shrink-0">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${open ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]' : ''}`}
          aria-label="Brainstorms"
        >
          <Component className="h-3.5 w-3.5" />
        </button>

        {open ? (
          <div
            data-dropdown
            className="dropdown-menu-solid z-dropdown absolute right-0 top-full mt-1 flex w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl shadow-lg"
            role="menu"
          >
            <div className="border-border flex items-center gap-2 border-b px-2 py-2">
              <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brainstorms…"
                className="text-foreground placeholder:text-muted-foreground body-4 min-w-0 flex-1 bg-transparent outline-none"
                autoComplete="off"
              />
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              <button
                type="button"
                role="menuitem"
                className="hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)]"
                onClick={() => {
                  setOpen(false)
                  triggerSpaceChannelBrainstormCreate(channelId)
                }}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="font-semibold">Create new</span>
              </button>

              {loading ? <p className="body-4 text-muted-foreground px-3 py-2">Loading…</p> : null}

              {!loading && filteredRows.length === 0 && query.trim() ? (
                <p className="body-4 text-muted-foreground px-3 py-2">No matches</p>
              ) : null}

              {filteredRows.map((row) => (
                <button
                  key={row.parentMessage.id}
                  type="button"
                  role="menuitem"
                  className="hover:bg-hover-subtle flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
                  onClick={() => {
                    setOpen(false)
                    triggerSpaceChannelBrainstormThread(channelId, row.parentMessage.id)
                  }}
                >
                  <span className="w-full truncate text-sm font-semibold text-[var(--foreground)]">
                    {row.label}
                  </span>
                  <span className="typo-caption text-[var(--color-muted-foreground)]">
                    {new Date(row.parentMessage.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Tooltip>
  )
}
