'use client'

import { useMemo } from 'react'
import { Bot } from 'lucide-react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { MissionDeliverable } from '@/features/mission-control/types'
import type { MessageContentBlock } from '@/features/studio/types'
import type { ChannelMessage } from '../services/channels.service'
import { ChannelOrderedBlocks } from './ChannelOrderedBlocks'

interface ActiveAgent {
  agentKey: string
  channelId: string
  sourceMessageId: string
  sourceMessage: ChannelMessage
  avatarUrl: string | null
  blocks: MessageContentBlock[]
}

function AgentProgressRow({
  agent,
  onOpenDeliverablePreview,
}: {
  agent: ActiveAgent
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg py-2">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="shrink-0">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.agentKey}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="bg-muted text-muted-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Bot className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="body-3 text-foreground font-semibold leading-tight">
            {agent.agentKey}
          </span>
          {agent.blocks.length > 0 ? (
            <div className="mt-1">
              <ChannelOrderedBlocks
                channelId={agent.channelId}
                messageId={agent.sourceMessageId}
                blocks={agent.blocks}
                isStreaming={true}
                sourceMessage={agent.sourceMessage}
                previewAgentKey={agent.agentKey}
                onOpenDeliverablePreview={onOpenDeliverablePreview}
              />
            </div>
          ) : (
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-visible">
                <VibeyChatOrb state="thinking" style="elastic" />
              </span>
              <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
                Thinking...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ThreadInlineProgress({
  messages,
  parentMessageId,
  rosterAvatars,
  onOpenDeliverablePreview,
}: {
  messages: ChannelMessage[]
  parentMessageId: string
  rosterAvatars?: Map<string, string>
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
}) {
  const activeAgents = useMemo(() => {
    const userMessages = messages.filter(
      (m) =>
        m.sender_type === 'user' && (m.reply_to_id === parentMessageId || m.id === parentMessageId),
    )

    const result: ActiveAgent[] = []
    const seen = new Set<string>()

    for (const msg of userMessages) {
      const meta = msg.metadata as Record<string, unknown> | null
      const agentStatus = (meta?.agent_status as Record<string, string>) ?? {}
      const agentContentBlocks = (meta?.agent_content_blocks as Record<string, unknown>) ?? {}

      for (const [agentKey, status] of Object.entries(agentStatus)) {
        if (status !== 'acknowledged' && status !== 'processing') continue
        if (seen.has(agentKey)) continue
        const rawBlocks = (agentContentBlocks[agentKey] as unknown[]) ?? []
        const blocks = rawBlocks.filter((b): b is MessageContentBlock => {
          if (!b || typeof b !== 'object' || Array.isArray(b)) return false
          const candidate = b as Record<string, unknown>
          return typeof candidate.type === 'string'
        })
        seen.add(agentKey)
        result.push({
          agentKey,
          channelId: msg.channel_id,
          sourceMessageId: msg.id,
          sourceMessage: msg,
          avatarUrl: rosterAvatars?.get(agentKey) ?? null,
          blocks,
        })
      }
    }

    return result
  }, [messages, parentMessageId, rosterAvatars])

  if (activeAgents.length === 0) return null

  return (
    <div className="mt-1">
      {activeAgents.map((agent) => (
        <AgentProgressRow
          key={agent.agentKey}
          agent={agent}
          onOpenDeliverablePreview={onOpenDeliverablePreview}
        />
      ))}
    </div>
  )
}
