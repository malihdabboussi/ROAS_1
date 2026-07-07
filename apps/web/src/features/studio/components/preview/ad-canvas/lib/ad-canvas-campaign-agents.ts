import { AD_CANVAS_AGENTS } from '@vibey/api-shared/ad-canvas-agents'
import type { CampaignTeamAgent } from '@/features/studio/services/campaign.service'
import type { AdCanvasAgentOption } from '../types/ad-canvas.types'

const CANVAS_AGENT_META_BY_KEY = Object.fromEntries(AD_CANVAS_AGENTS.map((a) => [a.agentKey, a]))

export function campaignTeamToCanvasAgents(team: CampaignTeamAgent[]): AdCanvasAgentOption[] {
  return [...team]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => ({
      agentKey: member.agent_key,
      displayName: member.name,
      description: CANVAS_AGENT_META_BY_KEY[member.agent_key]?.description,
      role: member.role ?? undefined,
    }))
}

export function canvasAgentDescription(agent: AdCanvasAgentOption | undefined): string | undefined {
  if (!agent) return undefined
  return agent.description ?? (agent.role ? `${agent.displayName} — ${agent.role}` : undefined)
}
