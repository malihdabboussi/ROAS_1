'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Search, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents/mission-agents-api'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export type AssigneeFilterSlideOverMode = 'space' | 'missions'

interface AssigneeFilterSlideOverProps {
  open: boolean
  onClose: () => void
  mode: AssigneeFilterSlideOverMode
  roster: TeamRosterEntry[]
  selectedParticipantIds: string[]
  selectedAgentKeys: string[]
  onToggleSpaceParticipant: (participantId: string, checked: boolean) => void
  onToggleMissionAgent: (agentKey: string, checked: boolean) => void
}

export function AssigneeFilterSlideOver({
  open,
  onClose,
  mode,
  roster,
  selectedParticipantIds,
  selectedAgentKeys,
  onToggleSpaceParticipant,
  onToggleMissionAgent,
}: AssigneeFilterSlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [agents, setAgents] = useState<MissionAgent[]>([])
  const selectedParticipantSet = useMemo(
    () => new Set(selectedParticipantIds),
    [selectedParticipantIds],
  )
  const selectedAgentSet = useMemo(() => new Set(selectedAgentKeys), [selectedAgentKeys])

  useEffect(() => {
    if (!open) {
      setSearch('')
      return
    }
    if (mode !== 'missions') return
    let cancelled = false
    void fetchMissionAgents().then((list) => {
      if (!cancelled) setAgents(list)
    })
    return () => {
      cancelled = true
    }
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const onPointerDownCapture = (e: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return
      if (panel.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [open, onClose])

  const rosterRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = roster.filter((r) => r.kind === 'human' || r.kind === 'agent')
    if (!q) return list
    return list.filter((r) => r.display_name.toLowerCase().includes(q))
  }, [roster, search])

  const agentRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agents
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.agent_key.toLowerCase().includes(q),
    )
  }, [agents, search])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            className="pointer-events-auto my-3 flex w-[320px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--background)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Filter by assignee
              </span>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-[var(--border)] px-4 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] py-1.5 pl-8 pr-2 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--border)]"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {mode === 'space' ? (
                <div className="space-y-0.5">
                  {rosterRows.map((r) => (
                    <div
                      key={r.participant_id}
                      className="flex h-9 items-center justify-between gap-2 rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[10px] font-medium text-[var(--foreground)]">
                            {r.kind === 'agent' ? (
                              <Bot className="h-3 w-3" />
                            ) : (
                              (r.display_name[0] ?? '?')
                            )}
                          </span>
                        )}
                        <span className="truncate text-xs text-[var(--foreground)]">
                          {r.display_name}
                        </span>
                      </div>
                      <Switch
                        checked={selectedParticipantSet.has(r.participant_id)}
                        onCheckedChange={(v) => onToggleSpaceParticipant(r.participant_id, v)}
                      />
                    </div>
                  ))}
                  {rosterRows.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                      No people match
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {agentRows.map((a) => (
                    <div
                      key={a.agent_key}
                      className="flex h-9 items-center justify-between gap-2 rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {a.image_url ? (
                          <img
                            src={a.image_url}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)]">
                            <Bot className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                          </span>
                        )}
                        <span className="truncate text-xs text-[var(--foreground)]">{a.name}</span>
                      </div>
                      <Switch
                        checked={selectedAgentSet.has(a.agent_key)}
                        onCheckedChange={(v) => onToggleMissionAgent(a.agent_key, v)}
                      />
                    </div>
                  ))}
                  {agentRows.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                      {agents.length === 0 ? 'Loading agents…' : 'No agents match'}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
