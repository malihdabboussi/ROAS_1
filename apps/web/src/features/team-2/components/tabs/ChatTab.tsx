'use client'

import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Campaign } from '@/lib/campaigns'
import { Team2AgentChatWithConversations } from '../Team2AgentChatWithConversations'

interface ChatTabProps {
  agent: MissionAgent
  assignedCampaigns?: Campaign[]
  nonGeneralCampaigns?: Campaign[]
  generalCampaignId?: string
  systemContext?: string
  compactLayout?: boolean
}

export function ChatTab({
  agent,
  assignedCampaigns = [],
  nonGeneralCampaigns = [],
  generalCampaignId,
  systemContext,
  compactLayout = false,
}: ChatTabProps) {
  const modelId = (agent.config as Record<string, string> | undefined)?.model_id || 'auto'

  return (
    <div
      className={
        compactLayout
          ? 'flex min-h-0 w-full flex-col overflow-hidden'
          : 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
      }
    >
      <Team2AgentChatWithConversations
        agent={agent}
        modelId={modelId}
        assignedCampaigns={assignedCampaigns}
        nonGeneralCampaigns={nonGeneralCampaigns}
        generalCampaignId={generalCampaignId}
        systemContext={systemContext}
        compactLayout={compactLayout}
      />
    </div>
  )
}
