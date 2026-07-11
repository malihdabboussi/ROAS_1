import type { GlobalChatSeedDetail } from '../store/use-global-chat-store'

export function globalChatSeedMatchesPanel(
  seed: GlobalChatSeedDetail,
  panelSpaceId: string | undefined,
): boolean {
  const targetSpaceId = seed.workContext?.spaceId?.trim() || null
  if (targetSpaceId) return targetSpaceId === panelSpaceId
  if (seed.workContext?.surface === 'spaces') return false
  return !panelSpaceId
}
