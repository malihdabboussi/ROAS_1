import type {
  ArtifactPreviewSelection,
  ArtifactPreviewType,
} from '@/lib/artifacts/artifact-preview-types'
import type { DeliverableType } from '@/lib/missions'

export const SHELL_ARTIFACT_OPEN_EVENT = 'vibey-open-shell-artifact'

export type ShellArtifactViewerTarget = {
  id: string
  title: string
  type: DeliverableType
  entityId?: string | null
  entityTable?: string | null
  campaignId?: string | null
  spaceId?: string | null
  content?: string | null
  fileUrl?: string | null
  fileName?: string | null
  mimeType?: string | null
  internalUrl?: string | null
  mediaAssetId?: string | null
  conversationId?: string | null
  contextLabel?: string | null
  contextUrl?: string | null
}

export function openArtifactInShell(target: ShellArtifactViewerTarget): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ShellArtifactViewerTarget>(SHELL_ARTIFACT_OPEN_EVENT, { detail: target }),
  )
}

const PREVIEW_TO_DELIVERABLE_TYPE: Record<ArtifactPreviewType, DeliverableType> = {
  offer: 'offer',
  funnel: 'funnel',
  avatar: 'avatar',
  sequence: 'sequence',
  presentation: 'presentation',
  ad: 'ad',
  'ad-set': 'ad_set',
  'ad-campaign': 'ad_campaign',
  'social-post': 'social_post',
  'blog-post': 'blog_post',
  email: 'email',
  'visual-doc': 'visual_doc',
  form: 'form',
  task: 'task',
  mission: 'mission',
  flow: 'flow',
  website: 'website',
  theme: 'theme',
  'custom-object': 'custom_object',
}

export function artifactPreviewTypeToDeliverableType(type: ArtifactPreviewType): DeliverableType {
  return PREVIEW_TO_DELIVERABLE_TYPE[type]
}

const SELECTION_TO_DELIVERABLE_TYPE: Record<ArtifactPreviewSelection['type'], DeliverableType> = {
  doc: 'doc',
  funnel: 'funnel',
  website: 'website',
  form: 'form',
  task: 'task',
  mission: 'mission',
  flow: 'flow',
  theme: 'theme',
  custom_object: 'custom_object',
  offer: 'offer',
  ad: 'ad',
  ad_set: 'ad_set',
  ad_campaign: 'ad_campaign',
  sequence: 'sequence',
  email: 'email',
  presentation: 'presentation',
  avatar: 'avatar',
  social_post: 'social_post',
}

export function artifactSelectionTypeToDeliverableType(
  type: ArtifactPreviewSelection['type'],
): DeliverableType {
  return SELECTION_TO_DELIVERABLE_TYPE[type]
}
