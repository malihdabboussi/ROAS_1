import type { Campaign } from '@/lib/campaigns/campaign-api'
import { orderCampaignsForSpacePicker } from '@/features/spaces/lib/group-other-spaces-by-campaign'

export type FlowSpacePickerItem = {
  id: string
  title?: string | null
  campaign_id?: string | null
  schema?: {
    icon?: string
    icon_color?: string
  } | null
}

export type FlowSpacePickerGroup = {
  id: string
  heading: string
  campaignIcon?: string
  campaignIconColor?: string
  spaces: FlowSpacePickerItem[]
}

function campaignIconName(campaign: Campaign): string {
  const fromConfig = campaign.config?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

function campaignIconColorId(campaign: Campaign): string | undefined {
  const raw = (campaign.config as Record<string, unknown> | undefined)?.icon_color
  return typeof raw === 'string' ? raw : undefined
}

function sortSpacesByTitle(spaces: FlowSpacePickerItem[]): FlowSpacePickerItem[] {
  return [...spaces].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
}

export function groupFlowSpacesByCampaign(
  spaces: FlowSpacePickerItem[],
  campaigns: Campaign[],
): FlowSpacePickerGroup[] {
  const groups: FlowSpacePickerGroup[] = orderCampaignsForSpacePicker(campaigns)
    .map((campaign) => {
      const campaignSpaces = sortSpacesByTitle(
        spaces.filter((space) => space.campaign_id === campaign.id),
      )
      if (campaignSpaces.length === 0) return null
      return {
        id: campaign.id,
        heading: campaign.name,
        campaignIcon: campaignIconName(campaign),
        campaignIconColor: campaignIconColorId(campaign),
        spaces: campaignSpaces,
      }
    })
    .filter((group): group is FlowSpacePickerGroup => group !== null)

  const knownCampaignIds = new Set(campaigns.map((campaign) => campaign.id))
  const otherSpaces = sortSpacesByTitle(
    spaces.filter(
      (space) => !space.campaign_id || !knownCampaignIds.has(space.campaign_id),
    ),
  )

  if (otherSpaces.length > 0) {
    groups.push({
      id: 'other-spaces',
      heading: 'Other spaces',
      campaignIcon: 'layout-grid',
      spaces: otherSpaces,
    })
  }

  return groups
}

export function filterFlowSpacePickerGroups(
  groups: FlowSpacePickerGroup[],
  query: string,
): FlowSpacePickerGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups

  return groups
    .map((group) => {
      const headingMatch = group.heading.toLowerCase().includes(q)
      const spaces = headingMatch
        ? group.spaces
        : group.spaces.filter((space) => (space.title ?? '').toLowerCase().includes(q))
      if (spaces.length === 0) return null
      return { ...group, spaces }
    })
    .filter((group): group is FlowSpacePickerGroup => group !== null)
}
