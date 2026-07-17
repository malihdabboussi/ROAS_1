import type { MouseEvent, RefObject } from 'react'
import { ChevronRight, GitBranch, MoreHorizontal, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import type { MissionsConfig, SubtasksDisplayMode } from '@/lib/spaces/space-schema-types'
import { cn } from '@/lib/utils/cn'
import type { Mission, MissionAgent, MissionSubtask } from '../types'
import {
  formatDateShort,
  isMissionFailedStatus,
  STATUS_LABEL,
  STATUS_STYLE,
  SUBTASK_STATUS_LABEL,
  SUBTASK_STATUS_STYLE,
} from './mission-list-config'
import { AgentsStackCell } from './MissionListAgents'
import { MissionTitleText } from './MissionListCell'
import { MissionListProgressCell } from './MissionListProgressCell'

interface MissionListMobileCardsProps {
  missions: Mission[]
  agents: MissionAgent[]
  onSelect: (missionId: string) => void
  onSelectSubtask?: (missionId: string, subtaskId: string) => void
  subtasksByMissionId?: Record<string, MissionSubtask[]>
  expandedSubtaskMissionIds?: Set<string>
  onToggleSubtaskExpand?: (missionId: string) => void
  subtasksDisplayMode?: SubtasksDisplayMode
  progressShowNumber: boolean
  progressBarFill: string | null
  progressConfigurable: boolean
  onMissionsProgressPatch?: (
    patch: Pick<MissionsConfig, 'progress_show_number' | 'progress_bar_fill'>,
  ) => void | Promise<void>
  actionMissionId: string | null
  onRetry: (e: MouseEvent, missionId: string) => void | Promise<void>
  onTrashClick: (e: MouseEvent, missionId: string) => void
  enableContextMenu: boolean
  menuMission: Mission | null
  menuAnchorRef: RefObject<HTMLButtonElement | null>
  openMissionMenuAtPointer: (e: MouseEvent, mission: Mission) => void
  openMissionMenuFromButton: (e: MouseEvent<HTMLButtonElement>, mission: Mission) => void
}

export function MissionListMobileCards({
  missions,
  agents,
  onSelect,
  onSelectSubtask,
  subtasksByMissionId,
  expandedSubtaskMissionIds,
  onToggleSubtaskExpand,
  subtasksDisplayMode,
  progressShowNumber,
  progressBarFill,
  progressConfigurable,
  onMissionsProgressPatch,
  actionMissionId,
  onRetry,
  onTrashClick,
  enableContextMenu,
  menuMission,
  menuAnchorRef,
  openMissionMenuAtPointer,
  openMissionMenuFromButton,
}: MissionListMobileCardsProps) {
  return (
    <div className="divide-y divide-[var(--border)] border-b border-[var(--border)] md:hidden">
      {missions.map((mission) => {
        const mSubExp = expandedSubtaskMissionIds?.has(mission.id) ?? false
        const mSubList = subtasksByMissionId?.[mission.id] ?? []
        const reserveChevronSlotMobile =
          Boolean(onToggleSubtaskExpand) && subtasksDisplayMode !== 'separate'
        const showMChev = reserveChevronSlotMobile && (mission.subtask_total ?? 0) > 0
        return (
          <div
            role="button"
            tabIndex={0}
            key={mission.id}
            onClick={() => onSelect(mission.id)}
            onContextMenu={
              enableContextMenu ? (e) => openMissionMenuAtPointer(e, mission) : undefined
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(mission.id)
              }
            }}
            className="hover:bg-hover-subtle px-spacing-3 py-spacing-1 group transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-h-7 min-w-0 flex-1 items-center">
                {reserveChevronSlotMobile ? (
                  <>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {showMChev ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleSubtaskExpand?.(mission.id)
                          }}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                          aria-expanded={mSubExp}
                          aria-label={mSubExp ? 'Collapse subtasks' : 'Expand subtasks'}
                        >
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-150',
                              mSubExp && 'rotate-90',
                            )}
                          />
                        </button>
                      ) : (
                        <span className="inline-block w-4 shrink-0" aria-hidden />
                      )}
                    </div>
                    <div className="ml-2.5 min-w-0 flex-1">
                      <MissionTitleText text={mission.title} />
                    </div>
                  </>
                ) : (
                  <MissionTitleText text={mission.title} />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={`body-4 whitespace-nowrap rounded-full px-2 py-0.5 ${STATUS_STYLE[mission.status] ?? 'bg-zinc-500/15 text-zinc-400'}`}
                >
                  {STATUS_LABEL[mission.status] ?? mission.status}
                </span>
                {enableContextMenu ? (
                  <button
                    ref={menuMission?.id === mission.id ? menuAnchorRef : undefined}
                    type="button"
                    onClick={(e) => openMissionMenuFromButton(e, mission)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    aria-label="Mission menu"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-1.5 flex w-full min-w-0 items-center gap-1.5">
              <MissionListProgressCell
                total={mission.subtask_total ?? 0}
                done={mission.subtask_done ?? 0}
                showNumber={progressShowNumber}
                barFill={progressBarFill}
                configurable={progressConfigurable}
                onPatch={onMissionsProgressPatch}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="min-w-0">
                <AgentsStackCell
                  agentKeys={
                    mission.subtask_agent_keys ??
                    (mission.assigned_agent_key ? [mission.assigned_agent_key] : [])
                  }
                  agents={agents}
                />
              </div>
              <div className="body-4 ml-auto flex min-w-0 shrink-0 items-center gap-1 text-[var(--color-muted-foreground)]">
                <RefreshCw className="h-3 w-3 shrink-0" />
                {formatDateShort(mission.updated_at)}
              </div>
            </div>
            {onToggleSubtaskExpand &&
              mSubList.length > 0 &&
              (subtasksDisplayMode === 'separate' || mSubExp) && (
                <div className="mt-2 space-y-1.5">
                  {mSubList.map((st) => {
                    const cls = SUBTASK_STATUS_STYLE[st.status] ?? 'bg-zinc-500/15 text-zinc-400'
                    const label = SUBTASK_STATUS_LABEL[st.status] ?? st.status
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectSubtask?.(mission.id, st.id)
                        }}
                        className="hover:bg-hover-subtle rounded-spacing-1 flex w-full flex-col gap-0.5 text-left transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          {subtasksDisplayMode === 'separate' ? (
                            <GitBranch
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                              aria-hidden
                            />
                          ) : (
                            <>
                              <div className="flex shrink-0 items-center gap-2.5" aria-hidden>
                                <span className="inline-block h-4 w-4 shrink-0" />
                                <span className="inline-block h-4 w-4 shrink-0" />
                              </div>
                              <div className="inline-block w-1 shrink-0 self-center" aria-hidden />
                            </>
                          )}
                          <div className="min-w-0 flex-1">
                            <MissionTitleText text={st.title} />
                          </div>
                        </div>
                        <span className={`typo-caption w-fit rounded-full px-2 py-0.5 ${cls}`}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            {isMissionFailedStatus(mission.status) && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={(e) => void onRetry(e, mission.id)}
                  disabled={actionMissionId === mission.id}
                  className="chip-glass-neutral body-4 flex items-center gap-1 rounded-full px-2 py-0.5 disabled:opacity-50"
                >
                  <RotateCcw
                    className={`h-3 w-3 ${actionMissionId === mission.id ? 'animate-spin' : ''}`}
                  />{' '}
                  Retry
                </button>
                <button
                  onClick={(e) => onTrashClick(e, mission.id)}
                  className="chip-glass-neutral body-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
