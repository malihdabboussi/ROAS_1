'use client'

import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { Team2AgentChatWithConversations } from '../Team2AgentChatWithConversations'

interface ChatTabProps {
  agent: MissionAgent
}

export function ChatTab({ agent }: ChatTabProps) {
  const modelId = (agent.config as Record<string, string> | undefined)?.model_id || 'auto'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Team2AgentChatWithConversations agent={agent} modelId={modelId} />
    </div>
  )
}
