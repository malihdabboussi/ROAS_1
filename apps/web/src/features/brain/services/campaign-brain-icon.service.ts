import { cachedBrainScopeNav } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { fetchCampaign, updateCampaign } from '@/lib/campaigns'

export type CampaignBrainIconPatch = {
  icon?: string
  icon_color?: string
  icon_image_url?: string | undefined
}

export async function patchCampaignBrainIcon(
  campaignId: string,
  patch: CampaignBrainIconPatch,
): Promise<void> {
  const campaign = await fetchCampaign(campaignId)
  const nextConfig = { ...(campaign.config ?? {}), ...patch }
  await updateCampaign(campaignId, { config: nextConfig })
  cachedBrainScopeNav.invalidate()
  await cachedBrainScopeNav.reload()
}
