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
export type AgentTeamKind = 'internal' | 'external' | 'agent' | 'mixed'

export interface AgentCapability {
  kind: AgentCapabilityKind
  id: string
}

export interface AgentTeam {
  id: string
  org_id: string | null
  user_id: string | null
  parent_team_id: string | null
  name: string
  color: string
  icon: string
  is_system: boolean
  team_kind: AgentTeamKind
  created_at: string
  updated_at: string
}

export interface AgentTeamWithCounts extends AgentTeam {
  member_count: number
  grant_count: number
  user_member_count?: number
  external_member_count?: number
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

export interface AgentTeamExternalMember {
  team_id: string
  person_id: string
  added_at: string
  added_by: string | null
  display_name: string
  email: string | null
  avatar_url: string | null
  title: string | null
  relationship_kind: 'external'
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

export interface ResolvedAgentPolicy {
  agentKey: string
  teamId: string | null
  teamName: string | null
  grants: AgentCapability[]
  overrides: { allow_extra: AgentCapability[]; deny: AgentCapability[] }
  effective: Set<string>
}

export const ALL_CAPABILITY_KINDS: readonly AgentCapabilityKind[] = [
  'integration',
  'brain_domain',
  'brain_access',
  'campaign_context',
  'space_context',
  'channel',
  'mission_type',
  'skill',
  'action_domain',
] as const

export function capabilityKey(kind: AgentCapabilityKind, id: string): string {
  return `${kind}:${id}`
}

export function isCapabilityKind(value: unknown): value is AgentCapabilityKind {
  return typeof value === 'string' && (ALL_CAPABILITY_KINDS as readonly string[]).includes(value)
}
