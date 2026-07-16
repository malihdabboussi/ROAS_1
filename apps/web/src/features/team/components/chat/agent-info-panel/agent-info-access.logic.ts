import type { AgentCapabilityKind, ResolvedAgentPolicyJson } from '@/lib/agents'
import type { RowState } from './agent-access-policy.logic'

export type AccessSectionKey =
  | 'team'
  | 'agentBrain'
  | 'integrations'
  | `policy:${AgentCapabilityKind}`

export function isLockedSystemAccessKind(kind: AgentCapabilityKind): boolean {
  return kind === 'brain_access' || kind === 'campaign_context'
}

export function protectedAgentDescription(agentKey: string): string {
  if (agentKey === 'vibey')
    return 'ROAS keeps Spaces, delegation, and artifact coordination working.'
  if (agentKey === 'atlas' || agentKey === 'brain_scholar') {
    return 'Atlas keeps brain, knowledge, ingestion, and model operations working.'
  }
  if (agentKey === 'hr') return 'HR keeps agent identity, hiring, and team operations working.'
  return 'This platform agent has protected access managed by ROAS.'
}

export function applyOverrideChange(
  policy: ResolvedAgentPolicyJson,
  kind: AgentCapabilityKind,
  id: string,
  target: RowState,
): ResolvedAgentPolicyJson {
  const allow_extra = policy.overrides.allow_extra.filter((o) => !(o.kind === kind && o.id === id))
  const deny = policy.overrides.deny.filter((o) => !(o.kind === kind && o.id === id))
  if (target === 'allow_extra') allow_extra.push({ kind, id })
  if (target === 'deny') deny.push({ kind, id })
  return { ...policy, overrides: { allow_extra, deny } }
}
