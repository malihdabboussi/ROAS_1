const HR_STORAGE_KEY = 'vibey.team.hrSideChat'
const ATLAS_STORAGE_KEY = 'vibey.brain.atlasSideChat'
const LOOP_STORAGE_KEY = 'vibey.flows.loopSideChat'
const LOOP_CONVERSATION_KEY_PREFIX = 'vibey.flows.loopConversation'

interface PersistedAgentSideChat {
  chatWidth?: number
  chatCollapsed?: boolean
  activeConversationId?: string | null
}

function read(storageKey = HR_STORAGE_KEY): PersistedAgentSideChat {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as PersistedAgentSideChat) : {}
  } catch {
    return {}
  }
}

function write(patch: Partial<PersistedAgentSideChat>, storageKey = HR_STORAGE_KEY) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...read(storageKey), ...patch }))
  } catch {
    /* ignore */
  }
}

export function readStoredTeamHrChatWidth(): number | null {
  const width = read().chatWidth
  return typeof width === 'number' && Number.isFinite(width) ? width : null
}

export function persistTeamHrChatWidth(width: number) {
  write({ chatWidth: width })
}

export function readStoredTeamHrChatCollapsed(): boolean {
  return read().chatCollapsed === true
}

export function persistTeamHrChatCollapsed(collapsed: boolean) {
  write({ chatCollapsed: collapsed })
}

export function readStoredTeamHrConversationId(): string | null {
  const id = read().activeConversationId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function persistTeamHrConversationId(conversationId: string | null) {
  write({ activeConversationId: conversationId })
}

export function readStoredAtlasChatWidth(): number | null {
  const width = read(ATLAS_STORAGE_KEY).chatWidth
  return typeof width === 'number' && Number.isFinite(width) ? width : null
}

export function persistAtlasChatWidth(width: number) {
  write({ chatWidth: width }, ATLAS_STORAGE_KEY)
}

export function readStoredAtlasChatCollapsed(): boolean {
  return read(ATLAS_STORAGE_KEY).chatCollapsed === true
}

export function persistAtlasChatCollapsed(collapsed: boolean) {
  write({ chatCollapsed: collapsed }, ATLAS_STORAGE_KEY)
}

export function readStoredAtlasConversationId(): string | null {
  const id = read(ATLAS_STORAGE_KEY).activeConversationId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function persistAtlasConversationId(conversationId: string | null) {
  write({ activeConversationId: conversationId }, ATLAS_STORAGE_KEY)
}

function loopConversationStorageKey(spaceId: string): string {
  return `${LOOP_CONVERSATION_KEY_PREFIX}.${spaceId}`
}

export function readStoredLoopChatWidth(): number | null {
  const width = read(LOOP_STORAGE_KEY).chatWidth
  return typeof width === 'number' && Number.isFinite(width) ? width : null
}

export function persistLoopChatWidth(width: number) {
  write({ chatWidth: width }, LOOP_STORAGE_KEY)
}

export function readStoredLoopChatCollapsed(): boolean {
  return read(LOOP_STORAGE_KEY).chatCollapsed === true
}

export function persistLoopChatCollapsed(collapsed: boolean) {
  write({ chatCollapsed: collapsed }, LOOP_STORAGE_KEY)
}

export function readStoredLoopConversationId(spaceId: string): string | null {
  if (!spaceId) return null
  const id = read(loopConversationStorageKey(spaceId)).activeConversationId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function persistLoopConversationId(spaceId: string, conversationId: string | null) {
  if (!spaceId) return
  write({ activeConversationId: conversationId }, loopConversationStorageKey(spaceId))
}
