'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bot, Component, GripVertical, X } from 'lucide-react'
import { orgService, type TeamRosterEntry } from '@/lib/org'

function RosterAvatar({ entry }: { entry: TeamRosterEntry }) {
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase">
      <Bot className="h-3.5 w-3.5" />
    </span>
  )
}

export function StartBrainstormModal({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: (agentKeys: string[]) => void
}) {
  const [agents, setAgents] = useState<TeamRosterEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<TeamRosterEntry[]>([])
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const reset = useCallback(() => {
    setSelected([])
    setSearch('')
    setDropdownOpen(false)
    setSubmitting(false)
    setDragIdx(null)
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset()
    if (loaded) return
    orgService
      .listRoster({ kind: 'agent' })
      .then((rows) => {
        setAgents(rows)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [open, reset, loaded])

  const selectedKeys = useMemo(
    () => new Set(selected.map((e) => e.agent_key).filter(Boolean)),
    [selected],
  )

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return agents
      .filter((e) => {
        if (!e.agent_key) return false
        if (selectedKeys.has(e.agent_key)) return false
        return (
          e.display_name.toLowerCase().includes(q) ||
          (e.agent_key?.toLowerCase().includes(q) ?? false)
        )
      })
      .slice(0, 10)
  }, [search, agents, selectedKeys])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      )
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const pickAgent = (entry: TeamRosterEntry) => {
    setSelected((prev) => [...prev, entry])
    setSearch('')
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  const removeAgent = (key: string) => {
    setSelected((prev) => prev.filter((e) => e.agent_key !== key))
  }

  const handleDragStart = (idx: number) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setSelected((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      if (moved) next.splice(idx, 0, moved)
      return next
    })
    setDragIdx(idx)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
  }

  const handleStart = () => {
    const keys = selected.map((e) => e.agent_key).filter(Boolean) as string[]
    if (keys.length < 2) return
    setSubmitting(true)
    onStart(keys)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div
            className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-visible border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground flex items-center gap-2">
                    <Component className="h-4 w-4 shrink-0" />
                    Start a Brainstorm
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-4 text-muted-foreground mt-spacing-1">
                    Pick agents and set the order they respond in.
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-visible">
              <div className="relative">
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => {
                    if (search.trim()) setDropdownOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dropdownOpen && filteredResults.length > 0) {
                      e.preventDefault()
                      pickAgent(filteredResults[0]!)
                    }
                  }}
                  placeholder="Search agents…"
                  className="border-border bg-background body-3 text-foreground placeholder:text-muted-foreground px-spacing-4 py-spacing-2 focus-visible:border-border w-full rounded-lg border outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoComplete="off"
                />

                {dropdownOpen && filteredResults.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="border-border bg-card rounded-spacing-2 absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto border shadow-lg"
                  >
                    {filteredResults.map((entry) => (
                      <button
                        key={entry.agent_key}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          pickAgent(entry)
                        }}
                        className="hover:bg-hover-subtle gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors"
                      >
                        <RosterAvatar entry={entry} />
                        <div className="min-w-0 flex-1">
                          <p className="body-3 text-foreground truncate font-medium">
                            {entry.display_name}
                          </p>
                          <p className="body-4 text-muted-foreground truncate">{entry.agent_key}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {dropdownOpen && search.trim() && filteredResults.length === 0 && (
                  <div className="border-border bg-card rounded-spacing-2 absolute left-0 right-0 top-full z-50 mt-1 border shadow-lg">
                    <p className="body-3 text-muted-foreground px-spacing-4 py-spacing-3">
                      No agents found
                    </p>
                  </div>
                )}
              </div>

              {selected.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="body-4 text-muted-foreground font-medium">
                    Turn order (drag to reorder)
                  </p>
                  {selected.map((entry, idx) => (
                    <div
                      key={entry.agent_key}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`border-border gap-spacing-2 px-spacing-3 py-spacing-2 group flex items-center rounded-lg border transition-colors ${
                        dragIdx === idx ? 'bg-primary/5 border-primary/30' : 'bg-card'
                      }`}
                    >
                      <GripVertical className="text-muted-foreground h-3.5 w-3.5 shrink-0 cursor-grab" />
                      <span className="body-4 text-muted-foreground w-5 shrink-0 text-center tabular-nums">
                        {idx + 1}
                      </span>
                      <RosterAvatar entry={entry} />
                      <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                        {entry.display_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => entry.agent_key && removeAgent(entry.agent_key)}
                        className="text-muted-foreground hover:text-foreground rounded p-0.5 opacity-0 transition-all group-hover:opacity-100"
                        aria-label={`Remove ${entry.display_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-2 relative flex shrink-0 items-center justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="button-glass-neutral px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={submitting || selected.length < 2}
                className="button-glass-accent px-spacing-6 py-spacing-2 rounded-lg text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
              >
                {submitting ? 'Starting…' : 'Start Brainstorm'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
