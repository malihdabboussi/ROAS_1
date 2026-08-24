import { useEffect, useState } from 'react'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { fetchCampaignTeam } from '@/lib/campaigns'
import { campaignTeamToMissionAgents } from './task-campaign-agents'

export function useCampaignTaskAgents(campaignId?: string | null): MissionAgent[] {
  const [agents, setAgents] = useState<MissionAgent[]>([])
  useEffect(() => {
    if (!campaignId) {
      setAgents([])
      return
    }
    fetchCampaignTeam(campaignId)
      .then((team) => setAgents(campaignTeamToMissionAgents(team)))
      .catch(() => setAgents([]))
  }, [campaignId])
  return agents
}
