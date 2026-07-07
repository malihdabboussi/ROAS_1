import { ArrowRight, ExternalLink, FileText } from 'lucide-react'
import { AgentTurnFeedbackActions } from '@/components/chat/AgentTurnFeedbackActions'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import type { MissionCommentAttachment } from '../../services/missions.service'
import type { MissionAgent, MissionLog, MissionSubtask } from '../../types'
import { formatEventType, formatRelativeTime, getEventDotClass } from './detail-helpers'
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

function AgentChip({ log, agents }: { log: MissionLog; agents: MissionAgent[] }) {
  if (!log.agent_key) return null
  const logAgent = agents.find((agent) => agent.agent_key === log.agent_key)
  return (
    <div className="gap-spacing-1 flex shrink-0 items-center">
      {logAgent?.image_url ? (
        <img src={logAgent.image_url} alt={logAgent.name} className="h-4 w-4 rounded-full object-cover" />
      ) : (
        <div className="typo-2xs flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] font-bold text-[var(--color-muted-foreground)]">
          {(logAgent?.name ?? log.agent_key).charAt(0).toUpperCase()}
        </div>
      )}
      <span className="body-3 text-[var(--color-muted-foreground)]">
        {logAgent?.name ?? log.agent_key}
      </span>
    </div>
  )
}

