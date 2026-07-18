import { Fragment } from 'react'
import type { MouseEvent, RefObject } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type {
  MissionColumnId,
  MissionsConfig,
  SubtasksDisplayMode,
} from '@/lib/spaces/space-schema-types'
import { cn } from '@/lib/utils/cn'
import type { Mission, MissionAgent, MissionDeliverable, MissionSubtask } from '../types'
import type { ColumnConfig } from './mission-list-config'
import { MissionListCell, MissionListSubtaskCell } from './MissionListCell'

interface MissionListDesktopRowsProps {
  missions: Mission[]
  agents: MissionAgent[]
  activeCols: ColumnConfig[]
  gridTemplateWithTrail: string
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
  deliverablesByMissionId?: Record<string, MissionDeliverable[]>
  onOpenDeliverable?: (d: MissionDeliverable) => void
  actionMissionId: string | null
  onRetry: (e: MouseEvent, missionId: string) => void | Promise<void>
  onChanged?: () => void
  enableContextMenu: boolean
  menuMission: Mission | null
  menuAnchorRef: RefObject<HTMLButtonElement | null>
  openMissionMenuAtPointer: (e: MouseEvent, mission: Mission) => void
  openMissionMenuFromButton: (e: MouseEvent<HTMLButtonElement>, mission: Mission) => void
}

function shouldProxyCellButton(colId: MissionColumnId, progressConfigurable: boolean): boolean {
  return (
    colId === 'priority' ||
    colId === 'documents' ||
    colId === 'media' ||
    colId === 'artifacts' ||
    (colId === 'progress' && progressConfigurable)
  )
}

export function MissionListDesktopRows({
  missions,
  agents,
  activeCols,
  gridTemplateWithTrail,
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
  deliverablesByMissionId,
  onOpenDeliverable,
  actionMissionId,
  onRetry,
  onChanged,
  enableContextMenu,
  menuMission,
  menuAnchorRef,
  openMissionMenuAtPointer,
  openMissionMenuFromButton,
}: MissionListDesktopRowsProps) {
  function handleMissionCellClick(
    e: MouseEvent<HTMLDivElement>,
    colId: MissionColumnId,
    mission: Mission,
  ) {
    const t = e.target as HTMLElement
    if (t.closest('button, a, input, select, textarea, [data-dropdown]')) return
    if (shouldProxyCellButton(colId, progressConfigurable)) {
      const b = e.currentTarget.querySelector('button')
      if (b) {
        b.click()
        return
      }
    }
    onSelect(mission.id)
  }

  return (
    <div className="hidden divide-y divide-[var(--border)] border-b border-[var(--border)] md:block">
      {missions.map((mission) => {
        const dSubExp = expandedSubtaskMissionIds?.has(mission.id) ?? false
        const dSubList = onToggleSubtaskExpand ? (subtasksByMissionId?.[mission.id] ?? []) : []
        return (
          <Fragment key={mission.id}>
            <div
              className="hover:bg-hover-subtle group grid items-stretch gap-0 px-4 py-0 transition-colors"
              style={{ gridTemplateColumns: gridTemplateWithTrail }}
              onClick={(e) => {
                if (e.target === e.currentTarget) onSelect(mission.id)
              }}
              onContextMenu={
                enableContextMenu ? (e) => openMissionMenuAtPointer(e, mission) : undefined
              }
            >
              {activeCols.map((col) => (
                <div
                  key={col.id}
                  role="presentation"
                  data-cell
                  className={cn(
                    'min-w-0 cursor-pointer overflow-hidden',
                    col.id === 'title'
                      ? 'flex items-center self-stretch py-0.5'
                      : 'space-cell-hover',
                  )}
                  onClick={(e) => handleMissionCellClick(e, col.id, mission)}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MissionListCell
                    colId={col.id}
                    mission={mission}
                    agents={agents}
                    expandedSubtaskMissionIds={expandedSubtaskMissionIds}
                    onToggleSubtaskExpand={onToggleSubtaskExpand}
                    loadedSubtaskCount={dSubList.length}
                    subtasksDisplayMode={subtasksDisplayMode}
                    progressShowNumber={progressShowNumber}
                    progressBarFill={progressBarFill}
                    progressConfigurable={progressConfigurable}
                    onMissionsProgressPatch={onMissionsProgressPatch}
                    deliverablesByMissionId={deliverablesByMissionId}
                    onOpenDeliverable={onOpenDeliverable}
                    actionMissionId={actionMissionId}
                    onRetry={onRetry}
                    onChanged={onChanged}
                  />
                </div>
              ))}
              {enableContextMenu ? (
                <div className="flex min-w-0 items-center justify-end self-stretch py-0.5">
                  <button
                    ref={menuMission?.id === mission.id ? menuAnchorRef : undefined}
                    type="button"
                    onClick={(e) => openMissionMenuFromButton(e, mission)}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                      menuMission?.id === mission.id
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100',
                    )}
                    aria-label="Mission menu"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="min-w-0 self-stretch" aria-hidden />
              )}
            </div>
            {onToggleSubtaskExpand &&
              dSubList.length > 0 &&
              (subtasksDisplayMode === 'separate' || dSubExp) &&
              dSubList.map((st) => (
                <div
                  key={st.id}
                  className="hover:bg-hover-subtle group grid items-stretch gap-0 px-4 py-0 transition-colors"
                  style={{ gridTemplateColumns: gridTemplateWithTrail }}
                  onClick={() => onSelectSubtask?.(mission.id, st.id)}
                >
                  {activeCols.map((col) => (
                    <div
                      key={col.id}
                      role="presentation"
                      data-cell
                      className={cn(
                        'min-w-0 cursor-pointer overflow-hidden',
                        col.id === 'title'
                          ? 'flex items-center self-stretch py-0.5'
                          : 'space-cell-hover',
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectSubtask?.(mission.id, st.id)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MissionListSubtaskCell
                        colId={col.id}
                        subtask={st}
                        agents={agents}
                        subtasksDisplayMode={subtasksDisplayMode}
                      />
                    </div>
                  ))}
                  <div className="min-w-0 self-stretch" aria-hidden />
                </div>
              ))}
          </Fragment>
        )
      })}
    </div>
  )
}
