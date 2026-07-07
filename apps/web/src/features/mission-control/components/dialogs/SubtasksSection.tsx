'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  GitBranch,
  RefreshCw,
  User,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { updateSubtask } from '../../services/missions.service'
import type { MissionAgent, MissionSubtask, PrdContent, SubtaskStatus } from '../../types'

function formatAssigneeLabel(raw: string): string {
  const s = raw.trim().replace(/_/g, ' ')
  if (!s) return raw
  return s
    .split(/\s+/)
    .map((word) =>
      word.length === 0 ? word : word[0]!.toLocaleUpperCase() + word.slice(1).toLocaleLowerCase(),
    )
    .join(' ')
}

interface SubtasksSectionProps {
  missionId: string | null
  logsLoading: boolean
  prdLoading: boolean
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
  planContent: PrdContent | null
  onOpenPlan: () => void
  onUpdated: () => void
  onSubtasksChange: (updater: (prev: MissionSubtask[]) => MissionSubtask[]) => void
}

export function SubtasksSection({
  missionId,
  logsLoading,
  prdLoading,
  subtasks,
  agents,
  planContent,
  onOpenPlan,
  onUpdated,
  onSubtasksChange,
}: SubtasksSectionProps) {
  const [expandedSubtask, setExpandedSubtask] = useState<string | null>(null)
  const [subtaskAssigneeOpenId, setSubtaskAssigneeOpenId] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="md:border-t-glass md:pt-spacing-3 mb-3 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden md:mt-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h3 className="body-2 font-semibold text-[var(--color-muted-foreground)]">
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
              className="body-3 flex items-center gap-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              <span>Task overview</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="scrollbar-hide mt-spacing-2 min-h-0 flex-1 overflow-y-auto">
          {logsLoading || prdLoading ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center">
              <VibeyLoadingOrb state="thinking" size="md" />
            </div>
          ) : subtasks.length > 0 ? (
            <div>
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
                  ? 'text-red-400'
                  : subtask.status === 'done'
                    ? 'text-emerald-400'
                    : subtask.status === 'in_progress'
                      ? 'text-amber-400'
                      : subtask.status === 'revision'
                        ? 'text-orange-400'
                        : 'text-[var(--color-muted-foreground)]/40'
                const StatusIcon = isBlocked
                  ? Ban
                  : subtask.status === 'done'
                    ? CheckCircle2
                    : subtask.status === 'in_progress'
                      ? Clock
                      : subtask.status === 'revision'
                        ? RefreshCw
                        : Circle
                const isExpanded = expandedSubtask === subtask.id
                const isHuman = subtask.assignee_type === 'human'
                const assigneeAgent =
                  !isHuman && subtask.assigned_agent_key
                    ? agents.find((a) => a.agent_key === subtask.assigned_agent_key)
                    : undefined
                const assigneeLabel = isHuman
                  ? `${subtask.status === 'awaiting_human' ? 'Awaiting ' : ''}teammate`
                  : formatAssigneeLabel(
                      assigneeAgent?.name ?? subtask.assigned_agent_key ?? 'Unassigned',
                    )

                return (
                  <div key={subtask.id} className="border-b-glass last:border-b-0">
                    <div
                      className={`relative flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${isExpanded ? 'bg-[var(--color-primary)]/10' : 'hover:bg-hover-subtle'}`}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          if (!missionId) return
                          if (isBlocked) return
                          const nextStatus: Record<string, SubtaskStatus> = {
                            done: 'pending',
                            revision: 'pending',
                            pending: 'done',
                            blocked: 'pending',
                          }
                          const next = nextStatus[subtask.status] || 'pending'
                          try {
                            await updateSubtask(missionId, subtask.id, { status: next })
                            onUpdated()
                          } catch {
                            /* noop */
                          }
                        }}
                        className="shrink-0"
                        title={
                          isBlocked
                            ? 'Waiting for a dependency to complete'
                            : `Status: ${subtask.status}`
                        }
                      >
                        <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
                        className="body-2 flex min-w-0 flex-1 items-center gap-2 text-left text-[var(--color-foreground)]"
                      >
                        <GitBranch
                          className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{subtask.title}</span>
                        <ChevronDown
                          className={`text-[var(--color-muted-foreground)]/50 h-3 w-3 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isHuman ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/spaces?tab=your-turn&item=${subtask.id}`)
                          }}
                          className="body-3 gap-spacing-1 bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)]/25 flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[var(--color-primary)] transition-colors"
                          title="Open in Your Turn"
                        >
                          <User className="h-3 w-3" />
                          {assigneeLabel}
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
                          className="body-3 shrink-0 rounded-full bg-[var(--color-secondary)] px-1.5 py-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                          title="Reassign subtask"
                        >
                          {assigneeLabel}
                        </button>
                      )}
                      {subtaskAssigneeOpenId === subtask.id && (
                        <>
                          <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => setSubtaskAssigneeOpenId(null)}
                          />
                          <div className="absolute right-2 top-8 z-[70] w-52" data-dropdown>
                            <div className="dropdown-menu-solid p-spacing-2">
                              <div className="space-y-spacing-1">
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
                                                ? { ...item, assigned_agent_key: agent.agent_key }
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
                                        <div>{agent.name}</div>
                                        {agent.role && (
                                          <div className="typo-caption text-muted-foreground">
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
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`content-${subtask.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t-glass mx-2.5 space-y-3 pb-3 pt-3">
                            {subtask.intent && subtask.intent.why && (
                              <div className="space-y-1">
                                <h4 className="body-3 font-semibold text-[var(--color-foreground)]">
                                  Plan Intent
                                </h4>
                                <div className="space-y-1 pl-2">
                                  {(
                                    [
                                      ['Why', subtask.intent.why],
                                      ['Story', subtask.intent.story],
                                      ['Sensory', subtask.intent.sensory],
                                      ['End-State', subtask.intent.endState],
                                      ['Ecology', subtask.intent.ecology],
                                    ] as const
                                  ).map(([label, value]) =>
                                    value ? (
                                      <div key={label} className="flex gap-1.5">
                                        <span className="body-3 shrink-0 font-medium text-[var(--color-muted-foreground)]">
                                          {label}:
                                        </span>
                                        <span className="body-3 text-[var(--color-muted-foreground)]/80">
                                          {value}
                                        </span>
                                      </div>
                                    ) : null,
                                  )}
                                </div>
                              </div>
                            )}
                            {subtask.feedback && (
                              <div className="space-y-1">
                                <h4 className="body-3 font-semibold text-orange-400">Feedback</h4>
                                <p className="body-3 pl-2 text-orange-400/80">{subtask.feedback}</p>
                              </div>
                            )}
                            {subtask.output && Object.keys(subtask.output).length > 0 && (
                              <div className="space-y-1">
                                <h4 className="body-3 font-semibold text-[var(--color-foreground)]">
                                  Agent Output
                                </h4>
                                <div className="pl-2">
                                  {typeof subtask.output.content === 'string' ? (
                                    <MarkdownRenderer className="body-3 max-w-none leading-relaxed text-[var(--color-muted-foreground)]">
                                      {subtask.output.content.slice(0, 1500)}
                                    </MarkdownRenderer>
                                  ) : (
                                    <pre className="body-3 overflow-x-auto whitespace-pre-wrap text-[var(--color-muted-foreground)]">
                                      {JSON.stringify(subtask.output, null, 2).slice(0, 1500)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            )}
                            {isBlocked && (
                              <div className="space-y-1">
                                <h4 className="body-3 font-semibold text-amber-400">
                                  Waiting for subtask
                                </h4>
                                <p className="body-3 pl-2 text-amber-400/80">
                                  {subtask.depends_on
                                    .map(
                                      (depId) =>
                                        `"${subtasks.find((subtaskItem) => subtaskItem.id === depId)?.title || depId}"`,
                                    )
                                    .join(', ')}{' '}
                                  must complete first
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          ) : planContent ? (
            <div className="min-w-0">
              {planContent.summary && (
                <p className="body-2 mb-3 text-[var(--color-muted-foreground)]">
                  {planContent.summary}
                </p>
              )}
              {(planContent as { approach?: string }).approach && (
                <p className="body-2 text-[var(--color-muted-foreground)]/70 mb-3 italic">
                  {(planContent as { approach?: string }).approach}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
