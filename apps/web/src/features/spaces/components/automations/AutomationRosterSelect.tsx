'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Check, ChevronDown, Search, X } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function RosterAvatar({ entry, size = 24 }: { entry: TeamRosterEntry; size?: number }) {
  const initials = getInitials(entry.display_name)
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="bg-muted text-foreground flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

interface AutomationRosterSelectProps {
  roster: TeamRosterEntry[]
  mode: 'agent' | 'human'
  value: string
  onChange: (id: string) => void
  placeholder: string
  className?: string
}

export function AutomationRosterSelect({
  roster,
  mode,
  value,
  onChange,
  placeholder,
  className = '',
}: AutomationRosterSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const entries = useMemo(() => {
    const base =
      mode === 'agent'
        ? roster.filter((e) => e.kind === 'agent' && e.agent_key)
        : roster.filter((e) => e.kind === 'human' && e.user_id)
    const q = query.trim().toLowerCase()
    const filtered = !q
      ? base
      : base.filter(
          (e) =>
            e.display_name.toLowerCase().includes(q) ||
            (e.email?.toLowerCase().includes(q) ?? false) ||
            (e.role_label?.toLowerCase().includes(q) ?? false) ||
            (e.agent_key?.toLowerCase().includes(q) ?? false),
        )
    return [...filtered].sort((a, b) => a.display_name.localeCompare(b.display_name))
  }, [roster, mode, query])

  const selected = useMemo(() => {
    if (!value) return null
    if (mode === 'agent') {
      return roster.find((e) => e.kind === 'agent' && e.agent_key === value) ?? null
    }
    return roster.find((e) => e.kind === 'human' && e.user_id === value) ?? null
  }, [roster, mode, value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const w = 320
    const rawLeft = rect.left
    const maxLeft = window.innerWidth - w - 8
    const left = Math.max(8, Math.min(rawLeft, maxLeft))
    setPos({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    inputRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(entry: TeamRosterEntry) {
    if (mode === 'agent' && entry.agent_key) onChange(entry.agent_key)
    else if (mode === 'human' && entry.user_id) onChange(entry.user_id)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`body-3 text-muted-foreground hover:text-foreground h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors ${className}`}
        data-dropdown=""
      >
        <span className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          {selected ? (
            mode === 'agent' && !selected.avatar_url ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                <Bot className="h-3 w-3" />
              </div>
            ) : (
              <RosterAvatar entry={selected} size={20} />
            )
          ) : null}
          <span className={`truncate ${selected ? 'text-foreground' : ''}`}>
            {selected?.display_name ?? placeholder}
          </span>
        </span>
        <ChevronDown className="icon-sm shrink-0 opacity-60" />
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown fixed w-80"
            style={{ top: pos.top, left: pos.left }}
            data-dropdown=""
          >
            <div className="dropdown-menu-solid flex max-h-80 flex-col overflow-hidden">
              <div className="gap-spacing-2 border-border px-spacing-4 py-spacing-3 flex items-center border-b">
                <Search className="icon-sm text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'agent' ? 'Search agents...' : 'Search people...'}
                  className="body-3 placeholder:text-muted-foreground/60 preview-input text-foreground min-w-0 flex-1 bg-transparent outline-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="icon-sm" />
                  </button>
                ) : null}
              </div>
              <div className="px-spacing-4 py-spacing-3 max-h-72 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="body-3 text-muted-foreground py-spacing-2 text-center">
                    No matches
                  </div>
                ) : (
                  entries.map((entry) => {
                    const id = mode === 'agent' ? entry.agent_key! : entry.user_id!
                    const isSel = value === id
                    return (
                      <button
                        key={entry.participant_id}
                        type="button"
                        onClick={() => pick(entry)}
                        className={`gap-spacing-2 rounded-spacing-1 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left text-sm transition-colors ${
                          isSel ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                        }`}
                      >
                        {mode === 'agent' && !entry.avatar_url ? (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <RosterAvatar entry={entry} size={24} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate">{entry.display_name}</div>
                          {entry.role_label && mode === 'agent' ? (
                            <div className="typo-caption text-muted-foreground truncate">
                              {entry.role_label}
                            </div>
                          ) : null}
                          {entry.email && mode === 'human' ? (
                            <div className="typo-caption text-muted-foreground truncate">
                              {entry.email}
                            </div>
                          ) : null}
                        </div>
                        {isSel ? <Check className="icon-sm text-foreground shrink-0" /> : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
