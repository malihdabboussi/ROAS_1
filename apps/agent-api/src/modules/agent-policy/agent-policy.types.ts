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

export type BrainSearchFamily = 'user' | 'agent' | 'customer' | 'company'

export interface AgentCapability {
  kind: AgentCapabilityKind
  id: string
}

export interface ResolvedAgentPolicy {
  agentKey: string
  teamId: string | null
  teamName: string | null
  grants: AgentCapability[]
  overrides: { allow_extra: AgentCapability[]; deny: AgentCapability[] }
  effective: Set<string>
}

export function capabilityKey(kind: AgentCapabilityKind, id: string): string {
  return `${kind}:${id}`
}

export const BRAIN_SEARCH_FAMILY_CAPABILITIES: Record<BrainSearchFamily, AgentCapability> = {
  user: { kind: 'brain_access', id: 'personal' },
  agent: { kind: 'action_domain', id: 'read_brain_agent' },
  company: { kind: 'action_domain', id: 'read_brain_company' },
  customer: { kind: 'action_domain', id: 'read_brain_customer' },
}
