'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionDeliverable } from '@/lib/missions'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItemActivity } from '../../services/spaces.service'
import type { FieldDef } from '../../types/space-schema'
import { AgentTaskExecutionBlock } from './AgentTaskExecutionBlock'
import { getPageGraderWorkUrlFromActivityPayload } from './page-grader-activity'
import type { SendToAgentInstructionsSeed } from './SendTaskToAgentModal'
import {
  formatActivityDetail,
  formatEventLabel,
  formatRelativeTime,
  resolveActivityMeta,
} from './task-activity-format'
import type { TaskActivityAuthProfile, TimelineEntry } from './task-activity-types'
import {
  shouldRenderAssigneeActivityPreview,
  TaskActivityAssigneePreview,
} from './TaskActivityAssigneePreview'
import { TaskActivityAvatar } from './TaskActivityAvatar'
import { TaskActivityComment } from './TaskActivityComment'
import {
  shouldRenderFieldValuePreview,
  TaskActivityFieldValuePreview,
} from './TaskActivityFieldValuePreview'
import {
  shouldRenderFieldFilePreview,
  shouldRenderFieldTextPreview,
  shouldRenderFieldUrlPreview,
  TaskActivityFilePreview,
  TaskActivityTextPreview,
  TaskActivityUrlPreview,
} from './TaskActivityFilePreview'

interface TaskActivityTimelineProps {
  loading: boolean
  merged: TimelineEntry[]
  createdAt: string
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  rosterAvatars: Map<string, string>
  authProfile: TaskActivityAuthProfile
  currentUserId: string | null
  spaceId: string
  itemId: string
  canEdit: boolean
  isAgentWorking: boolean
  stoppingAgentActivityId: string | null
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  onOpenTaskById?: (taskId: string) => void
  onOpenConversationById?: (conversationId: string) => void
  onOpenSendToAgent?: (seed?: SendToAgentInstructionsSeed) => void
  onCommentUpdated: (updated: SpaceItemActivity) => void
  onCommentDeleted: (activityId: string) => void
  onStopAgent: (activityId: string) => void
}

const isComment = (eventType: string) =>
  eventType === 'comment' || eventType === 'user.comment' || eventType === 'automation_comment'

const isAgentTaskExecution = (eventType: string) => eventType === 'agent_task_execution'

