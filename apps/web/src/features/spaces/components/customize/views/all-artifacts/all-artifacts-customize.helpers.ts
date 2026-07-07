import {
  DEFAULT_ALL_ARTIFACTS_CONFIG,
  type AllArtifactsConfig,
  type ViewDef,
} from '../../../../types/space-schema'

export function getAllArtifactsCustomizeConfig(view: ViewDef): AllArtifactsConfig {
  return { ...DEFAULT_ALL_ARTIFACTS_CONFIG, ...view.all_artifacts_config }
}

export function patchAllArtifactsConfig(
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>,
  current: AllArtifactsConfig,
  patch: Partial<AllArtifactsConfig>,
) {
  void onViewPatch({ all_artifacts_config: { ...current, ...patch } })
}
