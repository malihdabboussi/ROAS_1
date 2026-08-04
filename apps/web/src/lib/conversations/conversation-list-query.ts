import { getConversationLastActivityAt } from './conversation-last-activity'
import {
  getConversationAgentKey,
  getConversationSection,
  isConversationArchived,
  isConversationPinned,
} from './conversation-list-sections'
import type { Conversation } from './conversation.types'

export type ChatHistoryStatusFilter = 'all' | 'active' | 'archived'
export type ChatHistoryActivityFilter = 'all' | '1d' | '3d' | '7d' | '30d'
export type ChatHistoryTypeFilter = 'all' | 'in_app' | 'slack' | 'telegram'
export type ChatHistoryGroupBy = 'none' | 'date' | 'status' | 'campaign' | 'agent' | 'channel'
/** What each conversation row shows on the left. */
export type ChatHistoryLeadingIcon = 'agent' | 'logo' | 'status' | 'none'

export interface ChatHistoryFilterState {
  status: ChatHistoryStatusFilter
  lastActivity: ChatHistoryActivityFilter
  type: ChatHistoryTypeFilter
  groupBy: ChatHistoryGroupBy
  leadingIcon: ChatHistoryLeadingIcon
}

export const DEFAULT_CHAT_HISTORY_FILTERS: ChatHistoryFilterState = {
  status: 'active',
  lastActivity: 'all',
  type: 'all',
  groupBy: 'none',
  leadingIcon: 'none',
}

export interface ConversationListGroup {
  id: string
  label: string
  items: Conversation[]
}

export interface ConversationListGroupOptions {
  groupBy: ChatHistoryGroupBy
  agentNameByKey?: Record<string, string>
  campaignNameById?: Record<string, string>
  /** Cap for campaign/agent/channel sections before remaining rows fall into Other. */
  softCap?: number
  now?: Date
}

const MS_DAY = 24 * 60 * 60 * 1000

export function getConversationChannel(conversation: Conversation): ChatHistoryTypeFilter {
  const source = conversation.metadata?.source
  if (source === 'slack') return 'slack'
  if (source === 'telegram') return 'telegram'
  return 'in_app'
}

export function matchesChatHistoryFilters(
  conversation: Conversation,
  filters: ChatHistoryFilterState,
  now: Date = new Date(),
): boolean {
  if (filters.status === 'active' && isConversationArchived(conversation)) return false
  if (filters.status === 'archived' && !isConversationArchived(conversation)) return false

  if (filters.type !== 'all' && getConversationChannel(conversation) !== filters.type) {
    return false
  }

  if (filters.lastActivity !== 'all') {
    const activityAt = new Date(getConversationLastActivityAt(conversation)).getTime()
    if (Number.isNaN(activityAt)) return false
    const days = Number(filters.lastActivity.replace('d', ''))
    if (now.getTime() - activityAt > days * MS_DAY) return false
  }

  return true
}

export function filterConversationsForHistory(
  conversations: Conversation[],
  filters: ChatHistoryFilterState,
  now: Date = new Date(),
): Conversation[] {
  return conversations.filter((conversation) =>
    matchesChatHistoryFilters(conversation, filters, now),
  )
}

function sortNewestFirst(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (a, b) =>
      new Date(getConversationLastActivityAt(b)).getTime() -
      new Date(getConversationLastActivityAt(a)).getTime(),
  )
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

