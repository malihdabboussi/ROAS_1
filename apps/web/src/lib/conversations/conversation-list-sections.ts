import { getConversationLastActivityAt } from './conversation-last-activity'
import type { Conversation } from './conversation.types'

export interface ConversationAgentDisplay {
  name: string
  avatarUrl: string | null
}

export type ConversationSection =
  | 'pinned'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'older'
  | 'archived'

export const SECTION_ORDER: ConversationSection[] = [
  'pinned',
  'today',
  'yesterday',
  'last7',
  'last30',
  'older',
  'archived',
]

export const SECTION_LABEL: Record<ConversationSection, string> = {
  pinned: 'Pinned',
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  older: 'Older',
  archived: 'Archived',
}

const DEFAULT_CONVERSATION_AGENT_KEY = 'vibey'

export function getConversationAgentKey(conversation: Conversation): string {
  const agentKey = conversation.agent_id?.trim()
  return agentKey && agentKey.length > 0 ? agentKey : DEFAULT_CONVERSATION_AGENT_KEY
}

export function getConversationAgentDisplay(
  conversation: Conversation,
  agentByKey?: Record<string, ConversationAgentDisplay>,
): ConversationAgentDisplay {
  const agentKey = getConversationAgentKey(conversation)
  return agentByKey?.[agentKey] ?? { name: agentKey, avatarUrl: null }
}

export function getAgentInitial(name: string): string {
  const trimmed = name.trim()
  return (trimmed[0] ?? '?').toUpperCase()
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

export function isConversationPinned(conversation: Conversation): boolean {
  const metadata = conversation.metadata
  if (!metadata || typeof metadata !== 'object') return false
  return (metadata as { pinned?: unknown }).pinned === true
}

export function withConversationPinned(conversation: Conversation, pinned: boolean): Conversation {
  return {
    ...conversation,
    metadata: { ...conversation.metadata, pinned },
  }
}

export function isConversationArchived(conversation: Conversation): boolean {
  return conversation.status === 'archived'
}

export function getConversationSection(updatedAtIso: string, pinned: boolean): ConversationSection {
  if (pinned) return 'pinned'
  const updatedAt = new Date(updatedAtIso)
  if (Number.isNaN(updatedAt.getTime())) return 'older'
  const todayStart = startOfLocalDay(new Date())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const sevenDaysAgoStart = new Date(todayStart)
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7)
  const thirtyDaysAgoStart = new Date(todayStart)
  thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 30)

  if (updatedAt >= todayStart) return 'today'
  if (updatedAt >= yesterdayStart) return 'yesterday'
  if (updatedAt >= sevenDaysAgoStart) return 'last7'
  if (updatedAt >= thirtyDaysAgoStart) return 'last30'
  return 'older'
}

export function groupConversationsBySection(
  conversations: Conversation[],
): Record<ConversationSection, Conversation[]> {
  const grouped: Record<ConversationSection, Conversation[]> = {
    pinned: [],
    today: [],
    yesterday: [],
    last7: [],
    last30: [],
    older: [],
    archived: [],
  }
  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(getConversationLastActivityAt(b)).getTime() -
      new Date(getConversationLastActivityAt(a)).getTime(),
  )
  for (const conversation of sorted) {
    if (isConversationArchived(conversation)) {
      grouped.archived.push(conversation)
      continue
    }
    const section = getConversationSection(
      getConversationLastActivityAt(conversation),
      isConversationPinned(conversation),
    )
    grouped[section].push(conversation)
  }
  return grouped
}
