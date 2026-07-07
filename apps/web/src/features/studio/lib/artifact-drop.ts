import type { AttachedArtifact } from '../components/chat/ArtifactAttachments'
import type { MessageReference } from '../types'

/**
 * Applies an artifact drop to the composer stores. All artifact types become a
 * chip; contact conversations ALSO become a message reference — only
 * references are resolved server-side into agent context (chips alone are not).
 */
export function applyArtifactDrop(
  artifact: AttachedArtifact,
  stores: { artifacts: AttachedArtifact[]; references: MessageReference[] },
): { artifacts: AttachedArtifact[]; references: MessageReference[] } {
  const artifacts = stores.artifacts.some((a) => a.id === artifact.id)
    ? stores.artifacts
    : [...stores.artifacts, artifact]

  let references = stores.references
  if (artifact.type === 'contact-conversation') {
    const exists = references.some((r) => r.kind === 'conversation' && r.id === artifact.id)
    if (!exists) {
      references = [...references, { kind: 'conversation', id: artifact.id, label: artifact.label }]
    }
  }

  return { artifacts, references }
}
