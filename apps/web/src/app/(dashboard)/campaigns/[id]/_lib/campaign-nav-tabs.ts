/** Tabs shown in campaign HQ nav (excludes Settings — always visible). */
export const TOGGLEABLE_CAMPAIGN_TAB_IDS = ['dashboard', 'finance', 'knowledge'] as const

export type ToggleableCampaignTabId = (typeof TOGGLEABLE_CAMPAIGN_TAB_IDS)[number]

/** Default: all toggleable tabs except Finance. */
export const DEFAULT_VISIBLE_CAMPAIGN_TABS: ToggleableCampaignTabId[] = ['dashboard', 'knowledge']

const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  TOGGLEABLE_CAMPAIGN_TAB_IDS.map((id, i) => [id, i]),
)

export function sortVisibleTabs(ids: string[]): string[] {
  return [...ids].sort((a, b) => (ORDER_INDEX[a] ?? 99) - (ORDER_INDEX[b] ?? 99))
}

export function readVisibleCampaignTabs(config: unknown): ToggleableCampaignTabId[] {
  const c = config as Record<string, unknown> | null | undefined
  const raw = c?.visible_campaign_tabs
  if (!Array.isArray(raw)) return [...DEFAULT_VISIBLE_CAMPAIGN_TABS]
  const allowed = new Set<string>(TOGGLEABLE_CAMPAIGN_TAB_IDS)
  const filtered = raw.filter(
    (x): x is ToggleableCampaignTabId =>
      typeof x === 'string' && allowed.has(x as ToggleableCampaignTabId),
  )
  if (filtered.length === 0) return [...DEFAULT_VISIBLE_CAMPAIGN_TABS]
  return sortVisibleTabs(filtered) as ToggleableCampaignTabId[]
}

export const CAMPAIGN_TAB_LABELS: Record<ToggleableCampaignTabId, string> = {
  dashboard: 'Missions',
  finance: 'Finance',
  knowledge: 'Knowledge',
}
