'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Check, Search, UserPlus, X } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { normalizeAssigneeValue } from '@/features/spaces/components/space-item-values'
import {
  matchEntry,
  resolveSelectedEntries,
  RosterMemberAvatar,
  type AssigneeValue,
} from './assignee-cell-helpers'

export { RosterMemberAvatar } from './assignee-cell-helpers'

interface Props {
  value: AssigneeValue[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onChange: (next: AssigneeValue[]) => void
  readonly?: boolean
  customTrigger?: React.ReactNode
  /** Kanban card row: show avatar only (no name). */
  fieldRowVariant?: 'default' | 'kanban'
  openOnMount?: boolean
  bulkInlineEditor?: boolean
}

export function AssigneeCell({
  value,
  roster,
  currentUserId,
  onChange,
  readonly,
  customTrigger,
  fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor: _bulkInlineEditor,
}: Props) {
  const valueList = normalizeAssigneeValue(value)
  const [open, setOpen] = useState(!!openOnMount)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)

  const selectedEntries = resolveSelectedEntries(valueList, roster)
  const selected = selectedEntries[0] ?? null
  const labelIsMe = Boolean(
    selected && selected.kind === 'human' && currentUserId && selected.user_id === currentUserId,
  )
  const title =
    selectedEntries.length === 0
      ? 'Unassigned'
      : selectedEntries
          .map((entry) =>
            entry.kind === 'human' && currentUserId && entry.user_id === currentUserId
              ? 'Me'
              : entry.display_name,
          )
          .join(', ')

  const { humans, agents } = useMemo(() => {
    const filtered = roster.filter((e) => matchEntry(e, query))
    const humansList = filtered.filter((e) => e.kind === 'human')
    const agentsList = filtered.filter((e) => e.kind === 'agent')
    if (currentUserId) {
      humansList.sort((a, b) => {
        if (a.user_id === currentUserId) return -1
        if (b.user_id === currentUserId) return 1
        return a.display_name.localeCompare(b.display_name)
      })
    } else {
      humansList.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }
    agentsList.sort((a, b) => a.display_name.localeCompare(b.display_name))
    return { humans: humansList, agents: agentsList }
  }, [roster, query, currentUserId])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 320
    const estHeight = 360
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < estHeight + 8 && rect.top > 120
    const rawLeft = rect.left
    const maxLeft = window.innerWidth - dropdownWidth - 8
    const left = Math.max(8, Math.min(rawLeft, maxLeft))
    if (placeAbove) {
      const fromBottom = window.innerHeight - rect.top + 4
      setPos({ top: null, bottom: fromBottom, left })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handlePick(entry: TeamRosterEntry) {
    const selectedNow = isSelected(entry)
    if (selectedNow) {
      const next = valueList.filter((assignee) => {
        if (entry.kind === 'agent')
          return assignee.type !== 'agent' || assignee.id !== entry.agent_key
        if (entry.kind === 'human')
          return assignee.type !== 'human' || assignee.id !== entry.user_id
        return true
      })
      onChange(next)
      return
    }
    if (entry.kind === 'agent' && entry.agent_key) {
      onChange([...valueList, { type: 'agent', id: entry.agent_key }])
    } else if (entry.kind === 'human' && entry.user_id) {
      onChange([...valueList, { type: 'human', id: entry.user_id }])
    }
  }

  function handleClear() {
    onChange([])
    setOpen(false)
    setQuery('')
  }

  function isSelected(entry: TeamRosterEntry): boolean {
    if (entry.kind === 'agent') {
      return valueList.some(
        (assignee) => assignee.type === 'agent' && assignee.id === entry.agent_key,
      )
    }
    if (entry.kind === 'human') {
      return valueList.some(
        (assignee) => assignee.type === 'human' && assignee.id === entry.user_id,
      )
    }
    return false
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (readonly) return
          setOpen((o) => !o)
        }}
        className={`flex items-center text-left transition-colors ${
          customTrigger ? 'w-auto min-w-0' : 'w-full min-w-0 max-w-full'
        }`}
        disabled={readonly}
        title={title}
      >
        {customTrigger ??
          (selectedEntries.length > 0 ? (
            fieldRowVariant === 'kanban' ? (
              <div className="flex w-full min-w-0 max-w-full items-center justify-center -space-x-1">
                {selectedEntries.slice(0, 3).map((entry) => (
                  <RosterMemberAvatar key={entry.participant_id} entry={entry} size={20} />
                ))}
              </div>
            ) : (
              <div className="flex w-full min-w-0 max-w-full items-center gap-1.5">
                <div className="flex shrink-0 -space-x-1">
                  {selectedEntries.slice(0, 3).map((entry) => (
                    <RosterMemberAvatar key={entry.participant_id} entry={entry} size={24} />
                  ))}
                </div>
                <span
                  className="min-w-0 flex-1 truncate text-left font-medium leading-tight text-[var(--foreground)]"
                  style={{ fontSize: 11 }}
                >
                  {selectedEntries.length === 1
                    ? labelIsMe
                      ? 'Me'
                      : selected!.display_name
                    : `${selectedEntries.length} assignees`}
                </span>
              </div>
            )
          ) : (
            <UserPlus className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          ))}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed"
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
              width: 320,
              zIndex: 100000,
            }}
          >
            <div className="dropdown-menu-solid flex flex-col overflow-hidden">
              <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border-b border-[var(--border)]">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search team..."
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto py-1">
                {valueList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="gap-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex w-full items-center text-left text-sm text-[var(--color-muted-foreground)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Unassign</span>
                  </button>
                )}

                {humans.length > 0 && (
                  <>
                    <div className="px-spacing-3 py-spacing-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      People
                    </div>
                    {humans.map((entry) => {
                      const selectedNow = isSelected(entry)
                      const label =
                        currentUserId && entry.user_id === currentUserId ? 'Me' : entry.display_name
                      return (
                        <button
                          key={entry.participant_id}
                          type="button"
                          onClick={() => handlePick(entry)}
                          className={`gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left text-sm transition-colors ${
                            selectedNow ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                          }`}
                        >
                          <RosterMemberAvatar entry={entry} size={24} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[var(--foreground)]">{label}</div>
                            {entry.email && entry.user_id !== currentUserId && (
                              <div className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                                {entry.email}
                              </div>
                            )}
                          </div>
                          {selectedNow && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--foreground)]" />
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {agents.length > 0 && (
                  <>
                    <div className="px-spacing-3 py-spacing-1 mt-spacing-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Agents
                    </div>
                    {agents.map((entry) => {
                      const selectedNow = isSelected(entry)
                      return (
                        <button
                          key={entry.participant_id}
                          type="button"
                          onClick={() => handlePick(entry)}
                          className={`gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left text-sm transition-colors ${
                            selectedNow ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                          }`}
                        >
                          {entry.avatar_url ? (
                            <RosterMemberAvatar entry={entry} size={24} />
                          ) : (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[var(--foreground)]">
                              {entry.display_name}
                            </div>
                            {entry.role_label && (
                              <div className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                                {entry.role_label}
                              </div>
                            )}
                          </div>
                          {selectedNow && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--foreground)]" />
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {humans.length === 0 && agents.length === 0 && (
                  <div className="px-spacing-3 py-spacing-3 text-center text-xs text-[var(--color-muted-foreground)]">
                    No matches
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
