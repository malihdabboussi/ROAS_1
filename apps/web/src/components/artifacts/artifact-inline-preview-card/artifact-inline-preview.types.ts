import type { ArtifactPreviewType } from '@/lib/artifacts/artifact-preview-types'

export type { ArtifactPreviewType } from '@/lib/artifacts/artifact-preview-types'

export interface ArtifactInlinePreviewCardProps {
  artifactType: ArtifactPreviewType
  artifactId: string
  name: string
  subtitle?: string
  career?: string
  age?: string
  backgroundProfile?: string
  bodyPreview?: string
  emailSubject?: string
  funnelPageId?: string
  spaceId?: string
  imageUrl?: string
  videoUrl?: string
  status?: string
  /** Channel / embedded contexts: opens the caller's deliverable preview instead of the shell. */
  openPreviewOverride?: () => void
}
