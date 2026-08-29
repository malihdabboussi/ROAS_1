/** Tabs shown in campaign HQ nav (excludes Settings — always visible). */
export const TOGGLEABLE_CAMPAIGN_TAB_IDS = [
  'overview',
  'dashboard',
  'list',
  'board',
  'calendar',
  'canvas',
  'assets',
  'knowledge',
  'reporting',
] as const

export type ToggleableCampaignTabId = (typeof TOGGLEABLE_CAMPAIGN_TAB_IDS)[number]

export const CLIENT_WORKSPACE_NAV_TABS = [
  { value: 'overview', label: 'Overview', icon: 'layout-grid' },
  { value: 'dashboard', label: 'Campaigns', icon: 'folder-kanban' },
  { value: 'list', label: 'Tasks & Requests', icon: 'list' },
  { value: 'reporting', label: 'Performance', icon: 'pie-chart' },
  { value: 'calendar', label: 'Meetings', icon: 'calendar-days' },
  { value: 'communications', label: 'Chats & Missions', icon: 'message-square' },
  { value: 'canvas', label: 'Canvas', icon: 'panels-top-left' },
  { value: 'knowledge', label: 'Brain', icon: 'brain' },
] as const

/** Default agency client hub: overview + brand + reporting; work (missions) included. */
export const DEFAULT_VISIBLE_CAMPAIGN_TABS: ToggleableCampaignTabId[] = [
  'overview',
  'dashboard',
  'list',
  'board',
  'calendar',
  'canvas',
  'assets',
  'knowledge',
  'reporting',
]

const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  TOGGLEABLE_CAMPAIGN_TAB_IDS.map((id, i) => [id, i]),
)

/** Legacy tab id stored on older campaigns. */
const LEGACY_TAB_ALIASES: Record<string, ToggleableCampaignTabId> = {
  finance: 'reporting',
}

export function normalizeCampaignTabId(id: string): ToggleableCampaignTabId | null {
  const aliased = LEGACY_TAB_ALIASES[id] ?? id
  return TOGGLEABLE_CAMPAIGN_TAB_IDS.includes(aliased as ToggleableCampaignTabId)
    ? (aliased as ToggleableCampaignTabId)
    : null
}

export function sortVisibleTabs(ids: string[]): string[] {
  return [...ids].sort((a, b) => (ORDER_INDEX[a] ?? 99) - (ORDER_INDEX[b] ?? 99))
}

export function readVisibleCampaignTabs(config: unknown): ToggleableCampaignTabId[] {
  const c = config as Record<string, unknown> | null | undefined
  const raw = c?.visible_campaign_tabs
  if (!Array.isArray(raw)) return [...DEFAULT_VISIBLE_CAMPAIGN_TABS]
  const normalized = raw
    .map((x) => (typeof x === 'string' ? normalizeCampaignTabId(x) : null))
    .filter((x): x is ToggleableCampaignTabId => x != null)
  const deduped = [...new Set(normalized)]
  if (deduped.length === 0) return [...DEFAULT_VISIBLE_CAMPAIGN_TABS]
  return sortVisibleTabs(deduped) as ToggleableCampaignTabId[]
}

export const CAMPAIGN_TAB_LABELS: Record<ToggleableCampaignTabId, string> = {
  overview: 'Overview',
  dashboard: 'Work',
  list: 'List',
  board: 'Board',
  calendar: 'Calendar',
  canvas: 'Canvas',
  assets: 'Assets',
  knowledge: 'Brand & Knowledge',
  reporting: 'Reporting',
}

export const CAMPAIGN_TAB_ICONS: Record<ToggleableCampaignTabId, string> = {
  overview: 'layout-grid',
  dashboard: 'bar-chart-3',
  list: 'list',
  board: 'columns-3',
  calendar: 'calendar-days',
  canvas: 'panels-top-left',
  assets: 'folder-open',
  knowledge: 'book-open',
  reporting: 'pie-chart',
}

export const DEFAULT_CAMPAIGN_TAB: ToggleableCampaignTabId = 'overview'
