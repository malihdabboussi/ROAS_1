import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArtifactLegacySessionCampaignRepository } from '../repositories/artifact-legacy-session-campaign.repository'

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
  throw new Error(`campaign_name not found for user: "${campaignName}"`)
}
