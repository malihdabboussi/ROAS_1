import type {
  ArtifactPreviewSelection,
  ArtifactPreviewType,
} from '@/lib/artifacts/artifact-preview-types'

export function teamDmArtifactPreviewSelectionFromDetail(detail: {
  artifactType?: string
  artifactId?: string
  name?: string
}): ArtifactPreviewSelection | null {
  if (!detail.artifactType || !detail.artifactId) return null

  const title = detail.name ?? 'Artifact'
  const type = detail.artifactType as ArtifactPreviewType

  switch (type) {
    case 'offer':
    case 'funnel':
    case 'avatar':
    case 'sequence':
    case 'presentation':
    case 'ad':
    case 'email':
      return { type, id: detail.artifactId, title }
    case 'ad-campaign':
      return { type: 'ad_campaign', id: detail.artifactId, title }
    case 'social-post':
      return { type: 'social_post', id: detail.artifactId, title }
    case 'blog-post':
      return { type: 'website', id: detail.artifactId, title }
    case 'visual-doc':
      return { type: 'doc', id: detail.artifactId, title }
    default:
      return null
  }
}
