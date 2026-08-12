'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Search, X } from 'lucide-react'
import type { FieldDef, SpaceItem } from '@/lib/spaces'
import { readFieldValue } from '@/lib/spaces/space-item-values'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'

export interface MissionSendOptions {
  include: Record<string, boolean>
  preferred_agent_keys: string[]
  extra_notes: string
}

interface MissionSendDropdownProps {
  spaceItem: SpaceItem
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  onSend: (options: MissionSendOptions) => Promise<void>
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const INCLUDABLE_FIELDS: { id: string; label: string; defaultOn: boolean; locked?: boolean }[] = [
  { id: 'title', label: 'Title', defaultOn: true, locked: true },
  { id: 'notes', label: 'Description / Notes', defaultOn: true },
  { id: 'status', label: 'Status', defaultOn: true },
  { id: 'priority', label: 'Priority', defaultOn: true },
  { id: 'due_date', label: 'Due date / Start date', defaultOn: false },
  { id: 'tags', label: 'Tags', defaultOn: false },
  { id: 'subtasks', label: 'Subtasks', defaultOn: false },
  { id: 'custom_fields', label: 'Custom fields', defaultOn: false },
]

export function MissionSendDropdown({
  spaceItem,
  allFields: _allFields,
  roster,
  onSend,
  onClose,
  triggerRef,
}: MissionSendDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const [extraNotes, setExtraNotes] = useState('')

  const [include, setInclude] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const f of INCLUDABLE_FIELDS) map[f.id] = f.defaultOn
    return map
  })

  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())

  const agents = useMemo(() => roster.filter((r) => r.kind === 'agent' && r.agent_key), [roster])

  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents
    const q = agentSearch.toLowerCase()
    return agents.filter(
      (a) =>
        a.display_name?.toLowerCase().includes(q) ||
        a.agent_key?.toLowerCase().includes(q) ||
        a.role_label?.toLowerCase().includes(q),
    )
  }, [agents, agentSearch])

  const hasValue = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const f of INCLUDABLE_FIELDS) {
      if (f.id === 'title') {
        result[f.id] = true
        continue
      }
      if (f.id === 'subtasks') {
        result[f.id] = true
        continue
      }
      if (f.id === 'custom_fields') {
        result[f.id] = Object.keys(spaceItem.custom_data ?? {}).length > 0
        continue
      }
      if (f.id === 'notes') {
        result[f.id] = Boolean(spaceItem.notes)
        continue
      }
      if (f.id === 'tags') {
        const tags = spaceItem.custom_data?.tags
        result[f.id] = Array.isArray(tags) && tags.length > 0
        continue
      }
      if (f.id === 'due_date') {
        result[f.id] = Boolean(spaceItem.due_date || spaceItem.start_date)
        continue
      }
      const val = readFieldValue(spaceItem, f.id)
      result[f.id] = val != null && val !== ''
    }
    return result
  }, [spaceItem])

  useLayoutEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 380
    const dropdownHeight = 520
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8
    const maxLeft = window.innerWidth - dropdownWidth - 8
    setPos({
      top: placeAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left - 60, maxLeft)),
    })
  }, [triggerRef])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, triggerRef])

  async function handleSend() {
    setSending(true)
    try {
      await onSend({
        include,
        preferred_agent_keys: Array.from(selectedAgents),
        extra_notes: extraNotes.trim(),
      })
    } finally {
      setSending(false)
    }
  }

  if (!pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="z-dropdown fixed flex flex-col overflow-hidden"
      data-dropdown
      style={{ top: pos.top, left: pos.left, width: 380, maxHeight: 'calc(100vh - 16px)' }}
    >
      <div className="dropdown-menu-solid flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
          <span className="text-sm font-medium text-[var(--foreground)]">Send to Mission</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Briefing section */}
          <div className="px-4 pb-2 pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Briefing
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {INCLUDABLE_FIELDS.map((f) => (
                <label
                  key={f.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    f.locked
                      ? 'cursor-default opacity-60'
                      : 'cursor-pointer hover:bg-[var(--color-hover-subtle)]',
                  )}
                >
                  <input
                    type="checkbox"
                    className="checkbox-glass-green shrink-0"
                    checked={include[f.id] ?? false}
                    disabled={f.locked}
                    onChange={(e) => {
                      if (f.locked) return
                      setInclude((prev) => ({ ...prev, [f.id]: e.target.checked }))
                    }}
                  />
                  <span className="flex-1 text-[var(--foreground)]">{f.label}</span>
                  {!hasValue[f.id] && !f.locked && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">empty</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Extra notes */}
          <div className="px-4 pb-2 pt-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Extra Notes
            </span>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Add instructions, context, or details..."
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-violet-500"
            />
          </div>

          {/* Preferred agents */}
          <div className="px-4 pb-3 pt-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Preferred Agents
            </span>
            {agents.length > 0 && (
              <>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="w-full rounded-lg border border-[var(--border)] bg-transparent py-1.5 pl-8 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-violet-500"
                  />
                </div>
                <div className="mt-1.5 flex max-h-[140px] flex-col gap-0.5 overflow-y-auto">
                  {filteredAgents.map((agent) => {
                    const key = agent.agent_key!
                    const isOn = selectedAgents.has(key)
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <input
                          type="checkbox"
                          className="checkbox-glass-green shrink-0"
                          checked={isOn}
                          onChange={() => {
                            setSelectedAgents((prev) => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }}
                        />
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                            <Bot className="h-3 w-3" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                          {agent.display_name ?? key}
                        </span>
                        {agent.role_label && (
                          <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                            {agent.role_label}
                          </span>
                        )}
                      </label>
                    )
                  })}
                  {filteredAgents.length === 0 && (
                    <span className="px-2 py-1.5 text-xs text-[var(--color-muted-foreground)]">
                      No agents found
                    </span>
                  )}
                </div>
              </>
            )}
            {agents.length === 0 && (
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                No agents in roster
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--border)] px-4 py-2.5">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Mission'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
