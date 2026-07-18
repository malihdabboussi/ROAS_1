'use client'

import { DeliverablesCarousel } from '@/components/deliverables/DeliverablesCarousel'
import { EXTRA_DELIVERABLE_TYPES, type MissionDeliverable } from '@/lib/missions'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption, SpaceSchema, ViewDef } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { TaskCursorStatusCard } from './TaskCursorStatusCard'
import { TaskDescription } from './TaskDescription'
import { TaskMetaFields } from './TaskMetaFields'
import { TaskSubtasks } from './TaskSubtasks'
import { TaskTitleInput } from './TaskTitleInput'

interface TaskDetailMainPanelProps {
  item: SpaceItem
  title: string
  allFields: FieldDef[]
  activeView: ViewDef
  spaceSchema: SpaceSchema
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  roster: TeamRosterEntry[]
  currentUserId: string | null
  taskDeliverables: MissionDeliverable[]
  subtasks: SpaceItem[]
  loading: boolean
  subtasksSectionCollapsed: boolean
  onSubtasksSectionCollapsedChange: (collapsed: boolean) => void
  onTitleChange: (title: string) => void
  onTitleBlur: () => void
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onDescriptionChange: (description: string | null) => void
  onUpdateSubtask: (subtaskId: string, patch: Partial<SpaceItem>) => void
  onCreateSubtask: (title: string, extra?: Record<string, unknown>) => void | Promise<void>
  onDeleteSubtask: (subtaskId: string) => void | Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onOpenTaskDetail?: (item: SpaceItem) => void
  onRefresh: () => Promise<void>
  onSelectDeliverable: (deliverable: MissionDeliverable) => void
}

export function TaskDetailMainPanel({
  item,
  title,
  allFields,
  activeView,
  spaceSchema,
  onViewPatch,
  roster,
  currentUserId,
  taskDeliverables,
  subtasks,
  loading,
  subtasksSectionCollapsed,
  onSubtasksSectionCollapsedChange,
  onTitleChange,
  onTitleBlur,
  onUpdateField,
  onDescriptionChange,
  onUpdateSubtask,
  onCreateSubtask,
  onDeleteSubtask,
  onEditStatuses,
  onEditCategories,
  onPushToAgent,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onOpenTaskDetail,
  onRefresh,
  onSelectDeliverable,
}: TaskDetailMainPanelProps) {
  return (
    <div className="pr-spacing-6 flex h-full min-h-0 min-w-0 flex-[6] flex-col overflow-y-auto overflow-x-hidden">
      <div className="flex min-h-full flex-col">
        <div className="pt-spacing-2 pb-spacing-4 flex min-w-0 flex-col">
          <TaskTitleInput
            title={title}
            committedTitle={item.title}
            onTitleChange={onTitleChange}
            onTitleBlur={onTitleBlur}
          />
        </div>
        <div className="pb-spacing-4 flex min-w-0 flex-col">
          <TaskMetaFields
            item={item}
            activeView={activeView}
            spaceSchema={spaceSchema}
            allFields={allFields}
            roster={roster}
            currentUserId={currentUserId}
            onUpdateField={onUpdateField}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onPushToAgent={onPushToAgent}
          />

          <div className="mt-spacing-4 border-border mr-2 border-b" />

          <TaskDescription
            description={item.description}
            onDescriptionChange={onDescriptionChange}
          />

          <TaskSubtasks
            subtasks={subtasks}
            allFields={allFields}
            activeView={activeView}
            spaceSchema={spaceSchema}
            onViewPatch={onViewPatch}
            roster={roster}
            currentUserId={currentUserId}
            parentItemId={item.id}
            subtasksSectionCollapsed={subtasksSectionCollapsed}
            onSubtasksSectionCollapsedChange={onSubtasksSectionCollapsedChange}
            onUpdateSubtask={onUpdateSubtask}
            onCreateSubtask={onCreateSubtask}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            onPushToAgent={onPushToAgent}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onDeleteItem={onDeleteSubtask}
            onOpenTaskDetail={onOpenTaskDetail}
            loading={loading}
            onRefresh={onRefresh}
          />

          <DeliverablesCarousel
            key={item.id}
            taskSectionChrome
            iconBesideTitle
            headingLabel="Deliverables & media"
            emptyStateLabel="No files or media linked to this task yet."
            deliverables={taskDeliverables}
            inlineExtraTypes={EXTRA_DELIVERABLE_TYPES}
            onSelect={onSelectDeliverable}
          />

          {item.linked_mission_id ? (
            <div className="mt-spacing-4">
              <span className="body-2 mb-spacing-2 text-muted-foreground block">
                Linked Mission
              </span>
              <a
                href={`/mission-control?mission=${item.linked_mission_id}${item.linked_mission_subtask_id ? `&subtask=${item.linked_mission_subtask_id}` : ''}`}
                className="body-2 gap-spacing-1 rounded-spacing-2 px-spacing-3 py-spacing-1-5 text-primary hover:bg-hover-subtle inline-flex items-center transition-colors"
              >
                {item.linked_mission_subtask_id
                  ? 'View linked Mission step'
                  : 'View in Mission Control'}
              </a>
            </div>
          ) : null}

          <TaskCursorStatusCard item={item} />
        </div>
      </div>
    </div>
  )
}
