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

/** Default picker ordering is case-insensitive A–Z. */
export function orderCampaignsForSpacePicker(campaigns: Campaign[]): Campaign[] {
  return [...campaigns].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
  )
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
      spaces: other
        .filter((sp) => sp.campaign_id === campaign.id)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    }))
    .filter((group) => group.spaces.length > 0)
}

export function countOtherSpaces(groups: OtherSpacesCampaignGroup[]): number {
  return groups.reduce((n, g) => n + g.spaces.length, 0)
}
