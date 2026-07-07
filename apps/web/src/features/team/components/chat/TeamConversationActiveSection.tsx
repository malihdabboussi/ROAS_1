'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { Conversation } from '@/lib/conversations'
import type { TeamConversationAgent } from './team-conversations-sidebar.logic'

export interface TeamConversationActiveSectionProps {
  activeConversations: Conversation[]
  activeConvsExpanded: boolean
  agentByKey: Map<string, TeamConversationAgent>
  onSelectActiveConversation?: (sessionId: string) => void
  onToggleExpanded: () => void
}

function resolveActiveConversationAgent(
  session: Conversation,
  agentByKey: Map<string, TeamConversationAgent>,
): TeamConversationAgent | null {
  const metadataAgentId =
    typeof session.metadata.agent_id === 'string' ? session.metadata.agent_id : null
  const agentKey = session.agent_id ?? metadataAgentId
  return agentKey ? agentByKey.get(agentKey) ?? null : null
}

function ActiveConversationAgentAvatar({ agent }: { agent: TeamConversationAgent | null }) {
  if (!agent) return null

  return (
    <Tooltip label={agent.name} side="right">
      <span className="bg-secondary text-foreground typo-2xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold uppercase">
        {agent.image_url ? (
          <img src={agent.image_url} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          agent.name.charAt(0)
        )}
      </span>
    </Tooltip>
  )
}

export function TeamConversationActiveSection({
  activeConversations,
  activeConvsExpanded,
  agentByKey,
  onSelectActiveConversation,
  onToggleExpanded,
}: TeamConversationActiveSectionProps) {
  return (
    <div className="mb-spacing-2">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="gap-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left"
      >
        {activeConvsExpanded ? (
          <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
        )}
        <span className="typo-2xs text-muted-foreground font-medium uppercase tracking-wider">
          Recent Conversations
        </span>
      </button>
      {activeConvsExpanded && (
        <div className="space-y-0.5 py-0.5 pl-2">
          {activeConversations.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectActiveConversation?.(session.id)}
              className="nav-glass-hover-purple gap-spacing-2 px-spacing-3 py-spacing-1 text-muted-foreground flex w-full items-center rounded-lg border border-transparent text-left transition-all"
            >
              <ActiveConversationAgentAvatar
                agent={resolveActiveConversationAgent(session, agentByKey)}
              />
              <span className="body-2 flex-1 truncate text-xs">
                {session.title?.trim() || 'New conversation'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
