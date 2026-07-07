import type { DeliverableType } from './channel-deliverables'

export type TimeFilter = 'any' | 'today' | '7d' | '30d'
export type SubMenu = 'type' | 'time' | 'source' | 'campaign' | 'from' | null

export interface FilterState {
  types: Set<DeliverableType>
  time: TimeFilter
  senders: Set<string>
  threadId: string | null
  campaigns: Set<string>
}

export const TYPE_OPTIONS: { value: DeliverableType; label: string }[] = [
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'artifact', label: 'Artifacts' },
  { value: 'other', label: 'Other files' },
]

export const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

export function summaryForMenu(
  menu: SubMenu,
  state: FilterState,
  threadFilterId?: string | null,
  senderMap?: Map<string, string>,
  campaignMap?: Map<string, string>,
): string | null {
  if (menu === 'type' && state.types.size > 0) {
    const labels = TYPE_OPTIONS.filter((o) => state.types.has(o.value)).map((o) => o.label)
    return labels.join(', ')
  }
  if (menu === 'time' && state.time !== 'any') {
    return TIME_OPTIONS.find((o) => o.value === state.time)?.label ?? null
  }
  if (menu === 'source' && (state.threadId || threadFilterId)) return 'Filtered'
  if (menu === 'campaign' && state.campaigns.size > 0) {
    const labels = [...state.campaigns].map((id) => campaignMap?.get(id) ?? id)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.length} selected`
  }
  if (menu === 'from' && state.senders.size > 0) {
    const labels = [...state.senders].map((id) => senderMap?.get(id) ?? id)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.length} selected`
  }
  return null
}

export function timeFilterMs(tf: TimeFilter): number {
  if (tf === 'today') {
    const now = new Date()
    return now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  }
  if (tf === '7d') return 7 * 86_400_000
  if (tf === '30d') return 30 * 86_400_000
  return 0
}
