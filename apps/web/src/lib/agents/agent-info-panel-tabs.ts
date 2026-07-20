import { USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS } from './agent-team-display'
import type { MissionAgent } from './mission-agents-api'

export const AGENT_INFO_PANEL_TABS = ['info', 'work', 'skills', 'communication', 'access'] as const
export type AgentInfoPanelTab = (typeof AGENT_INFO_PANEL_TABS)[number]

export function isAgentInfoPanelTab(v: string | null): v is AgentInfoPanelTab {
  return v === 'info' || v === 'work' || v === 'skills' || v === 'communication' || v === 'access'
}

export function showsAgentAccessTab(
  agent: MissionAgent | null,
  isSystemLikeAgent: boolean,
): boolean {
  if (!agent) return false
  return (
    (agent.level !== 'system' && !isSystemLikeAgent) ||
    agent.agent_key === 'vibey' ||
    USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS.has(agent.agent_key)
  )
}

export function agentShowsCampaignAssignment(
  agent: MissionAgent,
  isSystemLikeAgent: boolean,
): boolean {
  if (isSystemLikeAgent || agent.level === 'system') return false
  const level = agent.level || 'employee'
  return level === 'manager' || level === 'employee' || level === 'c_level'
}
