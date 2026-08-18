'use client'

import { programNameForCampaign } from '@/components/conversations/conversation-scope-groups'
import { conversationScopeDisplayLabel } from '@/components/conversations/conversation-scope-picker-layout'
import {
  useConversationScopeCampaigns,
  useConversationScopeFallbackCampaign,
  useConversationScopeFallbackSpace,
  useConversationScopePrograms,
} from '@/components/conversations/use-conversation-scope-data'
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'

/** Stable empty map — a fresh `{}` each render re-fires the fallback space fetch. */
const EMPTY_SPACES_BY_CAMPAIGN: Record<string, never> = {}

export function useConversationLocationLabel(
  campaignId: string | null,
  spaceId: string | null,
): {
  label: string
  resolvedCampaignId: string | null
} {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const campaigns = useConversationScopeCampaigns(activeOrgId, cacheVersion)
  const programs = useConversationScopePrograms(activeOrgId)
  const space = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId: null,
    selectedSpaceId: spaceId,
    spacesByCampaign: EMPTY_SPACES_BY_CAMPAIGN,
  })
  const resolvedCampaignId = campaignId ?? space?.campaign_id ?? null
  const fallbackCampaign = useConversationScopeFallbackCampaign(resolvedCampaignId, campaigns)
  const campaign = campaigns.find((row) => row.id === resolvedCampaignId) ?? fallbackCampaign

  return {
    resolvedCampaignId,
    label: conversationScopeDisplayLabel({
      campaignName: campaign?.name,
      spaceTitle: spaceId ? space?.title : null,
      programName: programNameForCampaign(campaign, programs),
      campaignId: resolvedCampaignId,
      spaceId,
      emptyLabel: 'General',
    }),
  }
}
