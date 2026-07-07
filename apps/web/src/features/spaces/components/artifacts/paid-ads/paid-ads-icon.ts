import type { IconColorId } from '@/components/ui/IconPicker'
import type { AdCampaign, AdSet } from '@/lib/artifacts/artifact-types'

export const DEFAULT_CAMPAIGN_ICON = 'target'
export const DEFAULT_AD_SET_ICON = 'layers'

function readIcon(metadata: Record<string, unknown> | null | undefined, fallback: string): string {
  const raw = metadata?.icon
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : fallback
}

function readIconColor(metadata: Record<string, unknown> | null | undefined): IconColorId {
  const raw = metadata?.icon_color
  return typeof raw === 'string' && raw.length > 0 ? (raw as IconColorId) : 'default'
}

export function getAdCampaignIconName(
  campaign: Pick<AdCampaign, 'metadata'> | null | undefined,
): string {
  return readIcon(campaign?.metadata as Record<string, unknown> | undefined, DEFAULT_CAMPAIGN_ICON)
}

export function getAdCampaignIconColorId(
  campaign: Pick<AdCampaign, 'metadata'> | null | undefined,
): IconColorId {
  return readIconColor(campaign?.metadata as Record<string, unknown> | undefined)
}

export function getAdSetIconName(set: Pick<AdSet, 'metadata'> | null | undefined): string {
  return readIcon(set?.metadata as Record<string, unknown> | undefined, DEFAULT_AD_SET_ICON)
}

export function getAdSetIconColorId(set: Pick<AdSet, 'metadata'> | null | undefined): IconColorId {
  return readIconColor(set?.metadata as Record<string, unknown> | undefined)
}
