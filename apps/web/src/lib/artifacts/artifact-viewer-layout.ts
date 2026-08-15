export const ARTIFACT_VIEWER_WIDTH_MIN = 420
export const ARTIFACT_VIEWER_WIDTH_DEFAULT = 880
/** Pre-editor default that should be treated as unset on hydrate. */
export const ARTIFACT_VIEWER_LEGACY_DEFAULT = 480

const WIDE_EDITOR_TYPES = new Set([
  'doc',
  'visual_doc',
  'custom_object',
  'presentation',
  'funnel',
  'website',
  'form',
])

export function preferredArtifactViewerWidth(type: string): number {
  if (WIDE_EDITOR_TYPES.has(type)) return 960
  if (type === 'image' || type === 'video' || type === 'audio') return 720
  return ARTIFACT_VIEWER_WIDTH_DEFAULT
}

export function clampArtifactViewerWidth(width: number, containerWidth?: number): number {
  const floored = Math.max(ARTIFACT_VIEWER_WIDTH_MIN, width)
  if (!containerWidth) return floored
  return Math.min(floored, Math.max(ARTIFACT_VIEWER_WIDTH_MIN, containerWidth))
}

export function resolvePersistedArtifactViewerWidth(persistedWidth?: number): number {
  if (!persistedWidth || persistedWidth <= ARTIFACT_VIEWER_LEGACY_DEFAULT) {
    return clampArtifactViewerWidth(ARTIFACT_VIEWER_WIDTH_DEFAULT)
  }
  return clampArtifactViewerWidth(persistedWidth)
}

export function hydrateArtifactViewerWidth(persistedWidth?: number): number {
  return resolvePersistedArtifactViewerWidth(persistedWidth)
}

export function resolveOpenedArtifactViewerWidth(currentWidth: number, type: string): number {
  return clampArtifactViewerWidth(Math.max(currentWidth, preferredArtifactViewerWidth(type)))
}
