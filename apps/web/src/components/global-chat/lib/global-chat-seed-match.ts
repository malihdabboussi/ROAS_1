import type { GlobalChatSeedDetail } from '../store/use-global-chat-store'

export function globalChatSeedMatchesPanel(
  seed: GlobalChatSeedDetail,
  panelSpaceId: string | undefined,
): boolean {
  const targetSpaceId = seed.workContext?.spaceId?.trim() || null
  if (targetSpaceId) return targetSpaceId === panelSpaceId
  // Campaign-only spaces attach (no space yet) belongs on the no-space panel.
  if (seed.workContext?.surface === 'spaces') return !panelSpaceId
  return !panelSpaceId
}

export function normalizeGlobalChatSeed(
  seed: GlobalChatSeedDetail,
  panelSpaceId: string | undefined,
): {
  content: string
  documents: unknown[] | undefined
  references: unknown[] | undefined
  isAttach: boolean
  seedKey: string
} | null {
  const content = seed.content?.trim() ?? ''
  const documents = seed.documents
  const references = seed.references
  const isAttach = seed.seedMode === 'attach'
  if (!isAttach && !content) return null
  if (isAttach && !content && !documents?.length && !references?.length) return null
  const referenceKey =
    references
      ?.map((reference) => {
        if (!reference || typeof reference !== 'object') return ''
        const row = reference as { kind?: unknown; id?: unknown; type?: unknown }
        return `${String(row.kind ?? '')}:${String(row.id ?? '')}:${String(row.type ?? '')}`
      })
      .join(',') ?? ''
  const documentKey = documents
    ?.map((document) => {
      if (!document || typeof document !== 'object') return ''
      const row = document as { mediaAssetId?: unknown; fileUrl?: unknown }
      return String(row.mediaAssetId ?? row.fileUrl ?? '')
    })
    .join(',')
  return {
    content,
    documents,
    references,
    isAttach,
    seedKey: `${panelSpaceId ?? 'general'}:${seed.seedMode ?? 'send'}:${seed.conversationId ?? ''}:${content}:${documentKey ?? ''}:${referenceKey}`,
  }
}

/**
 * True while a queued SEND seed for this panel has not been applied yet. The empty-chat
 * agent hero must not render during that window — after a Home submit it flashes a
 * half-loaded agent identity for the length of the conversation-create round trip.
 */
export function isPendingSendSeedForPanel(
  seed: GlobalChatSeedDetail | null,
  panelSpaceId: string | undefined,
): boolean {
  if (!seed || seed.seedMode === 'attach') return false
  if (!seed.content?.trim()) return false
  return globalChatSeedMatchesPanel(seed, panelSpaceId)
}
