'use client'

import { useState, type ReactNode } from 'react'
import { CalendarDays, Plug } from 'lucide-react'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'
import { Tooltip } from '@/components/ui/tooltip'
import {
  getAgentInitial,
  getConversationAgentDisplay,
  isMeetingConversation,
  type ChatHistoryLeadingIcon,
  type Conversation,
  type ConversationActivity,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { ConversationActivityIndicator } from './ConversationActivityIndicator'

function withActivityOverlay(icon: ReactNode, activity: ConversationActivity) {
  if (activity === 'idle') return icon
  return (
    <span className="relative inline-flex items-center justify-center">
      {icon}
      <ConversationActivityIndicator activity={activity} overlay />
    </span>
  )
}

function ConversationAgentAvatar({
  conversation,
  agentByKey,
}: {
  conversation: Conversation
  agentByKey?: Record<string, ConversationAgentDisplay>
}) {
  const agent = getConversationAgentDisplay(conversation, agentByKey)
  return (
    <Tooltip label={agent.name} side="right">
      <span className="border-subtle bg-secondary icon-md flex shrink-0 items-center justify-center overflow-hidden rounded-full">
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="typo-xs text-muted-foreground font-semibold">
            {getAgentInitial(agent.name)}
          </span>
        )}
      </span>
    </Tooltip>
  )
}

function metadataText(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function McpConversationIcon({ conversation }: { conversation: Conversation }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const clientName = metadataText(conversation.metadata, 'mcp_client_name')
  const logoUri = metadataText(conversation.metadata, 'mcp_client_logo_uri')
  const label = clientName ? `${clientName} MCP conversation` : 'MCP conversation'

  return (
    <span aria-label={label}>
      {logoUri && !logoFailed ? (
        <img
          src={logoUri}
          alt=""
          referrerPolicy="no-referrer"
          className="icon-xs rounded-spacing-1 object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Plug className="text-muted-foreground icon-xs" aria-hidden />
      )}
    </span>
  )
}

export function ConversationRowLeadingIcon({
  conversation,
  leadingIcon,
  activity,
  agentByKey,
}: {
  conversation: Conversation
  leadingIcon: ChatHistoryLeadingIcon
  activity: ConversationActivity
  agentByKey?: Record<string, ConversationAgentDisplay>
}) {
  if (leadingIcon === 'none') return null
  if (leadingIcon === 'agent') {
    return withActivityOverlay(
      <ConversationAgentAvatar conversation={conversation} agentByKey={agentByKey} />,
      activity,
    )
  }
  if (leadingIcon === 'status') {
    return <ConversationActivityIndicator activity={activity} />
  }
  const source = conversation.metadata?.source
  if (source === 'slack' || source === 'telegram') {
    return withActivityOverlay(
      <span aria-label={source === 'slack' ? 'Slack conversation' : 'Telegram conversation'}>
        <ConversationChannelIcon metadata={conversation.metadata} />
      </span>,
      activity,
    )
  }
  if (source === 'mcp') {
    return withActivityOverlay(<McpConversationIcon conversation={conversation} />, activity)
  }
  if (isMeetingConversation(conversation)) {
    return withActivityOverlay(
      <span aria-label="Meeting conversation">
        <CalendarDays className="text-muted-foreground icon-xs" aria-hidden />
      </span>,
      activity,
    )
  }
  return null
}
