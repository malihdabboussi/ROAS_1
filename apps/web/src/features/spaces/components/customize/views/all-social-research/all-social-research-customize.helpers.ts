import {
  DEFAULT_ALL_SOCIAL_RESEARCH_CONFIG,
  type AllSocialResearchConfig,
  type ViewDef,
} from '../../../../types/space-schema'

export function getAllSocialConfig(view: ViewDef): AllSocialResearchConfig {
  return { ...DEFAULT_ALL_SOCIAL_RESEARCH_CONFIG, ...view.all_social_research_config }
}

export function patchAllSocialConfig(
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>,
  current: AllSocialResearchConfig,
  patch: Partial<AllSocialResearchConfig>,
) {
  void onViewPatch({ all_social_research_config: { ...current, ...patch } })
}
