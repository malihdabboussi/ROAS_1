import type { ArtifactPreviewSelection } from '../components/artifacts/artifact-preview-selection'
import { VIEW_META } from '../components/view-type-tab-meta'
import {
  ALL_ARTIFACT_KIND_TYPES,
  ARTIFACT_VIEW_TYPES,
  DEFAULT_ALL_ARTIFACTS_CONFIG,
  type AllArtifactsConfig,
  type ArtifactViewType,
  type ViewDef,
} from '../types/space-schema'

export { ALL_ARTIFACT_KIND_TYPES }

export function isAllArtifactsView(view: ViewDef | null | undefined): boolean {
  return view?.type === 'all_artifacts'
}

export function isArtifactSurfaceViewType(type: ViewDef['type'] | undefined): boolean {
  if (!type) return false
  return type === 'all_artifacts' || ARTIFACT_VIEW_TYPES.has(type)
}

export function getAllArtifactsConfig(view: ViewDef): AllArtifactsConfig {
  return { ...DEFAULT_ALL_ARTIFACTS_CONFIG, ...view.all_artifacts_config }
}

export function activeArtifactTypeFilters(config: AllArtifactsConfig): ArtifactViewType[] {
  const filters = config.artifact_type_filters?.filter((t): t is ArtifactViewType =>
    ALL_ARTIFACT_KIND_TYPES.includes(t),
  )
  return filters?.length ? filters : [...ALL_ARTIFACT_KIND_TYPES]
}

function glassClassToBadgeColor(glassClass: string): string {
  if (glassClass.includes('cyan')) return 'cyan'
  if (glassClass.includes('purple')) return 'violet'
  if (glassClass.includes('green')) return 'emerald'
  if (glassClass.includes('orange')) return 'orange'
  if (glassClass.includes('red')) return 'red'
  if (glassClass.includes('blue')) return 'blue'
  return 'muted'
}

export const ARTIFACT_KIND_LABELS: Record<ArtifactViewType, string> = {
  funnels: 'Funnels',
  forms: 'Forms',
  emails: 'Emails',
  offers: 'Offers',
  ads: 'Paid Ads',
  ad_campaigns: 'Ad Campaigns',
  sequences: 'Sequences',
  presentations: 'Presentations',
  avatars: 'Avatars',
  social_posts: 'Social Posts',
  websites: 'Websites',
}

export const ARTIFACT_KIND_BADGE_COLOR: Record<ArtifactViewType, string> = Object.fromEntries(
  (Object.keys(ARTIFACT_KIND_LABELS) as ArtifactViewType[]).map((type) => [
    type,
    glassClassToBadgeColor(VIEW_META[type]?.glassClass ?? 'badge-glass-muted'),
  ]),
) as Record<ArtifactViewType, string>

export const ARTIFACT_KIND_ICONS: Record<ArtifactViewType, string> = Object.fromEntries(
  (Object.keys(ARTIFACT_KIND_LABELS) as ArtifactViewType[]).map((type) => [
    type,
    VIEW_META[type]?.defaultIcon ?? 'layers',
  ]),
) as Record<ArtifactViewType, string>

export const ALL_ARTIFACTS_GROUP_BY_OPTIONS = [
  { id: 'artifact_type', label: 'Artifact Type' },
] as const

export function artifactViewTypeToPreviewKind(
  type: ArtifactViewType,
): ArtifactPreviewSelection['type'] {
  switch (type) {
    case 'funnels':
      return 'funnel'
    case 'forms':
      return 'form'
    case 'websites':
      return 'website'
    case 'offers':
      return 'offer'
    case 'emails':
      return 'email'
    case 'sequences':
      return 'sequence'
    case 'presentations':
      return 'presentation'
    case 'avatars':
      return 'avatar'
    case 'social_posts':
      return 'social_post'
    case 'ads':
      return 'ad'
    case 'ad_campaigns':
      return 'ad_campaign'
  }
}
