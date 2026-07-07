export type AgentCapabilityKind =
  | 'integration'
  | 'brain_domain'
  | 'brain_access'
  | 'campaign_context'
  | 'space_context'
  | 'channel'
  | 'mission_type'
  | 'skill'
  | 'action_domain'

export type AgentOverrideMode = 'allow_extra' | 'deny'

export interface AgentTeam {
  id: string
  org_id: string | null
  user_id: string | null
  parent_team_id: string | null
  name: string
  color: string
  icon: string
  is_system: boolean
  created_at: string
  updated_at: string
  member_count?: number
  grant_count?: number
  user_member_count?: number
}

export interface AgentTeamGrant {
  id: number
  team_id: string
  capability_kind: AgentCapabilityKind
  capability_id: string
  mode: 'allow'
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentOverride {
  id: number
  agent_key: string
  org_id: string | null
  user_id: string | null
  capability_kind: AgentCapabilityKind
  capability_id: string
  mode: AgentOverrideMode
  created_at: string
}

export interface AgentTeamMember {
  team_id: string
  user_id: string
  added_at: string
  added_by: string | null
  role?: string | null
  full_name?: string | null
  avatar_url?: string | null
  email?: string | null
}

export interface ResolvedAgentPolicyJson {
  agent_key: string
  team_id: string | null
  team_name: string | null
  role_defaults?: Array<{ kind: AgentCapabilityKind; id: string }>
  grants: Array<{ kind: AgentCapabilityKind; id: string }>
  overrides: {
    allow_extra: Array<{ kind: AgentCapabilityKind; id: string }>
    deny: Array<{ kind: AgentCapabilityKind; id: string }>
  }
  effective: string[]
}

export const CHANNEL_VALUES = ['slack', 'telegram'] as const
export type ChannelValue = (typeof CHANNEL_VALUES)[number]
