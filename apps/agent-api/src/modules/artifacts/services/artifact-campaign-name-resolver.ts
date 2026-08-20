import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArtifactLegacySessionCampaignRepository } from '../repositories/artifact-legacy-session-campaign.repository'
import {
  campaignNameLookupQueries,
  pickUniqueFuzzyCampaign,
  type CampaignNameRow,
} from './campaign-name-match'

export function normalizeCampaignName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatCampaignMatches(rows: Array<{ id?: unknown; name?: unknown }>): string {
  return rows
    .map((row) => `${String(row.name ?? 'Unnamed campaign')} (${String(row.id ?? 'unknown-id')})`)
    .join(', ')
}

export async function resolveCampaignIdByName(
  repository: ArtifactLegacySessionCampaignRepository,
  supabase: SupabaseClient,
  userId: string,
  campaignName: string,
  orgId?: string | null,
): Promise<string> {
  const queries = campaignNameLookupQueries(campaignName)
  for (const query of queries) {
    const resolved = await resolveExactOrPartialCampaignId(
      repository,
      supabase,
      userId,
      query,
      orgId,
    )
    if (resolved) return resolved
  }

  const { data: accessibleRows, error: listError } = await repository.listAccessibleCampaignNames(
    supabase,
    { userId, orgId },
  )
  if (listError) throw listError
  const rows: CampaignNameRow[] = (accessibleRows ?? [])
    .map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
    }))
    .filter((row) => row.id && row.name)
  const fuzzy = pickUniqueFuzzyCampaign(queries, rows)
  if (fuzzy === 'ambiguous') {
    throw new Error(
      `campaign_name is ambiguous. Matching campaigns: ${formatCampaignMatches(rows)}`,
    )
  }
  if (fuzzy) return fuzzy.id

  // Client name ≠ campaign name is common ("Christian Osgood" → campaign
  // "Multifamily Strategy"). Resolve via the Portal client stamps on Slack
  // observation events before declaring the name unknown — the same source
  // the Slack-side Client Context Bundle and the app-chat bind use.
  const stamped = await resolveCampaignIdByClientStamp(supabase, campaignName, orgId)
  if (stamped) return stamped

  throw new Error(`campaign_name not found for user: "${campaignName}"`)
}

function clientNameMatches(needle: string, haystack: string): boolean {
  const words = needle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1)
  if (words.length === 0) return false
  const target = haystack.toLowerCase()
  return words.every((word) => target.includes(word))
}

async function resolveCampaignIdByClientStamp(
  supabase: SupabaseClient,
  clientName: string,
  orgId?: string | null,
): Promise<string | null> {
  if (!orgId) return null
  const firstWord = clientName.trim().split(/\s+/)[0] ?? clientName
  const { data } = await supabase
    .from('slack_observation_events')
    .select('metadata')
    .eq('org_id', orgId)
    .ilike('metadata->>page_grader_client_name', `%${firstWord}%`)
    .not('metadata->>roas_campaign_id', 'is', null)
    .order('observed_at', { ascending: false })
    .limit(20)
  const campaignIds = new Set<string>()
  for (const row of (data ?? []) as Array<{ metadata: Record<string, unknown> }>) {
    const stampedName = String(row.metadata?.page_grader_client_name ?? '')
    const campaignId = String(row.metadata?.roas_campaign_id ?? '')
    if (campaignId && clientNameMatches(clientName, stampedName)) campaignIds.add(campaignId)
  }
  return campaignIds.size === 1 ? [...campaignIds][0] : null
}

async function resolveExactOrPartialCampaignId(
  repository: ArtifactLegacySessionCampaignRepository,
  supabase: SupabaseClient,
  userId: string,
  campaignName: string,
  orgId?: string | null,
): Promise<string | null> {
  const normalizedName = campaignName.toLowerCase()
  const { data: exactRows, error: exactError } = await repository.findCampaignNameMatches(
    supabase,
    {
      campaignName,
      ilikeValue: campaignName,
      userId,
      orgId,
    },
  )
  if (exactError) throw exactError

  const exactMatches = (exactRows ?? []).filter(
    (row) =>
      String(row.name ?? '')
        .trim()
        .toLowerCase() === normalizedName,
  )
  if (exactMatches.length === 1) return String(exactMatches[0].id)
  if (exactMatches.length > 1) {
    throw new Error(
      `campaign_name is ambiguous. Matching campaigns: ${formatCampaignMatches(exactMatches)}`,
    )
  }

  const { data: partialRows, error: partialError } = await repository.findCampaignNameMatches(
    supabase,
    {
      campaignName,
      ilikeValue: `%${campaignName}%`,
      userId,
      orgId,
    },
  )
  if (partialError) throw partialError
  if ((partialRows ?? []).length === 1) return String(partialRows?.[0]?.id)
  if ((partialRows ?? []).length > 1) {
    throw new Error(
      `campaign_name is ambiguous. Matching campaigns: ${formatCampaignMatches(partialRows ?? [])}`,
    )
  }
  return null
}
