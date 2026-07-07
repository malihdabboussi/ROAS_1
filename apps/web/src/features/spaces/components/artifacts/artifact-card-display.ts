import type { ArtifactListRow } from './artifact-display'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'

export type ArtifactDragNodeType =
  | 'funnel'
  | 'presentation'
  | 'avatar'
  | 'social-post'
  | 'ad'
  | 'ad-set'
  | 'ad-campaign'
  | 'sequence'
  | 'email'
  | 'form'
  | 'offer'
  | 'task'
  | 'mission'
  | 'flow'
  | 'theme'
  | 'custom-object'
  | 'document'

export type ArtifactBadgeTone = NonNullable<ArtifactListRow['badges']>[number]['tone']

export function artifactCardMaxWidthClass(type: ArtifactPreviewSelection['type']): string {
  switch (type) {
    case 'doc':
      return 'max-w-artifact-medium'
    case 'funnel':
    case 'website':
    case 'presentation':
    case 'avatar':
      return 'max-w-artifact-wide'
    case 'social_post':
    case 'ad':
      return 'max-w-artifact-square'
    case 'ad_set':
    case 'task':
    case 'mission':
    case 'flow':
    case 'theme':
    case 'custom_object':
      return 'max-w-artifact-medium'
    case 'offer':
      return 'max-w-artifact-compact'
    case 'form':
      return 'max-w-artifact-medium'
    case 'ad_campaign':
    case 'sequence':
    case 'email':
      return 'max-w-artifact-medium'
  }
}

export function previewTypeToArtifactNodeType(
  type: ArtifactPreviewSelection['type'],
): ArtifactDragNodeType {
  switch (type) {
    case 'doc':
      return 'document'
    case 'funnel':
    case 'website':
      return 'funnel'
    case 'presentation':
      return 'presentation'
    case 'avatar':
      return 'avatar'
    case 'social_post':
      return 'social-post'
    case 'ad':
      return 'ad'
    case 'ad_set':
      return 'ad-set'
    case 'ad_campaign':
      return 'ad-campaign'
    case 'sequence':
      return 'sequence'
    case 'email':
      return 'email'
    case 'form':
      return 'form'
    case 'offer':
      return 'offer'
    case 'task':
      return 'task'
    case 'mission':
      return 'mission'
    case 'flow':
      return 'flow'
    case 'theme':
      return 'theme'
    case 'custom_object':
      return 'custom-object'
  }
}

export function artifactBadgeClass(tone?: ArtifactBadgeTone) {
  if (tone === 'green') return 'badge-glass-green'
  if (tone === 'orange') return 'badge-glass-orange'
  if (tone === 'red') return 'badge-glass-red'
  if (tone === 'purple') return 'badge-glass-purple'
  if (tone === 'blue') return 'badge-glass-blue'
  return 'badge-glass-muted'
}
