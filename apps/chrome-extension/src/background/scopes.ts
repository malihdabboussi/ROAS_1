import type { BrainScopeOption, CampaignRow, NsBrainRow } from '../shared/types'

export function buildScopeOptions(brains: NsBrainRow[], campaigns: CampaignRow[]): BrainScopeOption[] {
  const out: BrainScopeOption[] = []
  const defaultBrain = brains.find((b) => b.is_default && !b.agent_id)
  out.push({
    id: 'user',
    label: 'Your Brain',
    scopeType: 'user',
    brainId: defaultBrain?.id ?? null,
    campaignId: null,
    agentKey: null,
  })

  for (const b of brains.filter((x) => x.agent_id)) {
    out.push({
      id: `agent:${b.agent_id}`,
      label: b.name,
      scopeType: 'agent',
      brainId: b.id,
      campaignId: null,
      agentKey: b.agent_id,
    })
  }

  for (const c of campaigns) {
    const cfg = c.config as Record<string, unknown> | null | undefined
    const agentSettings = (cfg?.agent_settings as Record<string, unknown> | undefined) ?? {}
    const raw = agentSettings.model_strategy
    const campaignModelStrategy =
      typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null
    out.push({
      id: `campaign:${c.id}`,
      label: c.name,
      scopeType: 'campaign',
      brainId: null,
      campaignId: c.id,
      agentKey: null,
      campaignModelStrategy,
    })
  }

  return out
}
