'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  RefreshCw,
  User,
} from 'lucide-react'
import { AgentAvatar } from '@/components/agents'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { formatSubtaskStatusLabel, formatWebinarSubtaskTitle } from '@/lib/missions'
import { updateSubtask } from '../../services/missions.service'
import type { MissionAgent, MissionSubtask, PrdContent, SubtaskStatus } from '../../types'
import {
  formatAgentShortName,
  formatRelativeTime,
  resolveSubtaskIssueDetail,
} from './detail-helpers'

interface SubtasksSectionProps {
  missionId: string | null
  logsLoading: boolean
  prdLoading: boolean
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
  planContent: PrdContent | null
  missionProgressNotes?: string | null
  missionError?: string | null
  onOpenPlan: () => void
  onOpenSubtask: (subtaskId: string) => void
  onUpdated: () => void
  onSubtasksChange: (updater: (prev: MissionSubtask[]) => MissionSubtask[]) => void
  extendSlot?: ReactNode
}

export function SubtasksSection({
  missionId,
  logsLoading,
  prdLoading,
  subtasks,
  agents,
  planContent,
  missionProgressNotes,
  missionError,
  onOpenPlan,
  onOpenSubtask,
  onUpdated,
  onSubtasksChange,
  extendSlot,
}: SubtasksSectionProps) {
  const [subtaskAssigneeOpenId, setSubtaskAssigneeOpenId] = useState<string | null>(null)
  const [completeConfirm, setCompleteConfirm] = useState<{
    subtaskId: string
    title: string
  } | null>(null)
  const [completing, setCompleting] = useState(false)
  const router = useRouter()

  async function applySubtaskStatus(subtaskId: string, next: SubtaskStatus) {
    if (!missionId) return
    try {
      await updateSubtask(missionId, subtaskId, { status: next })
      onUpdated()
    } catch {
      /* noop */
    }
  }

  return (
    <div className="md:border-t-glass md:pt-spacing-4 mb-spacing-2 mt-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <ConfirmDialog
        open={Boolean(completeConfirm)}
        title="Mark this subtask complete?"
        description={
          completeConfirm
            ? `“${completeConfirm.title}” will be marked done. Only do this if the work is actually finished.`
            : undefined
        }
        confirmText="Mark complete"
        confirmingText="Marking…"
        confirmDisabled={completing}
        confirmTone="primary"
        onOpenChange={(open) => {
          if (!open && !completing) setCompleteConfirm(null)
        }}
        onConfirm={async () => {
          if (!completeConfirm) return
          setCompleting(true)
          try {
            await applySubtaskStatus(completeConfirm.subtaskId, 'done')
            setCompleteConfirm(null)
          } finally {
            setCompleting(false)
          }
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h3 className="body-2 text-foreground font-semibold">
            {logsLoading || prdLoading
              ? 'Loading...'
              : subtasks.length > 0
                ? `Subtasks (${subtasks.filter((subtask) => subtask.status === 'done').length}/${subtasks.length})`
                : 'Execution Plan'}
          </h3>
          {(planContent || subtasks.length > 0) && (
            <button
              type="button"
              onClick={onOpenPlan}
              className="body-3 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>Task overview</span>
              <ChevronRight className="icon-sm" />
            </button>
          )}
        </div>
        <div className="scrollbar-hide mt-spacing-2 min-h-0 flex-1 overflow-y-auto">
          {logsLoading || prdLoading ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center">
              <VibeyLoadingOrb state="thinking" size="md" />
            </div>
          ) : subtasks.length > 0 ? (
            <div className="border-border divide-y border-y">
              {subtasks.map((subtask) => {
                const hasDeps = subtask.depends_on && subtask.depends_on.length > 0
                const depsReady =
                  !hasDeps ||
                  subtask.depends_on.every(
                    (depId) =>
                      subtasks.find((subtaskItem) => subtaskItem.id === depId)?.status === 'done',
                  )
                const isBlocked = subtask.status === 'pending' && hasDeps && !depsReady
                const statusColor = isBlocked
                  ? 'text-destructive'
                  : subtask.status === 'done'
                    ? 'text-success'
                    : subtask.status === 'in_progress'
                      ? 'text-warning'
                      : subtask.status === 'revision' || subtask.status === 'blocked'
                        ? 'text-warning'
                        : 'text-muted-foreground/40'
                const StatusIcon = isBlocked
                  ? Ban
                  : subtask.status === 'done'
                    ? CheckCircle2
                    : subtask.status === 'in_progress'
                      ? Clock
                      : subtask.status === 'revision'
                        ? RefreshCw
                        : subtask.status === 'blocked'
                          ? Ban
                          : Circle
                const isHuman = subtask.assignee_type === 'human'
                const assigneeAgent =
                  !isHuman && subtask.assigned_agent_key
                    ? agents.find((a) => a.agent_key === subtask.assigned_agent_key)
                    : undefined
                const assigneeFullName =
                  assigneeAgent?.name ?? subtask.assigned_agent_key ?? 'Unassigned'
                const assigneeLabel = isHuman
                  ? `${subtask.status === 'awaiting_human' ? 'Awaiting ' : ''}teammate`
                  : formatAgentShortName(assigneeFullName) || assigneeFullName
                const statusLabel = formatSubtaskStatusLabel(subtask.status, {
                  dependencyBlocked: isBlocked,
                  executionStatus: subtask.execution_state?.execution_status,
                })
                const statusMeta = `${statusLabel} · ${formatRelativeTime(subtask.updated_at)}`
                const issueDetail = resolveSubtaskIssueDetail(subtask, {
                  progressNotes: missionProgressNotes,
                  error: missionError,
                })
                const statusTooltip =
                  issueDetail ||
                  (isBlocked
                    ? 'Waiting for a dependency to complete'
                    : subtask.feedback ||
                      (subtask.status === 'done' ? 'Mark as not done' : 'Mark complete'))

                return (
                  <div key={subtask.id} className="relative">
                    <div className="hover:bg-hover-subtle gap-spacing-2 px-spacing-1 py-spacing-2 flex items-center">
                      <Tooltip label={statusTooltip} side="top" wide={Boolean(issueDetail)}>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!missionId) return
                            if (isBlocked) return
                            if (subtask.status === 'done') {
                              await applySubtaskStatus(subtask.id, 'pending')
                              return
                            }
                            if (
                              subtask.status === 'pending' ||
                              subtask.status === 'blocked' ||
                              subtask.status === 'in_progress' ||
                              subtask.status === 'revision'
                            ) {
                              setCompleteConfirm({
                                subtaskId: subtask.id,
                                title: formatWebinarSubtaskTitle(subtask.title),
                              })
                              return
                            }
                            await applySubtaskStatus(subtask.id, 'pending')
                          }}
                          className="shrink-0"
                        >
                          <StatusIcon className={`icon-sm ${statusColor}`} />
                        </button>
                      </Tooltip>
                      <button
                        type="button"
                        onClick={() => onOpenSubtask(subtask.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="body-3 text-foreground block truncate font-medium">
                          {formatWebinarSubtaskTitle(subtask.title)}
                        </span>
                        {issueDetail || subtask.feedback ? (
                          <Tooltip
                            label={issueDetail || subtask.feedback || statusMeta}
                            side="bottom"
                            wide
                            triggerClassName="block min-w-0"
                          >
                            <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                              {statusMeta}
                              {subtask.feedback ? (
                                <span className="text-warning"> · {subtask.feedback}</span>
                              ) : null}
                              {issueDetail ? (
                                <span className="text-muted-foreground/70">
                                  {' '}
                                  · Hover for details
                                </span>
                              ) : null}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                            {statusMeta}
                          </span>
                        )}
                      </button>
                      {isHuman ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/spaces?tab=your-turn&item=${subtask.id}`)
                          }}
                          className="body-4 gap-spacing-1 bg-primary/15 hover:bg-primary/25 text-primary px-spacing-2 py-spacing-1 flex shrink-0 items-center rounded-full transition-colors"
                          title="Open in Your Turn"
                        >
                          <span className="bg-primary/20 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                            <User className="icon-xs" />
                          </span>
                          <span className="truncate">{assigneeLabel}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSubtaskAssigneeOpenId(
                              subtaskAssigneeOpenId === subtask.id ? null : subtask.id,
                            )
                          }}
                          className="body-4 gap-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex shrink-0 items-center rounded-full transition-colors"
                          title={`${assigneeFullName}${assigneeAgent?.role ? ` — ${assigneeAgent.role}` : ''} · Reassign`}
                        >
                          {assigneeAgent ? (
                            <AgentAvatar agent={assigneeAgent} className="h-5 w-5" />
                          ) : (
                            <span className="bg-secondary text-muted-foreground typo-2xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold">
                              {assigneeLabel.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                          <span className="truncate">{assigneeLabel}</span>
                        </button>
                      )}
                      {subtaskAssigneeOpenId === subtask.id && (
                        <>
                          <div
                            className="z-dropdown fixed inset-0"
                            onClick={() => setSubtaskAssigneeOpenId(null)}
                          />
                          <div
                            className="z-dropdown mt-spacing-1 absolute right-0 top-full w-52"
                            data-dropdown
                          >
                            <div className="dropdown-menu-solid p-spacing-1">
                              <div className="gap-spacing-1 flex flex-col">
                                {agents.map((agent) => {
                                  const isAgentSelected =
                                    agent.agent_key === subtask.assigned_agent_key
                                  return (
                                    <button
                                      key={agent.agent_key}
                                      type="button"
                                      onClick={async () => {
                                        if (!missionId) return
                                        setSubtaskAssigneeOpenId(null)
                                        try {
                                          await updateSubtask(missionId, subtask.id, {
                                            assigned_agent_key: agent.agent_key,
                                          })
                                          onSubtasksChange((prev) =>
                                            prev.map((item) =>
                                              item.id === subtask.id
                                                ? {
                                                    ...item,
                                                    assigned_agent_key: agent.agent_key,
                                                  }
                                                : item,
                                            ),
                                          )
                                          onUpdated()
                                        } catch {
                                          /* noop */
                                        }
                                      }}
                                      className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isAgentSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                                    >
                                      {agent.image_url ? (
                                        <img
                                          src={agent.image_url}
                                          alt={agent.name}
                                          className="h-5 w-5 shrink-0 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="bg-primary/20 text-primary typo-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold">
                                          {agent.name.charAt(0)}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate">
                                          {formatAgentShortName(agent.name) || agent.name}
                                        </div>
                                        {agent.role && (
                                          <div className="typo-caption text-muted-foreground truncate">
                                            {agent.role}
                                          </div>
                                        )}
                                      </div>
                                      {isAgentSelected && (
                                        <Check className="icon-sm ml-auto shrink-0" />
                                      )}
                                    </button>
                                  )
                                })}
                                {agents.length === 0 && (
                                  <div className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                                    No agents available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {extendSlot}
            </div>
          ) : (
            <>
              {planContent ? (
                <div className="min-w-0">
                  {planContent.summary && (
                    <p className="body-2 text-muted-foreground mb-3">{planContent.summary}</p>
                  )}
                  {(planContent as { approach?: string }).approach && (
                    <p className="body-2 text-muted-foreground/70 mb-3 italic">
                      {(planContent as { approach?: string }).approach}
                    </p>
                  )}
                </div>
              ) : null}
              {extendSlot}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
