'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare, Plus, Search } from 'lucide-react'
import type { SkillBuilderSession } from '../types/skill-builder.types'

interface SkillBuilderSessionsListProps {
  sessions: SkillBuilderSession[]
  selectedSessionId: string | null
  loading?: boolean
  onSelectSession: (session: SkillBuilderSession) => void
  onNewSession: () => void
  onBack: () => void
}

function formatSessionLabel(session: SkillBuilderSession): string {
  const client = session.acting_user_email?.trim() || session.acting_user_id
  const agent = session.target_agent_name?.trim() || session.target_agent_key
  return `${client} · ${agent}`
}

function formatSessionScope(session: SkillBuilderSession): string {
  if (session.org_name?.trim()) return session.org_name.trim()
  if (session.org_id) return 'Organization'
  return 'Personal'
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SkillBuilderSessionsList({
  sessions,
  selectedSessionId,
  loading,
  onSelectSession,
  onNewSession,
  onBack,
}: SkillBuilderSessionsListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((session) => {
      const haystack = [
        session.acting_user_email,
        session.target_agent_name,
        session.target_agent_key,
        session.org_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, sessions])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-3 flex shrink-0 items-center border-b">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground rounded-spacing-2 hover:bg-[var(--color-hover-subtle)] flex h-spacing-8 w-spacing-8 shrink-0 items-center justify-center transition-colors"
          aria-label="Back to chat"
          title="Back to chat"
        >
          <ArrowLeft className="icon-sm" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-spacing-2 top-1/2 icon-sm -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            className="input-glass body-4 rounded-spacing-2 px-spacing-2 pl-spacing-8 h-spacing-8 w-full"
          />
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="badge-glass badge-glass-green body-4 rounded-spacing-2 gap-spacing-1 px-spacing-3 inline-flex h-spacing-8 shrink-0 items-center font-semibold leading-none transition-opacity hover:opacity-90"
        >
          <Plus className="icon-sm" />
          New
        </button>
      </div>

      <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="body-4 text-muted-foreground p-spacing-4 text-center">Loading sessions…</p>
        ) : filtered.length === 0 ? (
          <div className="p-spacing-6 text-center">
            <MessageSquare className="text-muted-foreground mx-auto icon-md" />
            <p className="body-3 mt-spacing-2 font-semibold">No sessions yet</p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Start a chat and it will show up here.
            </p>
          </div>
        ) : (
          <ul className="gap-spacing-1 flex flex-col">
            {filtered.map((session) => {
              const selected = session.id === selectedSessionId
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className={`rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left transition-colors ${
                      selected
                        ? 'bg-primary/15 border-primary/30 border'
                        : 'hover:bg-[var(--color-hover-subtle)] border border-transparent'
                    }`}
                  >
                    <p className="body-3 text-foreground truncate font-medium">
                      {formatSessionLabel(session)}
                    </p>
                    <p className="body-4 text-muted-foreground mt-spacing-1 truncate">
                      {formatSessionScope(session)} · {formatRelativeTime(session.updated_at)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
