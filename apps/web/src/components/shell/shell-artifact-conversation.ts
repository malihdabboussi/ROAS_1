import type { ShellArtifactViewerTarget } from '@/lib/artifacts'

const LAST_ARTIFACT_MAP_LIMIT = 40

export function stampArtifactConversation(
  target: ShellArtifactViewerTarget,
  conversationId: string | null | undefined,
): ShellArtifactViewerTarget {
  const id = typeof conversationId === 'string' ? conversationId.trim() : ''
  if (!id) return target
  if (target.conversationId === id) return target
  return { ...target, conversationId: id }
}

export function sanitizeLastArtifactByConversation(
  value: unknown,
): Record<string, ShellArtifactViewerTarget> {
  if (!value || typeof value !== 'object') return {}
  const next: Record<string, ShellArtifactViewerTarget> = {}
  for (const [conversationId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!conversationId.trim()) continue
    const target = sanitizeArtifactTarget(raw)
    if (!target) continue
    next[conversationId] = stampArtifactConversation(target, conversationId)
  }
  return next
}

export function upsertLastArtifactByConversation(
  map: Record<string, ShellArtifactViewerTarget>,
  conversationId: string,
  target: ShellArtifactViewerTarget,
): Record<string, ShellArtifactViewerTarget> {
  const stamped = stampArtifactConversation(target, conversationId)
  const without = Object.fromEntries(Object.entries(map).filter(([key]) => key !== conversationId))
  return {
    [conversationId]: stamped,
    ...without,
  }
}

export function removeLastArtifactByConversation(
  map: Record<string, ShellArtifactViewerTarget>,
  conversationId: string | null | undefined,
): Record<string, ShellArtifactViewerTarget> {
  const id = typeof conversationId === 'string' ? conversationId.trim() : ''
  if (!id || !(id in map)) return map
  const next = { ...map }
  delete next[id]
  return next
}

export function trimLastArtifactByConversation(
  map: Record<string, ShellArtifactViewerTarget>,
): Record<string, ShellArtifactViewerTarget> {
  const entries = Object.entries(map)
  if (entries.length <= LAST_ARTIFACT_MAP_LIMIT) return map
  return Object.fromEntries(entries.slice(0, LAST_ARTIFACT_MAP_LIMIT))
}

/**
 * Chat-switch contract:
 * - pinned → keep the current artifact
 * - otherwise restore that chat's last artifact, or close when none
 */
export function resolveArtifactForConversationChange(input: {
  artifactPinned: boolean
  currentTarget: ShellArtifactViewerTarget | null
  lastArtifactByConversation: Record<string, ShellArtifactViewerTarget>
  nextConversationId: string | null
}): ShellArtifactViewerTarget | null {
  if (input.artifactPinned) return input.currentTarget
  const nextId = typeof input.nextConversationId === 'string' ? input.nextConversationId.trim() : ''
  if (!nextId) return null
  return input.lastArtifactByConversation[nextId] ?? null
}

function sanitizeArtifactTarget(value: unknown): ShellArtifactViewerTarget | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ShellArtifactViewerTarget>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.type !== 'string'
  ) {
    return null
  }
  return candidate as ShellArtifactViewerTarget
}
