import type {
  TeamOverviewAgent,
  TeamOverviewLiveItem,
  TeamOverviewRecentItem,
} from '../../services/team-overview.service'

export const RECENT_ACTIVITY_INITIAL = 10
export const RECENT_ACTIVITY_PAGE = 10

export const CHART_HEIGHT_SM = 64
export const CHART_HEIGHT_MD = 160

export const CHART_LABEL = {
  green: 'var(--chart-glass-label-green)',
  blue: 'var(--chart-glass-label-blue)',
  purple: 'var(--chart-glass-label-purple)',
  orange: 'var(--chart-glass-label-orange)',
  red: 'var(--chart-glass-label-red)',
  gold: 'var(--chart-glass-label-gold)',
} as const

export const ROLE = {
  done: CHART_LABEL.green,
  active: CHART_LABEL.blue,
  blocked: CHART_LABEL.red,
  failed: CHART_LABEL.red,
  task: CHART_LABEL.green,
  mission: CHART_LABEL.blue,
  trace: CHART_LABEL.purple,
  channel: CHART_LABEL.purple,
  delegation: CHART_LABEL.gold,
  automation: CHART_LABEL.gold,
  warning: CHART_LABEL.orange,
  info: CHART_LABEL.blue,
  muted: 'var(--color-muted-foreground)',
} as const

export const FEED_DOT_CLASS: Record<TeamOverviewLiveItem['kind'] | TeamOverviewRecentItem['kind'], string> = {
  mission: 'indicator-dot-glass-blue',
  task: 'indicator-dot-glass-green',
  trace: 'indicator-dot-glass-purple',
  delegation: 'indicator-dot-glass-gold',
  chat: 'indicator-dot-glass-blue',
  channel: 'indicator-dot-glass-purple',
  automation: 'indicator-dot-glass-gold',
}

export function filterOverviewLiveItems(
  items: TeamOverviewLiveItem[],
  campaignFilterIds: string[],
  spaceFilterIds: string[],
  missionCampaignById: Map<string, string | null>,
): TeamOverviewLiveItem[] {
  const hasC = campaignFilterIds.length > 0
  const hasS = spaceFilterIds.length > 0
  const spaceSet = new Set(spaceFilterIds)
  const campaignSet = new Set(campaignFilterIds)

  if (!hasC && !hasS) return items

  if (!hasC && hasS) {
    return items.filter((item) => item.kind === 'task' && spaceSet.has(item.space_id))
  }

  if (hasC && !hasS) {
    return items.filter((item) => {
      if (item.kind !== 'mission') return false
      const cid = missionCampaignById.get(item.id)
      return !!cid && campaignSet.has(cid)
    })
  }

  return items.filter((item) => {
    if (item.kind === 'mission') {
      const cid = missionCampaignById.get(item.id)
      return !!cid && campaignSet.has(cid)
    }
    if (item.kind === 'task') return spaceSet.has(item.space_id)
    return false
  })
}

export function filterOverviewRecentItems(
  items: TeamOverviewRecentItem[],
  campaignFilterIds: string[],
  spaceFilterIds: string[],
  missionCampaignById: Map<string, string | null>,
): TeamOverviewRecentItem[] {
  const hasC = campaignFilterIds.length > 0
  const hasS = spaceFilterIds.length > 0
  const spaceSet = new Set(spaceFilterIds)
  const campaignSet = new Set(campaignFilterIds)

  if (!hasC && !hasS) return items

  if (!hasC && hasS) {
    return items.filter((item) => item.kind === 'automation' && spaceSet.has(item.space_id))
  }

  if (hasC && !hasS) {
    return items.filter((item) => {
      if (item.kind !== 'mission') return false
      const cid = missionCampaignById.get(item.id)
      return !!cid && campaignSet.has(cid)
    })
  }

  return items.filter((item) => {
    if (item.kind === 'mission') {
      const cid = missionCampaignById.get(item.id)
      return !!cid && campaignSet.has(cid)
    }
    if (item.kind === 'automation') return spaceSet.has(item.space_id)
    return false
  })
}

export function startOfTodayIso(): string {
  return new Date().toISOString()
}

export function toIsoStart(d: string | undefined): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T00:00:00.000Z`).toISOString()
}

export function toIsoEnd(d: string | undefined): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T23:59:59.999Z`).toISOString()
}

