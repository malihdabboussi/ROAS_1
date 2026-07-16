const GLOBAL_CHAT_STORAGE_KEY = 'vibey.globalChat'

export type GlobalChatRailIntent = 'new' | 'list' | 'focus' | null

export type GlobalWorkSurface = 'general' | 'spaces' | 'brain' | 'team' | 'flows'

export interface GlobalWorkContext {
  surface: GlobalWorkSurface
  spaceId?: string | null
  campaignId?: string | null
  channelId?: string | null
  channelName?: string | null
  channelAwarenessContext?: string
  /** Active Brain scope id from /brain?scope=… (e.g. user, agent:atlas). */
  brainScopeId?: string | null
  brainId?: string | null
  brainScopeLabel?: string | null
  brainAwarenessContext?: string
  /** Manage Agents Ops Desk label for the work-context chip. */
  teamOpsLabel?: string | null
  /** Live team floor context injected when opening Vibey from Ops Desk. */
  teamOpsAwarenessContext?: string
}

export interface PersistedGlobalChat {
  collapsed?: boolean
  widthPercent?: number
  activeAgentKey?: string
  workContext?: GlobalWorkContext
  /** Surfaces where the user checked "Don't show this again" on the agent recommendation. */
  recDismissedSurfaces?: GlobalWorkSurface[]
}

export function readPersistedGlobalChat(): PersistedGlobalChat {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(GLOBAL_CHAT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedGlobalChat) : {}
  } catch {
    return {}
  }
}

export function writePersistedGlobalChat(patch: Partial<PersistedGlobalChat>) {
  if (typeof window === 'undefined') return
  try {
    const cur = readPersistedGlobalChat()
    window.localStorage.setItem(GLOBAL_CHAT_STORAGE_KEY, JSON.stringify({ ...cur, ...patch }))
  } catch {
    /* ignore */
  }
}

export function readRecDismissedSurfaces(): GlobalWorkSurface[] {
  return readPersistedGlobalChat().recDismissedSurfaces ?? []
}

export function addRecDismissedSurface(surface: GlobalWorkSurface): GlobalWorkSurface[] {
  const current = readRecDismissedSurfaces()
  if (current.includes(surface)) return current
  const next = [...current, surface]
  writePersistedGlobalChat({ recDismissedSurfaces: next })
  return next
}

export function readLegacySpacesChatCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem('vibey.spaces.nav')
    if (!raw) return false
    return (JSON.parse(raw) as { chatCollapsed?: boolean }).chatCollapsed === true
  } catch {
    return false
  }
}

export function readLegacySpacesChatWidth(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('vibey.spaces.nav')
    if (!raw) return null
    const w = (JSON.parse(raw) as { chatWidth?: number }).chatWidth
    return typeof w === 'number' && Number.isFinite(w) ? w : null
  } catch {
    return null
  }
}
