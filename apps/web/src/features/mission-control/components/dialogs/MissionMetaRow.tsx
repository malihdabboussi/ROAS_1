'use client'

import { useState } from 'react'
import {
  Archive,
  Ban,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flag,
  Inbox,
  KeyRound,
  Target,
} from 'lucide-react'
import type {
  Mission,
  MissionAgent,
  MissionPriority,
  MissionStatus,
  MissionSubtask,
} from '../../types'
import { ALL_MISSION_STATUSES } from '../../types'

const statusIcons: Record<string, typeof Circle> = {
  backlog: Archive,
  inbox: Inbox,
  planning: Target,
  pending_approval: Eye,
  awaiting_access_approval: KeyRound,
  todo: Circle,
  in_progress: Clock,
  review: Eye,
  done: CheckCircle2,
  blocked: Ban,
  archived: Archive,
  error: Ban,
  failed: Ban,
  dead_letter: Ban,
}

const statusTextClass: Record<string, string> = {
  backlog: 'text-status-violet',
  inbox: 'text-status-cyan',
  planning: 'text-status-indigo',
  pending_approval: 'text-status-amber',
  awaiting_access_approval: 'text-status-amber',
  todo: 'text-status-cyan',
  in_progress: 'text-status-amber',
  review: 'text-status-violet',
  done: 'text-status-emerald',
  blocked: 'text-status-red',
  archived: 'text-status-violet',
  error: 'text-status-red',
  failed: 'text-status-red',
  dead_letter: 'text-status-red',
}

const priorityOptions: { value: MissionPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'low', label: 'Low', color: 'text-blue-400' },
]

interface MissionMetaRowProps {
  mission: Mission
  liveMission: Mission | null
  agents: MissionAgent[]
  subtasks: MissionSubtask[]
  currentStatus: MissionStatus
  currentPriority: MissionPriority
  description: string
  onStatusChange: (newStatus: MissionStatus) => Promise<void>
  onPriorityChange: (newPriority: MissionPriority) => Promise<void>
  onDescriptionChange: (value: string) => void
  onUpdated: () => void
}

const DESCRIPTION_COLLAPSE_CHARS = 180

function MissionDescriptionText({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  const text = description.trim()
  if (!text) {
    return <span className="body-2 text-[var(--color-muted-foreground)]">—</span>
  }
  const needsCollapse = text.length > DESCRIPTION_COLLAPSE_CHARS
  const shown =
    !needsCollapse || expanded ? text : `${text.slice(0, DESCRIPTION_COLLAPSE_CHARS).trimEnd()}…`

  return (
    <div className="min-w-0 flex-1">
      <p className="body-2 whitespace-pre-wrap text-[var(--color-foreground)]">{shown}</p>
      {needsCollapse ? (
        <button
          type="button"
          className="body-4 text-primary mt-1 font-medium"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

export function MissionMetaRow({
  mission,
  liveMission,
  agents,
  subtasks,
  currentStatus,
  currentPriority,
  description,
  onPriorityChange,
}: MissionMetaRowProps) {
  const [priorityOpen, setPriorityOpen] = useState(false)

  const StatusIcon = statusIcons[currentStatus] ?? Circle
  const activePriority =
    priorityOptions.find((p) => p.value === currentPriority) ?? priorityOptions[1]!

  const effectiveMission = liveMission ?? mission

  const assignedKeys = new Set<string>()
  const missionKey = effectiveMission.assigned_agent_key || effectiveMission.current_agent_key
  if (missionKey) assignedKeys.add(missionKey)
  for (const st of subtasks) {
    if (st.assigned_agent_key) assignedKeys.add(st.assigned_agent_key)
  }
  const assignedAgents = Array.from(assignedKeys).map((key) => ({
    key,
    agent: agents.find((a) => a.agent_key === key) ?? null,
  }))

  return (
    <div className="grid flex-shrink-0 grid-cols-1 gap-x-6 gap-y-2 md:mt-4 md:grid-cols-2">
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-3">
          <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)]">Status</span>
          <div className="relative">
            <button
              type="button"
              title="Status is managed by ROAS"
              disabled
              className={`body-2 flex items-center gap-1.5 rounded-md px-2 py-0.5 ${statusTextClass[currentStatus] ?? ''} cursor-not-allowed opacity-60`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>
                {ALL_MISSION_STATUSES.find((s) => s.value === currentStatus)?.label ??
                  currentStatus}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)]">
            Priority
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPriorityOpen(!priorityOpen)}
              className={`body-2 hover:bg-hover-subtle flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors ${activePriority.color}`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{activePriority.label}</span>
            </button>
            {priorityOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setPriorityOpen(false)} />
                <div className="mt-spacing-1 absolute left-0 top-full z-[70]" data-dropdown>
                  <div className="dropdown-menu-solid p-spacing-2 min-w-40">
                    <div className="space-y-spacing-1">
                      {priorityOptions.map((p) => {
                        const isSelected = currentPriority === p.value
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => void onPriorityChange(p.value)}
                            className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle hover:text-foreground'} ${p.color}`}
                          >
                            <Flag className="icon-sm" />
                            <span>{p.label}</span>
                            {isSelected && <Check className="icon-sm ml-auto" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-3">
          <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)]">Created</span>
          <span className="body-2 text-[var(--color-foreground)]">
            {new Date(mission.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)]">
            Completed
          </span>
          <span className="body-2 text-[var(--color-foreground)]">
            {mission.completed_at ? new Date(mission.completed_at).toLocaleDateString() : '—'}
          </span>
        </div>
      </div>

      <div className="col-span-1 flex items-center gap-3 md:col-span-2">
        <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)]">Assignees</span>
        <div className="flex items-center">
          {assignedAgents.length > 0 ? (
            assignedAgents.map(({ key, agent }, i) => (
              <div
                key={key}
                className={i > 0 ? '-ml-1.5' : ''}
                title={agent ? `${agent.name}${agent.role ? ` — ${agent.role}` : ''}` : key}
              >
                {agent?.image_url ? (
                  <img
                    src={agent.image_url}
                    alt={agent.name}
                    className="h-5 w-5 rounded-full object-cover ring-2 ring-[var(--color-card)]"
                  />
                ) : (
                  <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-[var(--color-card)]">
                    {(agent?.name ?? key).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <span className="body-2 text-[var(--color-muted-foreground)]">Unassigned</span>
          )}
        </div>
      </div>

      <div className="col-span-1 flex flex-col gap-1 md:col-span-2 md:flex-row md:items-start md:gap-3">
        <span className="body-2 w-20 shrink-0 text-[var(--color-muted-foreground)] md:pt-0.5">
          Description
        </span>
        <MissionDescriptionText description={description} />
      </div>
    </div>
  )
}
