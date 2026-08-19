/**
 * Client Context Bundle — the one place that answers "which Slack channels,
 * campaigns, brains, and spaces belong to this client?".
 *
 * Built once a client is known (channel stamp, explicit portal/campaign id, or a
 * client named in a DM) and injected into the Pixel prompt, and reused by
 * SLACK_SEARCH_MESSAGES so `client_id=` scopes retrieval to the right channels.
 * Reverse-mapping sources, in order of authority:
 *   1. slack_brain_mappings   (channel → campaign, curated)
 *   2. slack_observation_events.metadata (page_grader_client_id / roas_campaign_id)
 *   3. campaigns / ns_brains / spaces by campaign_id
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const CLIENT_CONTEXT_HEADER = '[Client context]'
const OBSERVATION_LOOKBACK_DAYS = 180
const OBSERVATION_EVENT_LIMIT = 400
const CAMPAIGN_NAME_MATCH_LIMIT = 5

export type SlackClientChannel = {
  channelId: string
  channelName: string | null
  source: 'mapping' | 'observation'
}

export type SlackClientContextBundle = {
  clientId: string | null
  clientName: string | null
  campaigns: Array<{ id: string; name: string | null }>
  campaignBrainIds: string[]
  slackChannels: SlackClientChannel[]
  spaces: Array<{ id: string; title: string | null }>
  resolvedBy: 'client_id' | 'campaign_id' | 'client_name'
}

export type ResolveSlackClientContextInput = {
  orgId: string
  clientId?: string | null
  campaignId?: string | null
  clientName?: string | null
  now?: Date
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

/** Loose, deterministic name match: every word of the needle appears in the haystack. */
export function clientNameMatches(needle: string, haystack: string | null | undefined): boolean {
  if (!haystack) return false
  const words = needle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1)
  if (words.length === 0) return false
  const target = haystack.toLowerCase()
  return words.every((word) => target.includes(word))
}

async function resolveCampaignsByName(
  supabase: SupabaseClient,
  orgId: string,
  clientName: string,
): Promise<Array<{ id: string; name: string | null }>> {
  const firstWord = clientName.trim().split(/\s+/)[0] ?? clientName
  const { data } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .ilike('name', `%${firstWord}%`)
    .limit(CAMPAIGN_NAME_MATCH_LIMIT * 4)
  const rows = (data ?? []) as Array<{ id: string; name: string | null }>
  return rows
    .filter((row) => clientNameMatches(clientName, row.name))
    .slice(0, CAMPAIGN_NAME_MATCH_LIMIT)
}

export async function resolveSlackClientContext(
  supabase: SupabaseClient,
  input: ResolveSlackClientContextInput,
): Promise<SlackClientContextBundle | null> {
  const now = input.now ?? new Date()
  let clientId = asString(input.clientId)
  let clientName = asString(input.clientName)
  const campaignMap = new Map<string, string | null>()
  let resolvedBy: SlackClientContextBundle['resolvedBy'] | null = null

  if (input.campaignId) {
    campaignMap.set(input.campaignId, null)
    resolvedBy = 'campaign_id'
  }
  if (clientId) resolvedBy = 'client_id'

  if (!clientId && campaignMap.size === 0) {
    if (!clientName) return null
    const byName = await resolveCampaignsByName(supabase, input.orgId, clientName)
    if (byName.length !== 1) return null
    campaignMap.set(byName[0].id, byName[0].name)
    resolvedBy = 'client_name'
  }

  const channels = new Map<string, SlackClientChannel>()
  const brainIds = new Set<string>()

  // 1. Observation events carry both the portal client id and the ROAS campaign id.
  const filters: string[] = []
  if (clientId) filters.push(`metadata->>page_grader_client_id.eq.${clientId}`)
  for (const campaignId of campaignMap.keys()) {
    filters.push(`metadata->>roas_campaign_id.eq.${campaignId}`)
  }
  if (filters.length > 0) {
    const since = new Date(now.getTime() - OBSERVATION_LOOKBACK_DAYS * 86_400_000).toISOString()
    const { data } = await supabase
      .from('slack_observation_events')
      .select('channel_id, channel_name, metadata')
      .eq('org_id', input.orgId)
      .gte('observed_at', since)
      .or(filters.join(','))
      .order('observed_at', { ascending: false })
      .limit(OBSERVATION_EVENT_LIMIT)
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const channelId = asString(row.channel_id)
      if (!channelId) continue
      const metadata = asRecord(row.metadata)
      clientId ??= asString(metadata.page_grader_client_id)
      clientName ??= asString(metadata.page_grader_client_name)
      const campaignId = asString(metadata.roas_campaign_id)
      if (campaignId && !campaignMap.get(campaignId)) {
        campaignMap.set(campaignId, asString(metadata.roas_campaign_name))
      }
      if (!channels.has(channelId)) {
        channels.set(channelId, {
          channelId,
          channelName: asString(row.channel_name),
          source: 'observation',
        })
      }
    }
  }

  const campaignIds = [...campaignMap.keys()]

  // 2. Curated channel → campaign mappings win over observation guesses.
  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from('slack_brain_mappings')
      .select('slack_channel_id, slack_channel_name, target_campaign_id, target_brain_id')
      .eq('org_id', input.orgId)
      .eq('enabled', true)
      .in('target_campaign_id', campaignIds)
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const channelId = asString(row.slack_channel_id)
      if (channelId) {
        channels.set(channelId, {
          channelId,
          channelName:
            asString(row.slack_channel_name) ?? channels.get(channelId)?.channelName ?? null,
          source: 'mapping',
        })
      }
      const brainId = asString(row.target_brain_id)
      if (brainId) brainIds.add(brainId)
    }
  }

  // 3. Campaign names, Campaign Brains, Spaces.
  let spaces: SlackClientContextBundle['spaces'] = []
  if (campaignIds.length > 0) {
    const [campaignRows, brainRows, spaceRows] = await Promise.all([
      supabase.from('campaigns').select('id, name').in('id', campaignIds),
      supabase
        .from('ns_brains')
        .select('id, campaign_id')
        .eq('scope', 'campaign')
        .in('campaign_id', campaignIds),
      supabase.from('spaces').select('id, title').in('campaign_id', campaignIds).limit(10),
    ])
    for (const row of (campaignRows.data ?? []) as Array<{ id: string; name: string | null }>) {
      if (!campaignMap.get(row.id)) campaignMap.set(row.id, row.name)
      clientName ??= row.name
    }
    for (const row of (brainRows.data ?? []) as Array<{ id: string }>) brainIds.add(row.id)
    spaces = ((spaceRows.data ?? []) as Array<{ id: string; title: string | null }>).map((row) => ({
      id: row.id,
      title: row.title,
    }))
  }

  if (!clientId && campaignIds.length === 0) return null

  return {
    clientId,
    clientName,
    campaigns: [...campaignMap.entries()].map(([id, name]) => ({ id, name })),
    campaignBrainIds: [...brainIds],
    slackChannels: [...channels.values()],
    spaces,
    resolvedBy: resolvedBy ?? 'client_id',
  }
}

