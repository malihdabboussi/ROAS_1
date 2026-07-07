export type CreditHistoryRawRow = {
  id: string
  feature: string
  action: string | null
  model_name: string | null
  credits_charged: number | null
  created_at: string
  conversation_id: string | null
  campaign_id: string | null
}

export type CreditHistoryEnrichedItem = {
  id: string
  action: string
  feature: string
  model: string
  credits: number
  timestamp: string
  conversationTitle: string | null
  campaignName: string | null
  agentName: string | null
  agentImageUrl: string | null
}

export type CreditHistoryConversationRow = {
  id: string
  title: string | null
  agent_id: string | null
  user_id: string | null
  org_id: string | null
}

export type CreditHistoryCampaignRow = {
  id: string
  name: string | null
}

export type CreditHistoryAgentRow = {
  agent_key: string
  name: string | null
  image_url: string | null
  user_id: string | null
  org_id: string | null
}

export type CreditHistoryEnrichmentLookups = {
  conversations: CreditHistoryConversationRow[]
  campaigns: CreditHistoryCampaignRow[]
  agents: CreditHistoryAgentRow[]
}

export function enrichCreditHistoryRows(
  rows: CreditHistoryRawRow[],
  lookups: CreditHistoryEnrichmentLookups,
): CreditHistoryEnrichedItem[] {
  const convMap = new Map<string, CreditHistoryConversationRow>()
  for (const c of lookups.conversations) {
    if (c && typeof c.id === 'string') convMap.set(c.id, c)
  }
  const campMap = new Map<string, string>()
  for (const c of lookups.campaigns) {
    if (c && typeof c.id === 'string' && typeof c.name === 'string') campMap.set(c.id, c.name)
  }

  function resolveAgentRow(conversationId: string | null): CreditHistoryAgentRow | null {
    if (!conversationId) return null
    const c = convMap.get(conversationId)
    const agentKey = c?.agent_id
    if (typeof agentKey !== 'string') return null
    const orgId = c?.org_id
    const userId = c?.user_id
    const candidates = lookups.agents.filter((a) => a.agent_key === agentKey)
    const match = candidates.find((a) => {
      if (orgId) return a.org_id === orgId
      return a.user_id === userId && (a.org_id === null || a.org_id === undefined)
    })
    return match ?? null
  }

  function resolveAgentName(conversationId: string | null): string | null {
    const match = resolveAgentRow(conversationId)
    return typeof match?.name === 'string' ? match.name : null
  }

  function resolveAgentImageUrl(conversationId: string | null): string | null {
    const match = resolveAgentRow(conversationId)
    const url = match?.image_url
    return typeof url === 'string' && url.trim() !== '' ? url : null
  }

  return rows.map((e) => ({
    id: e.id,
    action: e.action ?? 'AI Usage',
    feature: e.feature ?? 'chat',
    model: e.model_name ?? 'unknown',
    credits: e.credits_charged ?? 0,
    timestamp: e.created_at,
    conversationTitle:
      e.conversation_id && convMap.has(e.conversation_id)
        ? ((convMap.get(e.conversation_id)?.title as string | null | undefined) ?? null)
        : null,
    campaignName: e.campaign_id ? (campMap.get(e.campaign_id) ?? null) : null,
    agentName: resolveAgentName(e.conversation_id),
    agentImageUrl: resolveAgentImageUrl(e.conversation_id),
  }))
}
