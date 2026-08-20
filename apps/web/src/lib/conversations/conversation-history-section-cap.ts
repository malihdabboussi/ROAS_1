import type { ChatHistoryGroupBy } from './conversation-list-query'

export const CONVERSATION_HISTORY_SECTION_INITIAL = 6
export const CONVERSATION_HISTORY_SECTION_INCREMENT = 6

export function conversationHistorySectionCap(input: {
  groupBy: ChatHistoryGroupBy
  splitPinned: boolean
  visibleRows: Partial<Record<string, number>>
  sectionId: string
  total: number
}): number {
  if (input.groupBy === 'none' || input.groupBy === 'client' || input.splitPinned) {
    return input.total
  }
  const cap = input.visibleRows[input.sectionId] ?? CONVERSATION_HISTORY_SECTION_INITIAL
  return Math.min(Math.max(cap, 0), input.total)
}

export function conversationHistoryRowShowsSubtitle(
  sectionId: string,
  groupBy: ChatHistoryGroupBy,
): boolean {
  return (
    sectionId === 'today' ||
    sectionId === 'pinned' ||
    sectionId === 'recents' ||
    groupBy === 'none' ||
    groupBy === 'client'
  )
}

export function conversationHistoryAgentNameByKey(
  agentByKey?: Record<string, { name: string }>,
): Record<string, string> {
  const agentNameByKey: Record<string, string> = {}
  if (!agentByKey) return agentNameByKey
  for (const [key, value] of Object.entries(agentByKey)) {
    agentNameByKey[key] = value.name
  }
  return agentNameByKey
}

export function conversationHistoryRuntimePhaseById(
  conversationRuntimeById?: Partial<Record<string, { phase?: string | null }>>,
): Record<string, string | null | undefined> {
  const runtimePhaseById: Record<string, string | null | undefined> = {}
  if (!conversationRuntimeById) return runtimePhaseById
  for (const [id, runtime] of Object.entries(conversationRuntimeById)) {
    runtimePhaseById[id] = runtime?.phase
  }
  return runtimePhaseById
}

export function conversationHistoryShowMoreVisibleRows(
  prev: Partial<Record<string, number>>,
  section: string,
): Partial<Record<string, number>> {
  const cur = prev[section] ?? CONVERSATION_HISTORY_SECTION_INITIAL
  return { ...prev, [section]: cur + CONVERSATION_HISTORY_SECTION_INCREMENT }
}