export function formatSlackClientChannel(channel: SlackClientChannel): string {
  return channel.channelName
    ? `#${channel.channelName.replace(/^#/, '')} (${channel.channelId})`
    : channel.channelId
}

export function formatSlackClientContextBlock(bundle: SlackClientContextBundle): string {
  const lines = [CLIENT_CONTEXT_HEADER]
  const clientLabel = bundle.clientName ?? bundle.campaigns[0]?.name ?? 'unknown'
  lines.push(`Client: ${clientLabel}${bundle.clientId ? ` (portal id=${bundle.clientId})` : ''}`)
  if (bundle.campaigns.length > 0) {
    lines.push(
      `ROAS campaign${bundle.campaigns.length > 1 ? 's' : ''}: ${bundle.campaigns
        .map((campaign) => `${campaign.name ?? 'unnamed'} (id=${campaign.id})`)
        .join(', ')}`,
    )
  }
  if (bundle.campaignBrainIds.length > 0) {
    lines.push(
      `Campaign Brain: ${bundle.campaignBrainIds.join(', ')} — search it first for this client's history, stats, decisions, and meeting notes.`,
    )
  }
  if (bundle.slackChannels.length > 0) {
    lines.push(`Slack channels: ${bundle.slackChannels.map(formatSlackClientChannel).join(', ')}`)
    const scope = bundle.clientId
      ? `client_id=${bundle.clientId}`
      : `channel_ids=${bundle.slackChannels.map((channel) => channel.channelId).join(',')}`
    lines.push(
      `Slack retrieval: for anything shared or discussed in this client's channel, call SLACK_SEARCH_MESSAGES with ${scope} (do not search the whole workspace). Name the channel you searched in your answer; never say the channel is unknown.`,
    )
  } else {
    lines.push(
      'Slack channels: none mapped yet. Use SLACK_LIST_CHANNELS and match the client name before searching; say which channel you used.',
    )
  }
  if (bundle.spaces.length > 0) {
    lines.push(
      `Spaces: ${bundle.spaces.map((space) => `${space.title ?? 'untitled'} (id=${space.id})`).join(', ')}`,
    )
  }
  return lines.join('\n')
}

/**
 * Pull a likely client name out of a free-text ask when no channel stamp exists
 * (DMs, group DMs). Matches "for <Name>", "<Name>'s", "client <Name>".
 */
export function extractClientNameCandidates(text: string): string[] {
  const candidates = new Set<string>()
  const cleaned = text.replace(/<[^>]+>/g, ' ')
  const patterns = [
    /\b(?:for|from|with|about|re)\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})/g,
    /\b([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})['’]s\b/g,
    /\bclient\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})/gi,
  ]
  for (const pattern of patterns) {
    for (const match of cleaned.matchAll(pattern)) {
      const value = match[1]?.trim()
      if (value && value.length > 1 && !/^(I|We|You|The|This|That|Pixel|Slack)$/i.test(value)) {
        candidates.add(value)
      }
    }
  }
  return [...candidates].slice(0, 3)
}
