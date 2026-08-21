import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import { buildConversationScopeLists, programNameForCampaign } from './conversation-scope-groups'
import { firstSpecificAncestor, isGeneralLabel } from './conversation-scope-sort'

function isSystemGeneralCampaign(campaign: Campaign): boolean {
  return campaign.config?.system_kind === 'general'
}

export function chatHistoryClientFolderLabel(
  campaign: Campaign,
  programs: readonly Program[],
): string {
  const name = campaign.name?.trim() || 'Client'
  if (!isGeneralLabel(name)) return name
  return firstSpecificAncestor([programNameForCampaign(campaign, programs)]) ?? name
}

export function buildChatHistoryClientFolderMaps(
  campaigns: Campaign[],
  programs: Program[],
): {
  clientNameById: Record<string, string>
  clientCampaignIds: string[]
} {
  const lists = buildConversationScopeLists(campaigns, programs)
  const clients = lists.clients.filter((campaign) => !isSystemGeneralCampaign(campaign))
  const source =
    clients.length > 0 ? clients : campaigns.filter((row) => !isSystemGeneralCampaign(row))
  const clientNameById: Record<string, string> = {}
  const clientCampaignIds: string[] = []
  for (const campaign of source) {
    clientCampaignIds.push(campaign.id)
    clientNameById[campaign.id] = chatHistoryClientFolderLabel(campaign, programs)
  }
  return { clientNameById, clientCampaignIds }
}
