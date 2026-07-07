import type { ArtifactInlinePreviewCardProps } from '@/components/artifacts'
import type { ArtifactPreviewType } from '@/lib/artifacts'
import type { BrainMemory } from '../types'

const SOURCE_TYPE_TO_ARTIFACT: Partial<Record<string, ArtifactPreviewType>> = {
  presentation: 'presentation',
  funnel: 'funnel',
  funnel_page: 'funnel',
  offer: 'offer',
  email: 'email',
  sequence: 'sequence',
  sequence_email: 'sequence',
  avatar: 'avatar',
  social_post: 'social-post',
  ad: 'ad',
  ad_campaign: 'ad-campaign',
  blog_post: 'blog-post',
  space_doc: 'visual-doc',
}

function textField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function resolveSpaceId(node: BrainMemory): string | undefined {
  if (node.space_id) return node.space_id
  return textField(node.retrieve_via?.data?.space_id)
}

export function resolveKnowledgeSourcePreviewProps(
  node: BrainMemory,
): Omit<ArtifactInlinePreviewCardProps, 'openPreviewOverride'> | null {
  const sourceType = node.knowledge_source_type ?? node.source_type
  const sourceId = node.source_id
  if (!sourceType || !sourceId) return null

  const artifactType = SOURCE_TYPE_TO_ARTIFACT[sourceType]
  if (!artifactType) return null

  if (artifactType === 'visual-doc' && !resolveSpaceId(node)) return null

  const metadata = node.metadata ?? {}
  let artifactId = sourceId
  let funnelPageId: string | undefined

  if (sourceType === 'funnel_page') {
    artifactId = node.parent_id ?? sourceId
    funnelPageId = sourceId
  } else if (sourceType === 'sequence_email') {
    artifactId = node.parent_id ?? sourceId
  }

  return {
    artifactType,
    artifactId,
    name: node.name ?? node.source_title ?? 'Source',
    spaceId: resolveSpaceId(node),
    funnelPageId,
    bodyPreview: textField(metadata.body) ?? textField(node.summary) ?? textField(node.content),
    emailSubject: textField(metadata.subject),
    imageUrl:
      textField(metadata.thumbnail_url) ??
      textField(metadata.image_url) ??
      textField(metadata.public_url) ??
      textField(metadata.url),
    subtitle: textField(node.summary),
  }
}

export function knowledgeSourceSupportsPreview(node: BrainMemory): boolean {
  const sourceType = node.knowledge_source_type ?? node.source_type
  if (sourceType === 'media_asset' && node.source_id) return true
  return resolveKnowledgeSourcePreviewProps(node) !== null
}
