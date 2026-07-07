import type { MissionAgent } from '@/lib/agents/mission-agents-api'

export interface HrGap {
  gap: string
  severity: 'critical' | 'high' | 'medium'
  evidence: string
}

export interface HrInsightsData {
  team_gaps: HrGap[]
  team_structure: { summary: string; strengths: string[]; improvements: string[] }
  cascade_hires: { agent_key: string; reason: string }[]
}

export interface ReadyEmployeesModalProps {
  open: boolean
  onClose: () => void
  onHired: (agentKey?: string) => void
  existingAgentNames?: string[]
  agents?: MissionAgent[]
  campaignId?: string
  initialTeamFilter?: string | null
}
