import { ArrowRight } from 'lucide-react'
import { AgentTurnFeedbackActions } from '@/components/chat/AgentTurnFeedbackActions'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import type { MissionAgent, MissionLog, MissionSubtask } from '../../types'
import { AutoApproveSwitch, PlanSwitch } from './ActivityTimelinePlanSwitch'
import { UserCommentActivity, UserRatingActivity } from './ActivityTimelineUserActivities'
import {
  formatAgentShortName,
  formatEventType,
  formatRelativeTime,
  formatSubtaskStatusLabel,
  getEventDotClass,
} from './detail-helpers'
import { LogPayloadDetails } from './LogPayloadDetails'
import { MissionLockedIn } from './MissionLockedIn'

interface ActivityTimelineLogItemProps {
  log: MissionLog
  logIndex: number
  sortedLogs: MissionLog[]
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  missionStatus?: string
  onViewPlan?: () => void
  onApprove?: () => void
  onReject?: () => void
  approving?: boolean
  autoApprovePlans?: boolean
  onToggleAutoApprove?: (enabled: boolean) => void
}
function resolvePayload(log: MissionLog): Record<string, unknown> | null {
  return log.payload && typeof log.payload === 'object' ? log.payload : null
}
function resolveAgent(log: MissionLog, agents: MissionAgent[]): MissionAgent | undefined {
  if (!log.agent_key) return undefined
  return agents.find((agent) => agent.agent_key === log.agent_key)
}
function AgentActivityHeader({
  log,
  agents,
  createdAt,
}: {
  log: MissionLog
  agents: MissionAgent[]
  createdAt: string
}) {
  const logAgent = resolveAgent(log, agents)
  const fullName = logAgent?.name ?? log.agent_key ?? 'Agent'
  const shortName = formatAgentShortName(fullName) || fullName

  return (
    <div className="gap-spacing-2 flex items-start justify-between">
      <div className="gap-spacing-1 flex min-w-0 items-center">
        {logAgent?.image_url ? (
          <img
            src={logAgent.image_url}
            alt={fullName}
            className="h-4 w-4 shrink-0 rounded-full object-cover"
            title={fullName}
          />
        ) : (
          <div
            className="typo-2xs bg-secondary text-muted-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-bold"
            title={fullName}
          >
            {shortName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="body-3 text-muted-foreground truncate" title={fullName}>
          {shortName}
        </span>
      </div>
      <span className="body-3 text-muted-foreground/50 shrink-0">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  )
}
function LinkedSubtaskStatus({
  subtask,
  subtaskTitle,
}: {
  subtask: MissionSubtask | null | undefined
  subtaskTitle: string | null
}) {
  if (!subtask && !subtaskTitle) return null
  const statusLabel = subtask ? formatSubtaskStatusLabel(subtask.status) : null
  return (
    <div className="mt-spacing-1 space-y-spacing-1">
      {(subtaskTitle || subtask?.title) && (
        <p className="body-4 text-muted-foreground break-words">
          Subtask: {subtaskTitle || subtask?.title}
          {statusLabel ? ` · ${statusLabel}` : ''}
          {subtask?.updated_at ? ` · ${formatRelativeTime(subtask.updated_at)}` : ''}
        </p>
      )}
      {subtask?.feedback ? (
        <p className="body-3 text-warning break-words">{subtask.feedback}</p>
      ) : null}
    </div>
  )
}
function MissionProgressActivity({
  log,
  subtaskId,
  subtasks,
  agents,
}: {
  log: MissionLog
  subtaskId: string | null
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
}) {
  const note = (log.payload as { note?: string })?.note
  const isExecLog = typeof note === 'string' && note.startsWith('Executing subtask')
  const execSubtask = subtaskId && isExecLog ? subtasks.find((st) => st.id === subtaskId) : null
  const linkedSubtask = subtaskId ? subtasks.find((st) => st.id === subtaskId) : null
  const displayNote =
    typeof note === 'string' ? note.replace(/\s+assigned to\s+[a-z0-9_]+$/i, '').trim() : note

  return (
    <div className="space-y-spacing-1 min-w-0">
      <AgentActivityHeader log={log} agents={agents} createdAt={log.created_at} />
      <div
        className={`body-3 text-foreground min-w-0 break-words ${CHAT_MARKDOWN_CLASSNAME}`}
        dangerouslySetInnerHTML={{
          __html: renderChatMarkdown(displayNote || 'Progress update'),
        }}
      />
      <LinkedSubtaskStatus subtask={linkedSubtask} subtaskTitle={linkedSubtask?.title ?? null} />
      {execSubtask ? <MissionLockedIn subtask={execSubtask} defaultOpen /> : null}
      <AgentTurnFeedbackActions
        targetKind="mission_log"
        targetId={log.id}
        sourceSurface="mission_activity"
        content={displayNote || 'Progress update'}
        className="py-0"
      />
    </div>
  )
}
function PlanPendingActivity({
  log,
  logIndex,
  sortedLogs,
  missionStatus,
  onViewPlan,
  onApprove,
  onReject,
  approving,
  autoApprovePlans,
  onToggleAutoApprove,
}: ActivityTimelineLogItemProps) {
  const subLogs = sortedLogs.slice(logIndex + 1)
  const nextPendingIdx = subLogs.findIndex((l) => l.event_type === 'mission.plan.pending_approval')
  const scopedLogs = nextPendingIdx >= 0 ? subLogs.slice(0, nextPendingIdx) : subLogs
  const wasRejected = scopedLogs.some((l) => l.event_type === 'mission.plan.rejected')
  const wasApproved = scopedLogs.some((l) => l.event_type === 'mission.plan.approved')
  const isPending = !wasApproved && !wasRejected && missionStatus === 'pending_approval'
  const isFirstPlanLog =
    sortedLogs.findIndex((l) => l.event_type === 'mission.plan.pending_approval') === logIndex
  const hires = (log.payload as { recommended_hires?: Array<{ role_key: string }> })
    ?.recommended_hires

  return (
    <>
      <div className="card-glass rounded-spacing-3 px-spacing-4 py-spacing-3 mt-1">
        {isPending ? (
          <>
            <p className="body-2 text-foreground font-medium">Plan ready for your approval</p>
            {hires && hires.length > 0 ? (
              <p className="body-3 text-warning mt-1">
                Includes {hires.length} recommended hire{hires.length > 1 ? 's' : ''}
              </p>
            ) : null}
            {onViewPlan && (
              <button
                type="button"
                onClick={onViewPlan}
                className="body-3 text-primary hover:text-foreground mt-spacing-2 flex items-center gap-1 font-medium transition-colors"
              >
                View Plan
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap items-center">
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  className="button-glass-destructive body-3 rounded-lg px-3 py-1.5 font-medium"
                >
                  Reject
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={approving}
                  className="chip-glass-green body-3 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve'}
                </button>
              )}
            </div>
            {isFirstPlanLog && onToggleAutoApprove && (
              <AutoApproveSwitch
                autoApprovePlans={autoApprovePlans}
                onToggleAutoApprove={onToggleAutoApprove}
              />
            )}
          </>
        ) : wasRejected ? (
          <p className="body-2 text-warning font-medium">Plan Rejected</p>
        ) : wasApproved && autoApprovePlans ? (
          <div className="flex items-center justify-between">
            <p className="body-2 text-success font-medium">Plan auto-approved</p>
            {onToggleAutoApprove && (
              <PlanSwitch checked={autoApprovePlans} onClick={() => onToggleAutoApprove(false)} />
            )}
          </div>
        ) : (
          <p className="body-2 text-success font-medium">Plan Approved</p>
        )}
      </div>
      <span className="body-3 text-muted-foreground/50 mt-1">
        {formatRelativeTime(log.created_at)}
      </span>
    </>
  )
}
function PlanApprovedActivity({ log, agents }: { log: MissionLog; agents: MissionAgent[] }) {
  const hired = (log.payload as { hired_agents?: Array<{ role_key: string; agent_key: string }> })
    ?.hired_agents
  return (
    <div className="space-y-spacing-1 min-w-0">
      <AgentActivityHeader log={log} agents={agents} createdAt={log.created_at} />
      <span className="body-3 text-success font-medium">Plan approved</span>
      {hired && hired.length > 0 ? (
        <p className="body-3 text-muted-foreground break-words">
          Hired: {hired.map((h) => h.agent_key).join(', ')}
        </p>
      ) : null}
    </div>
  )
}
function DefaultActivity({
  log,
  eventLabel,
  agents,
  subtaskTitle,
  linkedSubtask,
}: {
  log: MissionLog
  eventLabel: string
  agents: MissionAgent[]
  subtaskTitle: string | null
  linkedSubtask: MissionSubtask | null
}) {
  const payloadNote =
    log.payload && typeof log.payload === 'object' && typeof log.payload.note === 'string'
      ? log.payload.note
      : null
  const headline = payloadNote || eventLabel

  return (
    <div className="space-y-spacing-1 min-w-0">
      {log.agent_key ? (
        <AgentActivityHeader log={log} agents={agents} createdAt={log.created_at} />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <span className="body-3 text-foreground min-w-0 break-words font-medium">{headline}</span>
          <span className="body-3 text-muted-foreground/50 shrink-0">
            {formatRelativeTime(log.created_at)}
          </span>
        </div>
      )}
      {log.agent_key ? (
        <span className="body-3 text-foreground break-words font-medium">{headline}</span>
      ) : null}
      <LinkedSubtaskStatus subtask={linkedSubtask} subtaskTitle={subtaskTitle} />
      {log.payload && typeof log.payload === 'object' && (
        <LogPayloadDetails
          payload={
            payloadNote
              ? Object.fromEntries(
                  Object.entries(log.payload as Record<string, unknown>).filter(
                    ([key]) => key !== 'note',
                  ),
                )
              : (log.payload as Record<string, unknown>)
          }
          eventType={log.event_type}
        />
      )}
      {log.from_status &&
        log.to_status &&
        log.from_status !== log.to_status &&
        !(log.payload as { error?: string })?.error && (
          <p className="body-3 text-muted-foreground">
            {log.from_status} → {log.to_status}
          </p>
        )}
    </div>
  )
}

export function ActivityTimelineLogItem(props: ActivityTimelineLogItemProps) {
  const { log, subtasks, agents, userProfile } = props
  const payload = resolvePayload(log)
  const subtaskId = payload && typeof payload.subtask_id === 'string' ? payload.subtask_id : null
  const linkedSubtask = subtaskId
    ? subtasks.find((subtask) => subtask.id === subtaskId) || null
    : null
  const subtaskTitle = linkedSubtask?.title || null
  const eventLabel =
    log.event_type === 'subtask.review' && subtaskTitle
      ? `Subtask review — ${subtaskTitle}`
      : formatEventType(log.event_type)

  return (
    <div className="pl-spacing-6 relative flex min-w-0">
      <div
        className={`${getEventDotClass(log.event_type)} absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2 rounded-full`}
      />
      <div className="min-w-0 flex-1 pb-1">
        {log.event_type === 'user.rating' ? (
          <UserRatingActivity log={log} userProfile={userProfile} />
        ) : log.event_type === 'user.comment' ? (
          <UserCommentActivity log={log} userProfile={userProfile} />
        ) : log.event_type === 'mission.progress' ? (
          <MissionProgressActivity
            log={log}
            subtaskId={subtaskId}
            subtasks={subtasks}
            agents={agents}
          />
        ) : log.event_type === 'mission.plan.pending_approval' ? (
          <PlanPendingActivity {...props} />
        ) : log.event_type === 'mission.plan.approved' ? (
          <PlanApprovedActivity log={log} agents={agents} />
        ) : log.event_type === 'mission.plan.rejected' ? (
          <div className="space-y-spacing-1 min-w-0">
            <AgentActivityHeader log={log} agents={agents} createdAt={log.created_at} />
            <span className="body-3 text-warning break-words font-medium">
              Plan rejected — replanning
            </span>
          </div>
        ) : (
          <DefaultActivity
            log={log}
            eventLabel={eventLabel}
            agents={agents}
            subtaskTitle={subtaskTitle}
            linkedSubtask={linkedSubtask}
          />
        )}
      </div>
    </div>
  )
}