export function TaskActivityTimeline({
  loading,
  merged,
  createdAt,
  allFields,
  roster,
  rosterAvatars,
  authProfile,
  currentUserId,
  spaceId,
  itemId,
  canEdit,
  isAgentWorking,
  stoppingAgentActivityId,
  onOpenDeliverablePreview,
  onOpenTaskById,
  onOpenConversationById,
  onOpenSendToAgent,
  onCommentUpdated,
  onCommentDeleted,
  onStopAgent,
}: TaskActivityTimelineProps) {
  if (loading && merged.length === 0) {
    return (
      <div className="py-spacing-8 flex min-h-[140px] items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="relative min-w-0">
      {!merged.some((e) => e.event_type === 'created') && (
        <div className="gap-spacing-2 flex min-w-0">
          <div className="relative flex w-6 shrink-0 flex-col items-center">
            <TaskActivityAvatar senderLabel="System" avatarUrl={null} isAgent={false} isSystem />
            {merged.length > 0 && <div className="bg-border w-px flex-1" />}
          </div>
          <div className="pb-spacing-5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="gap-spacing-1 flex items-center">
                <span className="body-3 text-foreground font-medium">System</span>
                <span className="body-3 text-muted-foreground">Task created</span>
              </div>
            </div>
            <span className="body-3 text-muted-foreground/50">
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {merged.map((entry, idx) => {
        const meta = resolveActivityMeta({
          entry,
          currentUserId,
          roster,
          rosterAvatars,
          authDisplayName: authProfile.displayName,
          authAvatarUrl: authProfile.avatarUrl,
        })
        const isLast = idx === merged.length - 1
        const pageGraderUrl =
          entry.event_type === 'field_change'
            ? getPageGraderWorkUrlFromActivityPayload(entry.payload)
            : null
        return (
          <div key={entry.id} className="gap-spacing-2 flex min-w-0">
            <div className="relative flex w-6 shrink-0 flex-col items-center">
              <TaskActivityAvatar
                senderLabel={meta.senderLabel}
                avatarUrl={meta.avatarUrl}
                isAgent={meta.isAgent}
                isSystem={meta.isSystem}
              />
              {!isLast && <div className="bg-border w-px flex-1" />}
            </div>

            <div className="pb-spacing-5 min-w-0 flex-1">
              {isAgentTaskExecution(entry.event_type) ? (
                <AgentTaskExecutionBlock
                  entry={entry}
                  displayName={meta.label}
                  onOpenDeliverablePreview={onOpenDeliverablePreview}
                  onStop={canEdit && isAgentWorking ? () => void onStopAgent(entry.id) : undefined}
                  stopping={stoppingAgentActivityId === entry.id}
                />
              ) : isComment(entry.event_type) ? (
                <TaskActivityComment
                  spaceId={spaceId}
                  itemId={itemId}
                  entry={entry}
                  metaLabel={meta.label}
                  currentUserId={currentUserId}
                  canEdit={canEdit}
                  formatRelativeTime={formatRelativeTime}
                  onOpenDeliverablePreview={onOpenDeliverablePreview}
                  onOpenTaskById={onOpenTaskById}
                  onOpenConversationById={onOpenConversationById}
                  onSendToAgent={onOpenSendToAgent ? (seed) => onOpenSendToAgent(seed) : undefined}
                  onUpdated={onCommentUpdated}
                  onDeleted={onCommentDeleted}
                />
              ) : (
                <>
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
                      <span className="body-3 text-foreground min-w-0 break-words font-medium">
                        {meta.label}
                      </span>
                      <span
                        className={
                          entry.event_type === 'automation_action' &&
                          entry.payload.status === 'failed'
                            ? 'body-3 text-destructive min-w-0 break-words'
                            : 'body-3 text-muted-foreground min-w-0 break-words'
                        }
                      >
                        {formatEventLabel(entry.event_type, entry.payload, roster, allFields)}
                      </span>
                    </div>
                    <span className="body-3 text-muted-foreground/50 shrink-0">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </div>
                  {formatActivityDetail(entry) && (
                    <p className="body-3 text-muted-foreground mt-0.5 break-all">
                      {formatActivityDetail(entry)}
                    </p>
                  )}
                  {pageGraderUrl ? (
                    <a
                      href={pageGraderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="body-3 text-primary mt-spacing-1 inline-flex min-w-0 max-w-full truncate font-medium hover:underline"
                      title={pageGraderUrl}
                    >
                      Open in The ROAS Portal
                    </a>
                  ) : null}
                  {entry.event_type === 'created' && Array.isArray(entry.payload.attachments) && (
                    <TaskActivityFilePreview
                      from={[]}
                      to={entry.payload.attachments}
                      fieldId="attachments"
                    />
                  )}
                  {entry.event_type === 'assignee_change' &&
                    shouldRenderAssigneeActivityPreview(entry.payload, roster) && (
                      <TaskActivityAssigneePreview
                        to={entry.payload.to}
                        roster={roster}
                        currentUserId={currentUserId}
                      />
                    )}
                  {entry.event_type === 'field_change' &&
                    shouldRenderFieldValuePreview(entry.payload, allFields) && (
                      <TaskActivityFieldValuePreview
                        to={entry.payload.to}
                        fieldId={
                          typeof entry.payload.field === 'string' ? entry.payload.field : undefined
                        }
                        allFields={allFields}
                      />
                    )}
                  {entry.event_type === 'field_change' &&
                    shouldRenderFieldTextPreview(entry.payload) && (
                      <TaskActivityTextPreview
                        from={entry.payload.from}
                        to={entry.payload.to}
                        fieldId={
                          typeof entry.payload.field === 'string' ? entry.payload.field : undefined
                        }
                      />
                    )}
                  {entry.event_type === 'field_change' &&
                    shouldRenderFieldUrlPreview(entry.payload) && (
                      <TaskActivityUrlPreview
                        from={entry.payload.from}
                        to={entry.payload.to}
                        fieldId={
                          typeof entry.payload.field === 'string' ? entry.payload.field : undefined
                        }
                      />
                    )}
                  {entry.event_type === 'field_change' &&
                    shouldRenderFieldFilePreview(entry.payload) && (
                      <TaskActivityFilePreview
                        from={entry.payload.from}
                        to={entry.payload.to}
                        fieldId={
                          typeof entry.payload.field === 'string' ? entry.payload.field : undefined
                        }
                      />
                    )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
