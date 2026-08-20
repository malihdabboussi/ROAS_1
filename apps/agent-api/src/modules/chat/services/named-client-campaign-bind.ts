/**
 * Deterministic named-client CONNECTIONS bind for app chats (plan §11.2a,
 * Studio side). When a message *names* a client ("for Christian Osgood's
 * multi-family…") and the conversation is unbound or bound to General, bind
 * the conversation to that client's campaign BEFORE the turn runs — so the
 * Campaign Brain preload and campaign-scoped tools fire without depending on
 * the model choosing to call `search_campaign_brain` with the name.
 *
 * Safety: binds only on a UNIQUE campaign-name match within the org, never
 * rebinds a conversation already on a real client campaign, and reuses
 * `bindChannelConversationCampaign` (rejects General / wrong org / unknown).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isGeneralCampaignRow } from '../../brain/services/campaign-brain-preload'
import { bindChannelConversationCampaign } from './channel-chat-campaign-bind'

const CANDIDATE_LIMIT = 3
const MATCH_SCAN_LIMIT = 20

/**
 * Pull likely client names out of a free-text ask. Mirrors the Slack-side
 * extractor (apps/api slack-client-context.ts): "for <Name>", "<Name>'s",
 * "client <Name>".
 */
export function extractNamedClientCandidates(text: string): string[] {
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
  return [...candidates].slice(0, CANDIDATE_LIMIT)
}

/** Every word of the needle appears in the haystack (loose, deterministic). */
function nameMatches(needle: string, haystack: string | null | undefined): boolean {
  if (!haystack) return false
  const words = needle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1)
  if (words.length === 0) return false
  const target = haystack.toLowerCase()
  return words.every((word) => target.includes(word))
}

export type NamedClientBindResult = {
  campaignId: string
  campaignName: string | null
  candidate: string
} | null

export async function maybeBindNamedClientCampaign(
  supabase: SupabaseClient,
  input: {
    conversationId: string
    userId: string
    orgId: string | null | undefined
    text: string | null | undefined
    /** The campaign the turn resolved so far (conversation binding). */
    currentCampaignId: string | null | undefined
  },
): Promise<NamedClientBindResult> {
  if (!input.orgId || !input.text?.trim()) return null
  const candidates = extractNamedClientCandidates(input.text)
  if (candidates.length === 0) return null

  // Already on a real client campaign → keep it. General (or unbound) may rebind.
  if (input.currentCampaignId) {
    const { data: current } = await supabase
      .from('campaigns')
      .select('id, name, config')
      .eq('id', input.currentCampaignId)
      .maybeSingle()
    if (current && !isGeneralCampaignRow(current)) return null
  }

  for (const candidate of candidates) {
    const firstWord = candidate.trim().split(/\s+/)[0] ?? candidate
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, config')
      .eq('org_id', input.orgId)
      .is('deleted_at', null)
      .ilike('name', `%${firstWord}%`)
      .limit(MATCH_SCAN_LIMIT)
    let rows = ((data ?? []) as Array<{ id: string; name: string | null; config: unknown }>)
      .filter((row) => !isGeneralCampaignRow(row))
      .filter((row) => nameMatches(candidate, row.name))
    if (rows.length === 0) {
      // Client name ≠ campaign name is common ("Christian Osgood" → campaign
      // "Multifamily Strategy"). Resolve via the Portal client stamps on Slack
      // observation events, the same source the Slack-side bundle uses.
      const { data: stamped } = await supabase
        .from('slack_observation_events')
        .select('metadata')
        .eq('org_id', input.orgId)
        .ilike('metadata->>page_grader_client_name', `%${firstWord}%`)
        .not('metadata->>roas_campaign_id', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(MATCH_SCAN_LIMIT)
      const campaignIds = new Set<string>()
      for (const event of (stamped ?? []) as Array<{ metadata: Record<string, unknown> }>) {
        const clientName = String(event.metadata?.page_grader_client_name ?? '')
        const campaignId = String(event.metadata?.roas_campaign_id ?? '')
        if (campaignId && nameMatches(candidate, clientName)) campaignIds.add(campaignId)
      }
      if (campaignIds.size === 1) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id, name, config')
          .eq('id', [...campaignIds][0])
          .is('deleted_at', null)
          .maybeSingle()
        if (campaign && !isGeneralCampaignRow(campaign)) {
          rows = [campaign as { id: string; name: string | null; config: unknown }]
        }
      }
    }
    if (rows.length !== 1) continue

    const bind = await bindChannelConversationCampaign(supabase, {
      conversationId: input.conversationId,
      userId: input.userId,
      orgId: input.orgId,
      campaignId: rows[0].id,
    })
    if (bind.status === 'bound' || bind.status === 'unchanged') {
      return { campaignId: rows[0].id, campaignName: rows[0].name, candidate }
    }
  }
  return null
}
