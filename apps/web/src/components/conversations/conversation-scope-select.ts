import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import { programNameForCampaign } from './conversation-scope-groups'
import {
  findConversationScopeSpace,
  type ConversationScopeSpace,
} from './conversation-scope-picker-layout'

export function buildConversationScopeChange(input: {
  campaignId: string | null
  spaceId: string | null
  campaigns: Campaign[]
  programs: Program[]
  spacesByCampaign: Record<string, ConversationScopeSpace[]>
  fallbackSpace: ConversationScopeSpace | null | undefined
}): {
  campaignId: string | null
  spaceId: string | null
  campaignName: string | null
  spaceTitle: string | null
  programName: string | null
} {
  const nextCampaign =
    input.campaignId == null
      ? null
      : (input.campaigns.find((campaign) => campaign.id === input.campaignId) ?? null)
  const spaceTitle =
    input.spaceId == null
      ? null
      : (findConversationScopeSpace(input.spacesByCampaign, input.spaceId)?.title ??
        (input.fallbackSpace?.id === input.spaceId ? input.fallbackSpace.title : null))
  return {
    campaignId: input.campaignId,
    spaceId: input.spaceId,
    campaignName: nextCampaign?.name ?? null,
    spaceTitle,
    programName: programNameForCampaign(nextCampaign, input.programs),
  }
}
