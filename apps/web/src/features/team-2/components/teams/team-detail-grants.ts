import type { AgentCapabilityKind, AgentTeamGrant } from '@/lib/agents'
import type { TeamAccessGrants } from './TeamAccessView'

const TEAM_ACCESS_GRANT_KINDS: ReadonlySet<keyof TeamAccessGrants> = new Set([
  'integration',
  'brain_domain',
  'brain_access',
  'campaign_context',
  'channel',
  'action_domain',
])

function isTeamAccessGrantKind(kind: AgentCapabilityKind): kind is keyof TeamAccessGrants {
  return TEAM_ACCESS_GRANT_KINDS.has(kind as keyof TeamAccessGrants)
}

export function emptyTeamAccessGrants(): TeamAccessGrants {
  return {
    integration: new Set(),
    brain_domain: new Set(),
    brain_access: new Set(),
    campaign_context: new Set(),
    channel: new Set(),
    action_domain: new Set(),
  }
}

export function grantsToToggleSet(grants: AgentTeamGrant[]): TeamAccessGrants {
  const out = emptyTeamAccessGrants()
  for (const grant of grants) {
    if (isTeamAccessGrantKind(grant.capability_kind)) {
      out[grant.capability_kind].add(grant.capability_id)
    }
  }
  return out
}

export function toggleSetToGrants(
  toggleSet: TeamAccessGrants,
): Array<{ kind: AgentCapabilityKind; id: string }> {
  const rows: Array<{ kind: AgentCapabilityKind; id: string }> = []
  ;(Object.keys(toggleSet) as Array<keyof TeamAccessGrants>).forEach((kind) => {
    for (const id of toggleSet[kind]) rows.push({ kind: kind as AgentCapabilityKind, id })
  })
  return rows
}
