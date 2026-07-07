import type { Campaign } from '@/lib/campaigns/campaign-api'
import type { Space } from '../types'

export type WritableSpaceOption = {
  id: string
  title: string
  visibility: 'private' | 'team'
  campaign_id: string | null
}

export type OtherSpacesCampaignGroup = {
  campaign: Campaign
  spaces: WritableSpaceOption[]
}

export function isWritableSpace(space: Space): boolean {
  const level = space.effective_level ?? space.share_meta?.level
  if (level && level !== 'edit' && level !== 'admin') return false
  return true
}

export function toWritableSpaceOption(space: Space): WritableSpaceOption {
  return {
    id: space.id,
    title: space.title,
    visibility: space.visibility,
    campaign_id: space.campaign_id,
  }
}

/** Same campaign ordering as home / space switcher: General first, then A–Z. */
export function orderCampaignsForSpacePicker(campaigns: Campaign[]): Campaign[] {
  const generalCampaign =
    campaigns.find(
      (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
    ) ?? null
  const otherCampaigns = campaigns.filter((c) => c.id !== generalCampaign?.id)
  const sortedOthers = [...otherCampaigns].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? ''),
  )
  return generalCampaign ? [generalCampaign, ...sortedOthers] : sortedOthers
}

export function groupOtherSpacesByCampaign(
  allSpaces: Space[],
  campaigns: Campaign[],
  excludeSpaceId: string,
): OtherSpacesCampaignGroup[] {
  const other = allSpaces
    .filter(isWritableSpace)
    .filter((sp) => sp.id !== excludeSpaceId)
    .map(toWritableSpaceOption)

  return orderCampaignsForSpacePicker(campaigns)
    .map((campaign) => ({
      campaign,
      spaces: other.filter((sp) => sp.campaign_id === campaign.id),
    }))
    .filter((group) => group.spaces.length > 0)
}

export function countOtherSpaces(groups: OtherSpacesCampaignGroup[]): number {
  return groups.reduce((n, g) => n + g.spaces.length, 0)
}