export function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function deltaLabel(
  curr: number,
  prev: number,
): {
  text: string
  tone: 'up' | 'down' | 'flat'
} {
  if (prev === 0 && curr === 0) return { text: '-', tone: 'flat' }
  if (prev === 0) return { text: `+${curr}`, tone: 'up' }
  const diff = curr - prev
  if (diff === 0) return { text: '0%', tone: 'flat' }
  const sign = diff > 0 ? '+' : ''
  const ratio = Math.round((diff / prev) * 100)
  return { text: `${sign}${ratio}%`, tone: diff > 0 ? 'up' : 'down' }
}

export function liveItemTime(item: TeamOverviewLiveItem): string {
  return item.happened_at
}

export function recentItemTime(item: TeamOverviewRecentItem): string {
  return item.happened_at
}

export function liveItemAgentKey(item: TeamOverviewLiveItem): string | null {
  switch (item.kind) {
    case 'mission':
      return item.current_agent_key ?? item.assigned_agent_key
    case 'task':
    case 'trace':
      return item.agent_key
    case 'delegation':
      return item.target_agent_key
  }
}

export function recentItemAgentKey(item: TeamOverviewRecentItem): string | null {
  switch (item.kind) {
    case 'mission':
      return item.current_agent_key ?? item.assigned_agent_key
    case 'chat':
    case 'channel':
      return item.agent_key
    case 'automation':
      return null
  }
}

export function liveItemHref(item: TeamOverviewLiveItem): string | null {
  switch (item.kind) {
    case 'mission':
      return `/mission-control?mission=${encodeURIComponent(item.id)}`
    case 'task':
      return item.space_id
        ? `/spaces?space=${encodeURIComponent(item.space_id)}&item=${encodeURIComponent(item.id)}`
        : null
    case 'trace':
      return item.agent_key ? `/team?agent=${encodeURIComponent(item.agent_key)}` : null
    case 'delegation':
      return `/team?agent=${encodeURIComponent(item.target_agent_key)}`
  }
}

export function recentItemHref(item: TeamOverviewRecentItem): string | null {
  switch (item.kind) {
    case 'mission':
    case 'chat':
      return null
    case 'channel':
      return `/home/channels/${encodeURIComponent(item.channel_id)}`
    case 'automation':
      return item.space_id ? `/spaces?space=${encodeURIComponent(item.space_id)}` : null
  }
}

export function liveTitle(item: TeamOverviewLiveItem): string {
  switch (item.kind) {
    case 'mission':
    case 'task':
      return item.title
    case 'trace':
      return item.conversation_title ?? 'Streaming reply'
    case 'delegation':
      return item.prompt_preview ?? `${item.caller_agent_key} -> ${item.target_agent_key}`
  }
}

export function liveContext(item: TeamOverviewLiveItem, agent: TeamOverviewAgent | undefined): string {
  switch (item.kind) {
    case 'mission':
      return `Mission · ${agent?.name ?? 'Agent'}`
    case 'task':
      return `Task · ${item.space_title ?? 'Space'} · ${agent?.name ?? 'Agent'}`
    case 'trace':
      return `Chat · ${item.channel ?? 'Conversation'} · ${agent?.name ?? 'Agent'}`
    case 'delegation':
      return `Delegation · ${item.caller_agent_key} -> ${item.target_agent_key}`
  }
}

export function recentTitle(item: TeamOverviewRecentItem): string {
  switch (item.kind) {
    case 'mission':
      return item.title
    case 'chat':
      return item.conversation_title ?? 'Conversation'
    case 'channel':
      return item.preview || 'Posted in channel'
    case 'automation':
      return item.space_title ? `Flow · ${item.space_title}` : 'Flow run'
  }
}

export function recentContext(item: TeamOverviewRecentItem, agent: TeamOverviewAgent | undefined): string {
  switch (item.kind) {
    case 'mission':
      return `${agent?.name ?? 'Agent'} · ${item.status}`
    case 'chat':
      return `${agent?.name ?? 'Agent'} · ${item.reply_count} repl${item.reply_count === 1 ? 'y' : 'ies'}`
    case 'channel':
      return `${agent?.name ?? 'Agent'} · #${item.channel_name ?? 'channel'}`
    case 'automation':
      return item.linked_mission_id ? 'Linked mission' : 'Flow'
  }
}
