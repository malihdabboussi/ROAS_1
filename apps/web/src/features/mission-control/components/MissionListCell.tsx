import { ChevronRight, Clock, GitBranch, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { SelectCell } from '@/components/ui/forms/SelectCell'
import { formatWebinarSubtaskTitle } from '@/lib/missions'
import type {
  MissionColumnId,
  MissionsConfig,
  SubtasksDisplayMode,
} from '@/lib/spaces/space-schema-types'
import { cn } from '@/lib/utils/cn'
import { updateMission } from '../services/missions.service'
import type {
  Mission,
  MissionAgent,
  MissionDeliverable,
  MissionPriority,
  MissionSubtask,
} from '../types'
import { groupDeliverablesByCategory, type DeliverableCategory } from '../types'
import {
  formatDateShort,
  formatDateTooltip,
  isMissionFailedStatus,
  MISSION_LIST_PRIORITY_FIELD,
  STATUS_LABEL,
  STATUS_STYLE,
  SUBTASK_STATUS_STYLE,
} from './mission-list-config'
import { MissionDeliverableCell } from './MissionDeliverableCell'
import { AgentCell, AgentsStackCell } from './MissionListAgents'
import { MissionListProgressCell } from './MissionListProgressCell'
import { formatSubtaskStatusLabel } from '@/lib/missions'

export function MissionTitleText({ text }: { text: string }) {
  return (
    <div className="flex min-h-7 w-full min-w-0 items-center">
      <span className="body-3 text-foreground min-w-0 flex-1 cursor-pointer truncate transition-colors group-hover:text-emerald-500">
        {formatWebinarSubtaskTitle(text)}
      </span>
    </div>
  )
}

interface MissionListCellProps {
  colId: MissionColumnId
  mission: Mission
  agents: MissionAgent[]
  expandedSubtaskMissionIds?: Set<string>
  onToggleSubtaskExpand?: (missionId: string) => void
  loadedSubtaskCount?: number
  subtasksDisplayMode?: SubtasksDisplayMode
  progressShowNumber: boolean
  progressBarFill: string | null
  progressConfigurable: boolean
  onMissionsProgressPatch?: (
    patch: Pick<MissionsConfig, 'progress_show_number' | 'progress_bar_fill'>,
  ) => void | Promise<void>
  deliverablesByMissionId?: Record<string, MissionDeliverable[]>
  onOpenDeliverable?: (d: MissionDeliverable) => void
  actionMissionId: string | null
  onRetry: (e: React.MouseEvent, missionId: string) => void | Promise<void>
  onChanged?: () => void
}

export function MissionListCell({
  colId,
  mission,
  agents,
  expandedSubtaskMissionIds,
  onToggleSubtaskExpand,
  loadedSubtaskCount,
  subtasksDisplayMode,
  progressShowNumber,
  progressBarFill,
  progressConfigurable,
  onMissionsProgressPatch,
  deliverablesByMissionId,
  onOpenDeliverable,
  actionMissionId,
  onRetry,
  onChanged,
}: MissionListCellProps) {
  const stTotal = Math.max(mission.subtask_total ?? 0, loadedSubtaskCount ?? 0)
  const subExpanded = expandedSubtaskMissionIds?.has(mission.id) ?? false
  const reserveChevronSlot = Boolean(onToggleSubtaskExpand) && subtasksDisplayMode !== 'separate'
  const showSubChevron = reserveChevronSlot && stTotal > 0

  switch (colId) {
    case 'title': {
      const titleInner = <MissionTitleText text={mission.title} />
      if (!reserveChevronSlot) return titleInner
      return (
        <div className="flex min-h-7 w-full min-w-0 items-center">
          <div className="flex shrink-0 items-center gap-2.5">
            {showSubChevron ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSubtaskExpand?.(mission.id)
                }}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                aria-expanded={subExpanded}
                aria-label={subExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
              >
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-150',
                    subExpanded && 'rotate-90',
                  )}
                />
              </button>
            ) : (
              <span className="inline-block w-4 shrink-0" aria-hidden />
            )}
          </div>
          <div className="ml-2.5 flex min-w-0 flex-1 items-center gap-2.5 self-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 self-center">
              <div className="min-w-0 flex-1 self-center">{titleInner}</div>
            </div>
          </div>
        </div>
      )
    }
    case 'priority':
      return (
        <div className="w-full min-w-0 [&_button]:w-full [&_button]:min-w-0 [&_button]:justify-start">
          <SelectCell
            field={MISSION_LIST_PRIORITY_FIELD}
            value={mission.priority}
            onChange={async (next) => {
              const v = String(next) as MissionPriority
              try {
                await updateMission(mission.id, { priority: v })
                onChanged?.()
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : "Couldn't update priority. Try again."
                toast.error(msg)
              }
            }}
          />
        </div>
      )
    case 'assigned':
      return (
        <div className="min-w-0">
          <AgentsStackCell
            agentKeys={
              mission.subtask_agent_keys ??
              (mission.assigned_agent_key ? [mission.assigned_agent_key] : [])
            }
            agents={agents}
          />
        </div>
      )
    case 'working':
      return (
        <div className="min-w-0">
          <AgentCell agentKey={mission.current_agent_key} agents={agents} />
        </div>
      )
    case 'status':
      return (
        <div>
          <span
            className={`typo-caption inline-block whitespace-nowrap rounded-full px-2 py-0.5 ${STATUS_STYLE[mission.status] || ''}`}
          >
            {STATUS_LABEL[mission.status] || mission.status}
          </span>
        </div>
      )
    case 'progress':
      return (
        <MissionListProgressCell
          total={mission.subtask_total ?? 0}
          done={mission.subtask_done ?? 0}
          showNumber={progressShowNumber}
          barFill={progressBarFill}
          configurable={progressConfigurable}
          onPatch={onMissionsProgressPatch}
        />
      )
    case 'subtasks':
      return null
    case 'documents':
    case 'media':
    case 'artifacts': {
      const grouped = groupDeliverablesByCategory(deliverablesByMissionId?.[mission.id] ?? [])
      return (
        <MissionDeliverableCell
          category={colId as DeliverableCategory}
          items={grouped[colId as DeliverableCategory]}
          onOpen={onOpenDeliverable}
        />
      )
    }
    case 'updated': {
      const iso = mission.updated_at
      return (
        <div className="body-4 flex min-w-0 items-center gap-1.5 text-[var(--color-muted-foreground)]">
          <span className="inline-flex min-w-0 items-center gap-1" title={formatDateTooltip(iso)}>
            <RefreshCw className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatDateShort(iso)}</span>
          </span>
          {isMissionFailedStatus(mission.status) && (
            <span className="tooltip" data-tooltip="Retry">
              <button
                type="button"
                onClick={(e) => void onRetry(e, mission.id)}
                disabled={actionMissionId === mission.id}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )
    }
    case 'created': {
      const iso = mission.created_at
      return (
        <div
          className="body-4 flex min-w-0 items-center gap-1 text-[var(--color-muted-foreground)]"
          title={formatDateTooltip(iso)}
        >
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatDateShort(iso)}</span>
        </div>
      )
    }
    case 'campaign':
      return null
    default:
      return null
  }
}

