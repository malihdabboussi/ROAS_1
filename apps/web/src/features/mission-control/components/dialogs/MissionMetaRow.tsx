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

const DESCRIPTION_COLLAPSE_CHARS = 120

function MissionDescriptionText({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  const text = description.trim()
  if (!text) {
    return <span className="body-3 text-muted-foreground">—</span>
  }
  const needsCollapse = text.length > DESCRIPTION_COLLAPSE_CHARS
  const shown =
    !needsCollapse || expanded ? text : `${text.slice(0, DESCRIPTION_COLLAPSE_CHARS).trimEnd()}…`

  return (
    <div className="min-w-0 flex-1">
      <p className="body-3 text-foreground whitespace-pre-wrap">{shown}</p>
      {needsCollapse ? (
        <button
          type="button"
          className="body-4 text-primary mt-spacing-1 font-medium"
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
    <div className="gap-x-spacing-6 gap-y-spacing-2 grid flex-shrink-0 grid-cols-1 md:mt-spacing-2 md:grid-cols-2">
      <div className="gap-y-spacing-2 flex flex-col">
        <div className="gap-spacing-3 flex items-center">
          <span className="body-3 text-muted-foreground w-20 shrink-0">Status</span>
          <div className="relative">
            <button
              type="button"
              title="Status is managed by ROAS"
              disabled
              className={`body-3 flex items-center gap-1.5 rounded-md px-2 py-0.5 ${statusTextClass[currentStatus] ?? ''} cursor-not-allowed opacity-60`}
            >
              <StatusIcon className="icon-sm" />
              <span>
                {ALL_MISSION_STATUSES.find((s) => s.value === currentStatus)?.label ??
                  currentStatus}
              </span>
            </button>
          </div>
        </div>

        <div className="gap-spacing-3 flex items-center">
          <span className="body-3 text-muted-foreground w-20 shrink-0">Priority</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPriorityOpen(!priorityOpen)}
              className={`body-3 hover:bg-hover-subtle flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors ${activePriority.color}`}
            >
              <Flag className="icon-sm" />
              <span>{activePriority.label}</span>
            </button>
            {priorityOpen && (
              <>
                <div className="fixed inset-0 z-dropdown" onClick={() => setPriorityOpen(false)} />
                <div className="mt-spacing-1 absolute left-0 top-full z-dropdown" data-dropdown>
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

      <div className="gap-y-spacing-2 flex flex-col">
        <div className="gap-spacing-3 flex items-center">
          <span className="body-3 text-muted-foreground w-20 shrink-0">Created</span>
          <span className="body-3 text-foreground">
            {new Date(mission.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="gap-spacing-3 flex items-center">
          <span className="body-3 text-muted-foreground w-20 shrink-0">Completed</span>
          <span className="body-3 text-foreground">
            {mission.completed_at ? new Date(mission.completed_at).toLocaleDateString() : '—'}
          </span>
        </div>
      </div>

      <div className="gap-spacing-3 col-span-1 flex items-center md:col-span-2">
        <span className="body-3 text-muted-foreground w-20 shrink-0">Assignees</span>
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
                    className="border-card h-5 w-5 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background">
                    {(agent?.name ?? key).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))
          ) : (
            <span className="body-3 text-muted-foreground">Unassigned</span>
          )}
        </div>
      </div>

      <div className="gap-spacing-1 col-span-1 flex flex-col md:col-span-2 md:flex-row md:items-start md:gap-spacing-3">
        <span className="body-3 text-muted-foreground w-20 shrink-0 md:pt-0.5">Description</span>
        <MissionDescriptionText description={description} />
      </div>
    </div>
  )
}
