'use client'

import { ClipboardCheck, Clock } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ApprovalQueueEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
} from '@/features/home/components/HomeFeedScopePicker'
import {
  formatHomeShortDate,
  HomeListCardShell,
} from '@/features/home/components/HomeListCardShell'
import type { HomeFeedScopeState } from '@/features/home/types/home-feed-scope'
import { formatInboxStatusLabel } from '@/features/inbox/lib/inbox-status-label'
import { OptionDot } from '@/features/spaces/components/OptionBadge'
import { resolveMissionStatusDotColor } from '@/features/spaces/components/space-item-values'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'

const APPROVAL_KINDS = new Set<YourTurnItem['kind']>(['suggestion', 'plan_approval'])

function approvalWaitingSince(item: YourTurnItem): string {
  return item.updated_at ?? item.created_at
}

export function formatApprovalWaitingDuration(sinceIso: string, now: Date = new Date()): string {
  const since = new Date(sinceIso)
  if (Number.isNaN(since.getTime())) return '—'
  const diffMs = now.getTime() - since.getTime()
  if (diffMs < 0) return '—'
  const secs = Math.floor(diffMs / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m waiting`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h waiting`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d waiting`
  return formatHomeShortDate(since, now)
}

function ApprovalQueueStatusDot({ item }: { item: YourTurnItem }) {
  const statusLabel =
    item.kind === 'plan_approval'
      ? formatInboxStatusLabel(item.status)
      : formatInboxStatusLabel('suggestion')

  const dotColor =
    item.kind === 'plan_approval' ? resolveMissionStatusDotColor(item.status) : 'amber'

  return (
    <Tooltip label={statusLabel} side="top">
      <span className="inline-flex shrink-0">
        <OptionDot color={dotColor} size="sm" />
      </span>
    </Tooltip>
  )
}

export function ApprovalQueueCard({
  scope,
  updateScope,
  loading,
  items,
  onOpen,
  onAccept,
  onDismiss,
}: {
  scope: HomeFeedScopeState
  updateScope: (patch: Partial<HomeFeedScopeState>) => void
  loading: boolean
  items: YourTurnItem[]
  onOpen: (item: YourTurnItem) => void | Promise<void>
  onAccept: (item: YourTurnItem) => void | Promise<void>
  onDismiss: (item: YourTurnItem) => void | Promise<void>
}) {
  const approvalItems = items.filter((item) => APPROVAL_KINDS.has(item.kind))

  return (
    <HomeListCardShell
      icon={ClipboardCheck}
      title="Mission Approval queue"
      headerRight={
        <HomeFeedScopeHoverReveal>
          <HomeFeedScopePicker variant="approval_queue" scope={scope} onChange={updateScope} />
        </HomeFeedScopeHoverReveal>
      }
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <ApprovalQueueEmptyIllustration />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            Nothing waiting for approval.
          </p>
        </div>
      }
      hasRows={approvalItems.length > 0}
    >
      <ul className="space-y-0.5">
        {approvalItems.slice(0, 15).map((item) => {
          const waitingLabel = formatApprovalWaitingDuration(approvalWaitingSince(item))

          return (
            <li key={`${item.kind}:${item.id}`}>
              <div className="hover:bg-hover-subtle body-3 text-foreground flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 font-medium transition-colors">
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <ApprovalQueueStatusDot item={item} />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="typo-caption text-muted-foreground flex shrink-0 items-center gap-1 tabular-nums">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                    {waitingLabel}
                  </span>
                </button>
                {item.kind === 'suggestion' ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDismiss(item)}
                      className="button-glass-secondary rounded-spacing-1 px-spacing-2 typo-caption font-medium"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => onAccept(item)}
                      className="button-glass-accent rounded-spacing-1 px-spacing-2 typo-caption font-medium"
                    >
                      Accept
                    </button>
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
