'use client'

import { Loader2, Square } from 'lucide-react'
import { ChannelOrderedBlocks } from '@/components/channels/ChannelOrderedBlocksAdapter'
import { AgentTurnFeedbackActions } from '@/components/chat/AgentTurnFeedbackActions'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { MessageContentBlock } from '@/lib/chat'
import type { MissionDeliverable } from '@/lib/missions'
import { formatRelativeTime } from './task-activity-format'
import type { TimelineEntry } from './task-activity-types'

function readActivityDurationMs(payload: Record<string, unknown>): number | undefined {
  const raw = payload.duration_ms ?? payload.durationMs
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
}

export function AgentTaskExecutionBlock({
  entry,
  displayName,
  onOpenDeliverablePreview,
  onStop,
  stopping = false,
}: {
  entry: TimelineEntry
  displayName: string
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  onStop?: () => void
  stopping?: boolean
}) {
  const payload = entry.payload
  const agentKey = (payload.agent_key as string) ?? 'Agent'
  const name = displayName || agentKey
  const status = (payload.status as string) ?? 'running'
  const blocks = Array.isArray(payload.content_blocks_ordered)
    ? (payload.content_blocks_ordered as MessageContentBlock[])
    : []
  const phase = (payload.phase as string) ?? ''
  const isStreaming = status === 'running'
  const isComplete = status === 'done' || status === 'completed'
  const durationMs = readActivityDurationMs(payload)
  const feedbackContent = (payload.content as string) ?? ''

  const sourceMessage = {
    id: entry.id,
    channel_id: '',
    sender_type: 'agent' as const,
    sender_id: agentKey,
    content: (payload.content as string) ?? '',
    content_blocks: null,
    metadata: { content_blocks_ordered: blocks },
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: entry.created_at,
    updated_at: entry.created_at,
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-spacing-2">
        <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
          <span className="body-3 min-w-0 break-words font-medium text-foreground">{name}</span>
          {isStreaming && phase && (
            <span className="typo-caption text-muted-foreground italic">{phase}</span>
          )}
        </div>
        <div className="group/agent-time flex items-center gap-1.5">
          {status === 'failed' && <span className="typo-caption text-destructive">Failed</span>}
          {status === 'cancelled' && (
            <span className="typo-caption text-muted-foreground">Stopped</span>
          )}
          <span
            className={
              isStreaming && onStop
                ? 'body-3 text-muted-foreground/50 shrink-0 group-hover/agent-time:hidden'
                : 'body-3 text-muted-foreground/50 shrink-0'
            }
          >
            {formatRelativeTime(entry.created_at)}
          </span>
          {isStreaming && onStop ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive hidden h-5 w-5 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 group-hover/agent-time:flex"
              title="Stop agent"
              aria-label="Stop agent"
              disabled={stopping}
              onClick={onStop}
            >
              {stopping ? (
                <Loader2 className="icon-sm animate-spin" aria-hidden="true" />
              ) : (
                <Square className="icon-xs fill-current" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {blocks.length > 0 ? (
        <div className="mt-1 min-w-0 overflow-x-hidden">
          <ChannelOrderedBlocks
            channelId=""
            messageId={entry.id}
            blocks={blocks}
            isStreaming={isStreaming}
            sourceMessage={sourceMessage}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
            collapseCompletedWorkSummary={isComplete}
            durationMs={durationMs}
          />
        </div>
      ) : isStreaming ? (
        <div className="flex items-center gap-spacing-2 py-spacing-2">
          <VibeyChatOrb className="h-4 w-4" state="thinking" />
          <span className="body-3 text-muted-foreground">Agent is thinking...</span>
        </div>
      ) : payload.error ? (
        <p className="body-3 text-destructive mt-1 break-all">{String(payload.error)}</p>
      ) : null}
      {!isStreaming ? (
        <AgentTurnFeedbackActions
          targetKind="space_item_activity"
          targetId={entry.id}
          sourceSurface="task_activity"
          content={feedbackContent}
          className="py-0"
        />
      ) : null}
    </div>
  )
}