function localDayKey(iso: string, now: Date): string {
  const updatedAt = new Date(iso)
  if (Number.isNaN(updatedAt.getTime())) return 'unknown'
  const day = startOfLocalDay(updatedAt)
  const today = startOfLocalDay(now)
  const diffDays = Math.round((today.getTime() - day.getTime()) / MS_DAY)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function localDayLabel(key: string, now: Date): string {
  if (key === 'today') return 'Today'
  if (key === 'yesterday') return 'Yesterday'
  if (key === 'unknown') return 'Older'
  const parts = key.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (y == null || m == null || d == null) return 'Older'
  const date = new Date(y, m - 1, d)
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function pushIntoMap(map: Map<string, Conversation[]>, key: string, conversation: Conversation) {
  const list = map.get(key)
  if (list) list.push(conversation)
  else map.set(key, [conversation])
}

function groupsFromMap(
  map: Map<string, Conversation[]>,
  labelFor: (key: string) => string,
  options?: { softCap?: number; otherKey?: string; otherLabel?: string },
): ConversationListGroup[] {
  const softCap = options?.softCap
  const otherKey = options?.otherKey ?? 'other'
  const otherLabel = options?.otherLabel ?? 'Other'
  const groups: ConversationListGroup[] = []
  const overflow: Conversation[] = []

  for (const [key, items] of map) {
    if (key === otherKey) {
      overflow.push(...items)
      continue
    }
    const sorted = sortNewestFirst(items)
    if (softCap != null && sorted.length > softCap) {
      groups.push({ id: key, label: labelFor(key), items: sorted.slice(0, softCap) })
      overflow.push(...sorted.slice(softCap))
    } else {
      groups.push({ id: key, label: labelFor(key), items: sorted })
    }
  }

  if (overflow.length > 0) {
    groups.push({
      id: otherKey,
      label: otherLabel,
      items: sortNewestFirst(overflow),
    })
  }

  return groups
}

function groupByDate(conversations: Conversation[], now: Date): ConversationListGroup[] {
  const map = new Map<string, Conversation[]>()
  for (const conversation of sortNewestFirst(conversations)) {
    pushIntoMap(map, localDayKey(getConversationLastActivityAt(conversation), now), conversation)
  }
  // Preserve newest-day-first order from sorted iteration.
  const order: string[] = []
  for (const key of map.keys()) order.push(key)
  return order.map((key) => ({
    id: key,
    label: localDayLabel(key, now),
    items: map.get(key) ?? [],
  }))
}

function groupByLegacyDateBuckets(conversations: Conversation[]): ConversationListGroup[] {
  // Kept for callers that still want Pinned/Today/Last 7 Days buckets.
  const buckets = new Map<string, Conversation[]>()
  for (const conversation of sortNewestFirst(conversations)) {
    if (isConversationArchived(conversation)) {
      pushIntoMap(buckets, 'archived', conversation)
      continue
    }
    const section = getConversationSection(
      getConversationLastActivityAt(conversation),
      isConversationPinned(conversation),
    )
    pushIntoMap(buckets, section, conversation)
  }
  const labels: Record<string, string> = {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
    older: 'Older',
    archived: 'Archived',
  }
  const order = ['pinned', 'today', 'yesterday', 'last7', 'last30', 'older', 'archived']
  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({ id, label: labels[id] ?? id, items: buckets.get(id) ?? [] }))
}

function resolveStatusGroupId(conversation: Conversation, runtimePhase?: string | null): string {
  if (isConversationArchived(conversation)) return 'completed'
  if (runtimePhase === 'thinking' || runtimePhase === 'executing' || runtimePhase === 'streaming') {
    return 'working'
  }
  if (runtimePhase === 'complete') return 'completed'
  if (runtimePhase === 'idle') return 'idle'
  return 'ready'
}

export function groupConversationsForHistory(
  conversations: Conversation[],
  options: ConversationListGroupOptions & {
    runtimePhaseById?: Record<string, string | null | undefined>
  },
): ConversationListGroup[] {
  const now = options.now ?? new Date()
  const softCap = options.softCap ?? 5
  const sorted = sortNewestFirst(conversations)

  if (options.groupBy === 'none') {
    return sorted.length > 0 ? [{ id: 'all', label: '', items: sorted }] : []
  }

  if (options.groupBy === 'date') {
    return groupByDate(sorted, now)
  }

  if (options.groupBy === 'status') {
    const map = new Map<string, Conversation[]>()
    for (const conversation of sorted) {
      const phase = options.runtimePhaseById?.[conversation.id]
      pushIntoMap(map, resolveStatusGroupId(conversation, phase), conversation)
    }
    const labels: Record<string, string> = {
      working: 'Working',
      ready: 'Ready',
      completed: 'Completed',
      idle: 'Idle',
    }
    const order = ['working', 'ready', 'completed', 'idle']
    return order
      .filter((id) => (map.get(id)?.length ?? 0) > 0)
      .map((id) => ({ id, label: labels[id] ?? id, items: map.get(id) ?? [] }))
  }

  if (options.groupBy === 'campaign') {
    const map = new Map<string, Conversation[]>()
    for (const conversation of sorted) {
      const key = conversation.campaign_id?.trim() || 'other'
      pushIntoMap(map, key, conversation)
    }
    return groupsFromMap(
      map,
      (key) => (key === 'other' ? 'Other' : (options.campaignNameById?.[key] ?? 'Campaign')),
      { softCap, otherLabel: 'Other' },
    )
  }

  if (options.groupBy === 'agent') {
    const map = new Map<string, Conversation[]>()
    for (const conversation of sorted) {
      pushIntoMap(map, getConversationAgentKey(conversation), conversation)
    }
    return groupsFromMap(map, (key) => options.agentNameByKey?.[key] ?? key, {
      softCap,
      otherLabel: 'Other',
    })
  }

  if (options.groupBy === 'channel') {
    const map = new Map<string, Conversation[]>()
    for (const conversation of sorted) {
      pushIntoMap(map, getConversationChannel(conversation), conversation)
    }
    const labels: Record<string, string> = {
      in_app: 'In-app',
      slack: 'Slack',
      telegram: 'Telegram',
    }
    return groupsFromMap(map, (key) => labels[key] ?? key, { softCap, otherLabel: 'Other' })
  }

  return groupByLegacyDateBuckets(sorted)
}

export function chatHistoryStatusLabel(value: ChatHistoryStatusFilter): string {
  if (value === 'all') return 'All'
  if (value === 'archived') return 'Archived'
  return 'Active'
}

export function chatHistoryActivityLabel(value: ChatHistoryActivityFilter): string {
  if (value === 'all') return 'All'
  return value
}

export function chatHistoryTypeLabel(value: ChatHistoryTypeFilter): string {
  if (value === 'all') return 'All'
  if (value === 'slack') return 'Slack'
  if (value === 'telegram') return 'Telegram'
  return 'In-app'
}

export function chatHistoryGroupByLabel(value: ChatHistoryGroupBy): string {
  switch (value) {
    case 'none':
      return 'None'
    case 'date':
      return 'Date'
    case 'status':
      return 'Status'
    case 'campaign':
      return 'Campaign'
    case 'agent':
      return 'Agent'
    case 'channel':
      return 'Channel'
  }
}

export function chatHistoryLeadingIconLabel(value: ChatHistoryLeadingIcon): string {
  switch (value) {
    case 'agent':
      return 'Agent'
    case 'logo':
      return 'Logo'
    case 'status':
      return 'Status'
    case 'none':
      return 'None'
  }
}
