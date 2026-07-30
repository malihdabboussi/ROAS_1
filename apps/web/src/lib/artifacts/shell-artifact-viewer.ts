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

const PREVIEW_TO_ENTITY_TABLE: Record<ArtifactPreviewType, string> = {
  offer: 'offers',
  funnel: 'funnels',
  avatar: 'avatars',
  sequence: 'sequences',
  presentation: 'presentations',
  ad: 'ads',
  'ad-set': 'ad_sets',
  'ad-campaign': 'ad_campaigns',
  'social-post': 'social_posts',
  'blog-post': 'blog_posts',
  email: 'emails',
  'visual-doc': 'space_items',
  form: 'forms',
  task: 'space_items',
  mission: 'missions',
  flow: 'space_automations',
  website: 'funnels',
  theme: 'themes',
  'custom-object': 'space_items',
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

export function artifactPreviewTypeToEntityTable(type: ArtifactPreviewType): string {
  return PREVIEW_TO_ENTITY_TABLE[type]
}

export function openArtifactPreviewInShell(input: {
  artifactType: ArtifactPreviewType
  artifactId: string
  name: string
  spaceId?: string | null
}): void {
  const internalUrl =
    input.artifactType === 'mission'
      ? `/home?mission=${encodeURIComponent(input.artifactId)}`
      : input.artifactType === 'flow'
        ? `/flows?flow_id=${encodeURIComponent(input.artifactId)}${
            input.spaceId ? `&space_id=${encodeURIComponent(input.spaceId)}` : ''
          }`
        : null

  openArtifactInShell({
    id: input.artifactId,
    entityId: input.artifactId,
    entityTable: artifactPreviewTypeToEntityTable(input.artifactType),
    internalUrl,
    spaceId: input.spaceId,
    title: input.name,
    type: artifactPreviewTypeToDeliverableType(input.artifactType),
  })
}

export function openDocumentInShell(input: {
  documentId: string
  title: string
  spaceId?: string | null
  spaceItemId?: string | null
}): void {
  const entityId = input.spaceItemId || input.documentId
  if (!entityId) return
  openArtifactInShell({
    id: entityId,
    entityId,
    entityTable: input.spaceItemId ? 'space_items' : 'conversation_documents',
    spaceId: input.spaceId,
    title: input.title,
    type: 'doc',
  })
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