function UserHeader({
  userProfile,
  createdAt,
}: {
  userProfile: { fullName: string; avatarUrl: string | null } | null
  createdAt: string
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="gap-spacing-1 flex items-center">
        {userProfile?.avatarUrl ? (
          <img src={userProfile.avatarUrl} alt={userProfile.fullName} className="h-4 w-4 rounded-full object-cover" />
        ) : (
          <div className="bg-[var(--color-primary)]/20 typo-2xs flex h-4 w-4 items-center justify-center rounded-full font-bold text-[var(--color-primary)]">
            {(userProfile?.fullName ?? 'Y').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="body-3 font-medium text-[var(--color-foreground)]">
          {userProfile?.fullName ?? 'You'}
        </span>
      </div>
      <span className="body-3 text-[var(--color-muted-foreground)]/50 shrink-0">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  )
}

function CommentAttachments({ attachments }: { attachments?: MissionCommentAttachment[] }) {
  if (!attachments?.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att, idx) => (
        <a
          key={idx}
          href={att.fileUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-[var(--color-secondary)]/80 body-4 group flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 transition-colors"
        >
          {att.type === 'image' ? (
            <img src={att.fileUrl} alt={att.filename} className="h-8 w-8 rounded object-cover" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          )}
          <span className="body-4 max-w-[120px] truncate text-[var(--color-foreground)]">
            {att.filename}
          </span>
          {att.fileUrl && (
            <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </a>
      ))}
    </div>
  )
}

function UserRatingActivity({
  log,
  userProfile,
}: {
  log: MissionLog
  userProfile: { fullName: string; avatarUrl: string | null } | null
}) {
  const ratingPayload = log.payload as { thumbs_up?: boolean; rating?: number; feedback?: string }
  return (
    <>
      <UserHeader userProfile={userProfile} createdAt={log.created_at} />
      <div className="rounded-spacing-1 px-spacing-2 py-spacing-1 mt-1 border border-orange-500/20 bg-orange-500/[0.06]">
        <div className="flex items-center gap-2">
          <span className="body-3 text-orange-300">
            {ratingPayload.thumbs_up === true
              ? '👍'
              : ratingPayload.thumbs_up === false
                ? '👎'
                : ''}
          </span>
          {ratingPayload.rating != null && (
            <span className="body-3 font-medium text-orange-300">{ratingPayload.rating}/10</span>
          )}
        </div>
        {ratingPayload.feedback && (
          <p className="body-3 mt-0.5 text-[var(--color-foreground)]">
            {ratingPayload.feedback}
          </p>
        )}
      </div>
    </>
  )
}

function UserCommentActivity({
  log,
  userProfile,
}: {
  log: MissionLog
  userProfile: { fullName: string; avatarUrl: string | null } | null
}) {
  const payload = log.payload as {
    message?: string
    attachments?: MissionCommentAttachment[]
  }
  return (
    <>
      <UserHeader userProfile={userProfile} createdAt={log.created_at} />
      <div
        className={`body-3 mt-0.5 text-[var(--color-foreground)] ${CHAT_MARKDOWN_CLASSNAME}`}
        dangerouslySetInnerHTML={{
          __html: renderChatMarkdown(payload.message ?? ''),
        }}
      />
      <CommentAttachments attachments={payload.attachments} />
    </>
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
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={`body-3 min-w-0 flex-1 text-[var(--color-foreground)] ${CHAT_MARKDOWN_CLASSNAME}`}
          dangerouslySetInnerHTML={{
            __html: renderChatMarkdown(note || 'Progress update'),
          }}
        />
        <AgentChip log={log} agents={agents} />
      </div>
      <span className="body-3 text-[var(--color-muted-foreground)]/50">
        {formatRelativeTime(log.created_at)}
      </span>
      {execSubtask ? <MissionLockedIn subtask={execSubtask} /> : null}
      <AgentTurnFeedbackActions targetKind="mission_log" targetId={log.id} sourceSurface="mission_activity" content={note || 'Progress update'} className="py-0" />
    </>
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
              <button type="button" onClick={onViewPlan} className="body-3 text-primary hover:text-foreground mt-spacing-2 flex items-center gap-1 font-medium transition-colors">
                View Plan
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap items-center">
              {onReject && (
                <button type="button" onClick={onReject} className="button-glass-destructive body-3 rounded-lg px-3 py-1.5 font-medium">
                  Reject
                </button>
              )}
              {onApprove && (
                <button type="button" onClick={onApprove} disabled={approving} className="chip-glass-green body-3 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50">
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
          <p className="body-2 font-medium text-orange-400">Plan Rejected</p>
        ) : wasApproved && autoApprovePlans ? (
          <div className="flex items-center justify-between">
            <p className="body-2 font-medium text-emerald-400">Plan auto-approved</p>
            {onToggleAutoApprove && (
              <PlanSwitch checked={autoApprovePlans} onClick={() => onToggleAutoApprove(false)} />
            )}
          </div>
        ) : (
          <p className="body-2 font-medium text-emerald-400">Plan Approved</p>
        )}
      </div>
      <span className="body-3 text-[var(--color-muted-foreground)]/50 mt-1">
        {formatRelativeTime(log.created_at)}
      </span>
    </>
  )
}

function AutoApproveSwitch({
  autoApprovePlans,
  onToggleAutoApprove,
}: {
  autoApprovePlans?: boolean
  onToggleAutoApprove: (enabled: boolean) => void
}) {
  return (
    <div className="border-border mt-spacing-3 pt-spacing-3 flex items-center justify-between border-t">
      <span className="body-3 text-muted-foreground">Auto-approve future plans</span>
      <PlanSwitch checked={autoApprovePlans} onClick={() => onToggleAutoApprove(!autoApprovePlans)} />
    </div>
  )
}

function PlanSwitch({ checked, onClick }: { checked?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300"
    >
      <span
        className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${checked ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  )
}

function PlanApprovedActivity({ log, agents }: { log: MissionLog; agents: MissionAgent[] }) {
  const hired = (log.payload as { hired_agents?: Array<{ role_key: string; agent_key: string }> })
    ?.hired_agents
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="body-3 font-medium text-emerald-400">Plan approved</span>
        <AgentChip log={log} agents={agents} />
      </div>
      {hired && hired.length > 0 ? (
        <p className="body-3 text-muted-foreground">
          Hired: {hired.map((h) => h.agent_key).join(', ')}
        </p>
      ) : null}
      <span className="body-3 text-[var(--color-muted-foreground)]/50">
        {formatRelativeTime(log.created_at)}
      </span>
    </>
  )
}

function DefaultActivity({ log, eventLabel, agents }: { log: MissionLog; eventLabel: string; agents: MissionAgent[] }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="body-3 font-medium text-[var(--color-foreground)]">{eventLabel}</span>
        <AgentChip log={log} agents={agents} />
      </div>
      {log.payload && typeof log.payload === 'object' && (
        <LogPayloadDetails payload={log.payload as Record<string, unknown>} eventType={log.event_type} />
      )}
      {log.from_status &&
        log.to_status &&
        log.from_status !== log.to_status &&
        !(log.payload as { error?: string })?.error && (
          <p className="body-3 text-[var(--color-muted-foreground)]">
            {log.from_status} → {log.to_status}
          </p>
        )}
      <span className="body-3 text-[var(--color-muted-foreground)]/50">
        {formatRelativeTime(log.created_at)}
      </span>
    </>
  )
}

export function ActivityTimelineLogItem(props: ActivityTimelineLogItemProps) {
  const { log, subtasks, agents, userProfile } = props
  const payload = resolvePayload(log)
  const subtaskId = payload && typeof payload.subtask_id === 'string' ? payload.subtask_id : null
  const subtaskTitle = subtaskId
    ? subtasks.find((subtask) => subtask.id === subtaskId)?.title || null
    : null
  const eventLabel =
    log.event_type === 'subtask.review' && subtaskTitle
      ? `Subtask review — ${subtaskTitle}`
      : formatEventType(log.event_type)

  return (
    <div className="pl-spacing-6 relative flex">
      <div
        className={`${getEventDotClass(log.event_type)} absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2 rounded-full`}
      />
      <div className="min-w-0 flex-1 pb-1">
        {log.event_type === 'user.rating' ? (
          <UserRatingActivity log={log} userProfile={userProfile} />
        ) : log.event_type === 'user.comment' ? (
          <UserCommentActivity log={log} userProfile={userProfile} />
        ) : log.event_type === 'mission.progress' ? (
          <MissionProgressActivity log={log} subtaskId={subtaskId} subtasks={subtasks} agents={agents} />
        ) : log.event_type === 'mission.plan.pending_approval' ? (
          <PlanPendingActivity {...props} />
        ) : log.event_type === 'mission.plan.approved' ? (
          <PlanApprovedActivity log={log} agents={agents} />
        ) : log.event_type === 'mission.plan.rejected' ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className="body-3 font-medium text-orange-400">Plan rejected — replanning</span>
              <AgentChip log={log} agents={agents} />
            </div>
            <span className="body-3 text-[var(--color-muted-foreground)]/50">
              {formatRelativeTime(log.created_at)}
            </span>
          </>
        ) : (
          <DefaultActivity log={log} eventLabel={eventLabel} agents={agents} />
        )}
      </div>
    </div>
  )
}
