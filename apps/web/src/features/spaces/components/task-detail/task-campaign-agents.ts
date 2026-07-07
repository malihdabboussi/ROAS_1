import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { CampaignTeamAgent } from '@/lib/campaigns'

export function campaignTeamToMissionAgents(team: CampaignTeamAgent[]): MissionAgent[] {
  return team.map((agent, index) => ({
    id: `campaign-agent-${agent.agent_key}-${index}`,
    user_id: '',
    agent_key: agent.agent_key,
    name: agent.name,
    role: agent.role ?? 'member',
    status: 'idle' as const,
    skills: [],
    level: agent.level ?? undefined,
    image_url: null,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  }))
}
