import { create } from 'zustand'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { isTeam2SystemAgent } from '../team2-tabs'

export type TeamFocusPage = 'agents' | 'skills'

export interface TeamFocusedAgent {
  agent_key: string
  name: string
  role: string | null
  level: string | null
  specialty: string | null
  capability_domain: string | null
  editable: boolean
}

export interface TeamSkillsPageSkillSummary {
  agent_key: string
  skill_key: string
  name: string
  description: string
  is_enabled: boolean
  source: string | null
}

export interface TeamSkillsPageContext {
  viewKey: string
  panel: 'skill-list' | 'skill-instructions' | 'skill-resource'
  selectedAgentKey: string
  searchQuery: string
  activeFilters: string[]
  totalSkillCount: number
  visibleSkillCount: number
  visibleSkills: TeamSkillsPageSkillSummary[]
  visibleSkillsTruncated: boolean
  loadError: string | null
  selectedSkill:
    | (TeamSkillsPageSkillSummary & {
        markdown_excerpt: string
        markdown_truncated: boolean
        resource_paths: string[]
        resource_paths_truncated: boolean
      })
    | null
  selectedResource: {
    file_path: string
    content_type: string | null
    storage_url: string | null
    content_excerpt: string
    content_truncated: boolean
  } | null
}

export interface TeamAgentsPageAgentSummary {
  agent_key: string
  name: string
  role: string | null
  level: string | null
  specialty: string | null
  status: string | null
  is_active: boolean
  model_id: string | null
  model_label: string | null
  team_id: string | null
  team_name: string | null
  editable: boolean
}

export interface TeamAgentsPageContext {
  panel:
    | 'agent-list'
    | 'agent-chat'
    | 'agent-info'
    | 'agent-skills'
    | 'agent-communication'
    | 'agent-access'
  view: 'grid' | 'list' | 'detail'
  searchQuery: string
  statusFilters: string[]
  modelFilters: string[]
  sort: string
  groupBy: string
  totalAgentCount: number
  visibleAgentCount: number
  visibleAgents: TeamAgentsPageAgentSummary[]
  visibleAgentsTruncated: boolean
  visibleGroups: Array<{ key: string; label: string; count: number }>
  selectedAgentKey: string | null
  selectedAgent:
    | (TeamAgentsPageAgentSummary & {
        bio: string | null
        hasBrain: boolean
        activeMissionCount: number
        blockedMissionCount: number
        todoMissionCount: number
        completedMissionCount: number
        completedThisMonth: number
        successRate: number | null
        averageCompletionRate: number | null
        overallScore: number | null
        missionsScored: number
        lastActiveLabel: string | null
        assignedCampaignNames: string[]
        skillNames: string[]
        workflowNames: string[]
        channelNames: string[]
        skillsLoading: boolean
        skillsError: string | null
        managementDisabled: boolean
        showAccessTab: boolean
      })
    | null
  modalState: {
    readyEmployeesOpen: boolean
    fireConfirmOpen: boolean
    telegramSetupOpen: boolean
    slackSetupOpen: boolean
    upgradeOpen: boolean
  }
}

interface TeamFocusState {
  focusedAgent: TeamFocusedAgent | null
  page: TeamFocusPage
  skillsContext: TeamSkillsPageContext | null
  agentsContext: TeamAgentsPageContext | null
  setFocusedAgent: (
    agent: MissionAgent | null,
    page: TeamFocusPage,
    skillsContext?: TeamSkillsPageContext | null,
  ) => void
  setSkillsContext: (context: TeamSkillsPageContext | null) => void
  setAgentsContext: (context: TeamAgentsPageContext | null) => void
  setPage: (page: TeamFocusPage) => void
  clearFocus: () => void
}

function toFocusedAgent(agent: MissionAgent): TeamFocusedAgent {
  const config = (agent.config as Record<string, unknown> | null) ?? {}
  return {
    agent_key: agent.agent_key,
    name: agent.name,
    role: agent.role ?? null,
    level: agent.level ?? null,
    specialty: agent.specialty ?? null,
    capability_domain:
      typeof config.capability_domain === 'string' ? config.capability_domain : null,
    editable: !isTeam2SystemAgent(agent.agent_key),
  }
}

export const useTeamFocusStore = create<TeamFocusState>((set) => ({
  focusedAgent: null,
  page: 'agents',
  skillsContext: null,
  agentsContext: null,
  setFocusedAgent: (agent, page, skillsContext = null) =>
    set((state) => ({
      focusedAgent: agent ? toFocusedAgent(agent) : null,
      page,
      skillsContext: page === 'skills' ? skillsContext : null,
      agentsContext: page === 'agents' ? state.agentsContext : null,
    })),
  setSkillsContext: (context) => set({ skillsContext: context }),
  setAgentsContext: (context) => set({ agentsContext: context }),
  setPage: (page) =>
    set((state) => ({
      page,
      skillsContext: page === 'skills' ? state.skillsContext : null,
      agentsContext: page === 'agents' ? state.agentsContext : null,
    })),
  clearFocus: () => set({ focusedAgent: null, skillsContext: null, agentsContext: null }),
}))
