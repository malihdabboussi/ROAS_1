import type { RefObject } from 'react'
import { Clock } from 'lucide-react'
import type { MissionAgent, MissionLog, MissionSubtask } from '../../types'
import { ActivityTimelineLogItem } from './ActivityTimelineLogItem'

interface ActivityTimelineLogListProps {
  scrollRef: RefObject<HTMLDivElement | null>
  onScroll: () => void
  logsLoading: boolean
  isMissionLinked: boolean
  sortedLogs: MissionLog[]
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  createdAt: string
  activityEndRef: RefObject<HTMLDivElement | null>
  missionStatus?: string
  onViewPlan?: () => void
  onApprove?: () => void
  onReject?: () => void
  approving?: boolean
  autoApprovePlans?: boolean
  onToggleAutoApprove?: (enabled: boolean) => void
  /** When true, omit the empty-state clock (parent already shows meaningful content). */
  hideEmptyState?: boolean
  /** When false, parent owns scrolling — render content only. */
  nestScroll?: boolean
}

export function ActivityTimelineLogList({
  scrollRef,
  onScroll,
  logsLoading,
  isMissionLinked,
  sortedLogs,
  subtasks,
  agents,
  userProfile,
  createdAt,
  activityEndRef,
  missionStatus,
  onViewPlan,
  onApprove,
  onReject,
  approving,
  autoApprovePlans,
  onToggleAutoApprove,
  hideEmptyState = false,
  nestScroll = true,
}: ActivityTimelineLogListProps) {
  const showEmpty = !logsLoading && sortedLogs.length === 0 && !hideEmptyState

  const body = (
    <>
      {logsLoading && isMissionLinked ? (
        <p className="body-3 text-muted-foreground">Loading...</p>
      ) : showEmpty ? (
        <div className="text-muted-foreground/40 flex flex-col items-center py-spacing-8">
          <Clock className="icon-md" />
          <p className="body-3 mt-spacing-2">No activity yet</p>
        </div>
      ) : sortedLogs.length > 0 ? (
        <div className="relative">
          <div className="bg-border absolute bottom-2 left-[5px] top-2 w-px" />
          <div className="space-y-spacing-4">
            {sortedLogs.map((log, logIndex) => (
              <ActivityTimelineLogItem
                key={log.id}
                log={log}
                logIndex={logIndex}
                sortedLogs={sortedLogs}
                subtasks={subtasks}
                agents={agents}
                userProfile={userProfile}
                missionStatus={missionStatus}
                onViewPlan={onViewPlan}
                onApprove={onApprove}
                onReject={onReject}
                approving={approving}
                autoApprovePlans={autoApprovePlans}
                onToggleAutoApprove={onToggleAutoApprove}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!isMissionLinked && (
        <div className="pl-spacing-6 relative flex">
          <div className="indicator-dot-glass-blue absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2 rounded-full" />
          <div>
            <span className="body-3 text-foreground font-medium">Task created</span>
            <p className="body-3 text-muted-foreground/50 mt-0.5">
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
      <div ref={activityEndRef} />
    </>
  )

  if (!nestScroll) {
    return <div className="px-spacing-6 py-spacing-3">{body}</div>
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="px-spacing-6 py-spacing-3 min-h-0 flex-1 overflow-y-auto"
    >
      {body}
    </div>
  )
}
