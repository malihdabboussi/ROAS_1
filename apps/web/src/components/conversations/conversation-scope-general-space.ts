import { fetchSpaces } from '@/lib/spaces'
import type { ConversationScopeSpace } from './conversation-scope-picker-layout'
import { isGeneralLabel, sortGeneralFirst } from './conversation-scope-sort'

export function generalSpaceIdFromRows(rows: ConversationScopeSpace[] | undefined): string | null {
  return rows?.find((space) => isGeneralLabel(space.title))?.id ?? null
}

export async function loadCampaignSpacesSorted(
  campaignId: string,
  orgId: string | null,
): Promise<ConversationScopeSpace[]> {
  const rows = await fetchSpaces<ConversationScopeSpace>(
    { campaign_id: campaignId, limit: 50 },
    orgId ? { orgId } : { orgId: null },
  )
  return sortGeneralFirst(rows, (space) => space.title)
}
