import { getAllSocialResearchConfig } from '../../../../lib/all-social-research'
import {
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  socialResearchConfigKeyForPlatform,
  type AllSocialResearchConfig,
  type SocialPlatform,
  type SocialResearchConfig,
  type ViewDef,
} from '../../../../types/space-schema'
import { patchAllSocialConfig } from '../all-social-research/all-social-research-customize.helpers'

/** Returns the social-research config for the given platform, merged with defaults. */
export function getSocialConfig(
  view: ViewDef,
  platform: SocialPlatform = 'instagram',
): SocialResearchConfig {
  if (view.type === 'all_social_research') {
    return getAllSocialResearchConfig(view)
  }
  const key = socialResearchConfigKeyForPlatform(platform)
  return { ...DEFAULT_SOCIAL_RESEARCH_CONFIG, ...view[key] }
}

/** Patches the right social-research config field on a view based on platform. */
export function patchSocialConfig(
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>,
  current: SocialResearchConfig,
  patch: Partial<SocialResearchConfig>,
  platform: SocialPlatform = 'instagram',
  view?: ViewDef,
) {
  if (view?.type === 'all_social_research') {
    patchAllSocialConfig(onViewPatch, current as AllSocialResearchConfig, patch)
    return
  }
  const key = socialResearchConfigKeyForPlatform(platform)
  void onViewPatch({ [key]: { ...current, ...patch } })
}

/** @deprecated Use `getSocialConfig(view, 'instagram')` instead. */
export function getIgConfig(view: ViewDef): SocialResearchConfig {
  return getSocialConfig(view, 'instagram')
}

/** @deprecated Use `patchSocialConfig(..., 'instagram')` instead. */
export function patchIgConfig(
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>,
  current: SocialResearchConfig,
  patch: Partial<SocialResearchConfig>,
) {
  patchSocialConfig(onViewPatch, current, patch, 'instagram')
}
