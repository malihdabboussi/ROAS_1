import type { MouseEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { MissionList } from '@/components/missions/MissionListAdapter'
import type { MissionAgent } from '@/lib/agents'
import type { Mission, MissionDeliverable, MissionSubtask } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import type { MissionGroup } from '../lib/group-missions'
import { spaceGroupBadgeChipProps } from '../lib/space-group-badge-glass'
import type { MissionColumnId, MissionsConfig, SubtasksDisplayMode } from '../types/space-schema'
import { AssigneeGroupHeaderTitle } from './AssigneeGroupHeaderTitle'
import { MissionsViewEmptyState } from './MissionsViewEmptyState'

export interface MissionsViewListContentProps {
  missionsForDisplay: Mission[]
  sortedMissions: Mission[]
  missionGroups: MissionGroup[] | null
  groupBy: MissionsConfig['group_by']
  collapsedMissionGroups: Record<string, boolean>
  agents: MissionAgent[]
  campaigns: Array<{ id: string; name: string }>
  selectedMissionId: string | null
  visibleColumns: MissionColumnId[]
  onAddColumn?: (event: MouseEvent<HTMLButtonElement>) => void
  subtasksByMissionId: Record<string, MissionSubtask[]>
  expandedSubtaskMissionIds: Set<string>
  subtasksDisplayMode: SubtasksDisplayMode
  missionsProgress: {
    showNumber: boolean
    barFill: string | null
  }
  deliverablesByMissionId: Record<string, MissionDeliverable[]>
  listColumnWidths: Record<string, number>
  onPersistColumnWidths: () => void
  onToggleGroup: (groupKey: string) => void
  onSelectMission: (missionId: string) => void
  onChanged: () => void
  onToggleSubtaskExpand: (missionId: string) => void
  onReorderColumns: (next: MissionColumnId[]) => Promise<void>
  onMissionsProgressPatch: (
    patch: Pick<MissionsConfig, 'progress_show_number' | 'progress_bar_fill'>,
  ) => Promise<void>
  onOpenDeliverable: (deliverable: MissionDeliverable) => void
  onListColumnResize: (columnId: MissionColumnId, width: number) => void
}

export function MissionsViewListContent({
  missionsForDisplay,
  sortedMissions,
  missionGroups,
  groupBy,
  collapsedMissionGroups,
  agents,
  campaigns,
  selectedMissionId,
  visibleColumns,
  onAddColumn,
  subtasksByMissionId,
  expandedSubtaskMissionIds,
  subtasksDisplayMode,
  missionsProgress,
  deliverablesByMissionId,
  listColumnWidths,
  onPersistColumnWidths,
  onToggleGroup,
  onSelectMission,
  onChanged,
  onToggleSubtaskExpand,
  onReorderColumns,
  onMissionsProgressPatch,
  onOpenDeliverable,
  onListColumnResize,
}: MissionsViewListContentProps) {
  const renderMissionList = (missions: Mission[]) => (
    <MissionList
      missions={missions}
      agents={agents}
      campaigns={campaigns}
      selectedMissionId={selectedMissionId}
      onSelect={onSelectMission}
      onChanged={onChanged}
      visibleColumns={visibleColumns}
      onAddColumn={onAddColumn}
      subtasksByMissionId={subtasksByMissionId}
      expandedSubtaskMissionIds={expandedSubtaskMissionIds}
      onToggleSubtaskExpand={onToggleSubtaskExpand}
      subtasksDisplayMode={subtasksDisplayMode}
      onReorderColumns={onReorderColumns}
      missionsProgress={missionsProgress}
      onMissionsProgressPatch={onMissionsProgressPatch}
      deliverablesByMissionId={deliverablesByMissionId}
      onOpenDeliverable={onOpenDeliverable}
      listColumnWidths={listColumnWidths}
      onListColumnResize={onListColumnResize}
      enableContextMenu
    />
  )

  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto pt-2',
        missionsForDisplay.length === 0 && sortedMissions.length === 0 && 'flex flex-col',
      )}
      onMouseUp={onPersistColumnWidths}
    >
      {missionsForDisplay.length === 0 ? (
        <MissionsViewEmptyState hasAnyMissions={sortedMissions.length > 0} />
      ) : missionGroups ? (
        <div className="gap-spacing-10 flex flex-col">
          {missionGroups.map((group) => {
            const groupChip = spaceGroupBadgeChipProps(group.color)
            const collapsed = collapsedMissionGroups[group.key] ?? false
            return (
              <div key={group.key}>
                <div
                  className={cn(
                    'group/header gap-spacing-2 bg-background py-spacing-2 sticky left-0 z-10 inline-flex max-w-full shrink-0 items-center',
                    'px-spacing-4',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group.key)}
                    className="rounded-spacing-1 p-spacing-0-5 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        'icon-xs transition-transform duration-150',
                        collapsed ? '' : 'rotate-90',
                      )}
                    />
                  </button>
                  {groupBy === 'assignee' ? (
                    <AssigneeGroupHeaderTitle
                      label={group.label}
                      avatarUrl={group.avatarUrl}
                      isUnassigned={group.key === '__unassigned__'}
                    />
                  ) : (
                    // Data-coded group color style comes from the shared group badge helper.
                    <span
                      className={cn(
                        'rounded-spacing-2 px-spacing-2-5 py-spacing-0-5 body-4 inline-flex items-center font-normal uppercase tracking-wider',
                        groupChip.chipClassName,
                      )}
                      style={groupChip.style}
                    >
                      {group.label}
                    </span>
                  )}
                  <span className="body-4 text-muted-foreground">{group.missions.length}</span>
                </div>
                {!collapsed &&
                  (group.missions.length === 0 ? (
                    <div className="rounded-spacing-2 border-border px-spacing-4 py-spacing-3 body-4 text-muted-foreground border border-dashed text-center">
                      No missions
                    </div>
                  ) : (
                    renderMissionList(group.missions)
                  ))}
              </div>
            )
          })}
        </div>
      ) : (
        renderMissionList(missionsForDisplay)
      )}
    </div>
  )
}