export function MissionListSubtaskCell({
  colId,
  subtask,
  agents,
  subtasksDisplayMode,
}: {
  colId: MissionColumnId
  subtask: MissionSubtask
  agents: MissionAgent[]
  subtasksDisplayMode?: SubtasksDisplayMode
}) {
  switch (colId) {
    case 'title':
      if (subtasksDisplayMode === 'separate') {
        return (
          <div className="flex min-h-7 w-full min-w-0 items-center gap-1.5">
            <GitBranch
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <MissionTitleText text={subtask.title} />
            </div>
          </div>
        )
      }
      return (
        <div className="flex min-h-7 w-full min-w-0 items-center">
          <div className="flex shrink-0 items-center gap-2.5" aria-hidden>
            <span className="inline-block h-4 w-4 shrink-0" />
            <span className="inline-block h-4 w-4 shrink-0" />
          </div>
          <div className="inline-block w-1 shrink-0" aria-hidden />
          <div className="ml-2.5 flex min-w-0 flex-1 items-center">
            <MissionTitleText text={subtask.title} />
          </div>
        </div>
      )
    case 'priority':
    case 'working':
    case 'progress':
    case 'documents':
    case 'media':
    case 'artifacts':
      return <span className="body-4 text-[var(--color-muted-foreground)]">—</span>
    case 'assigned':
      return (
        <div className="min-w-0">
          <AgentCell agentKey={subtask.assigned_agent_key} agents={agents} />
        </div>
      )
    case 'status': {
      const cls = SUBTASK_STATUS_STYLE[subtask.status] ?? 'bg-zinc-500/15 text-zinc-400'
      const label = formatSubtaskStatusLabel(subtask.status, {
        executionStatus: subtask.execution_state?.execution_status,
      })
      return (
        <span
          className={`typo-caption inline-block whitespace-nowrap rounded-full px-2 py-0.5 ${cls}`}
        >
          {label}
        </span>
      )
    }
    case 'updated':
      return (
        <div
          className="body-4 flex min-w-0 items-center text-[var(--color-muted-foreground)]"
          title={formatDateTooltip(subtask.updated_at)}
        >
          <span className="truncate">{formatDateShort(subtask.updated_at)}</span>
        </div>
      )
    case 'created':
      return (
        <div
          className="body-4 flex min-w-0 items-center text-[var(--color-muted-foreground)]"
          title={formatDateTooltip(subtask.created_at)}
        >
          <span className="truncate">{formatDateShort(subtask.created_at)}</span>
        </div>
      )
    default:
      return null
  }
}
