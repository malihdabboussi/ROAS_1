/**
 * Tab IDs for the team detail page (Spaces-style toolbar).
 * Persisted via the `?tab=` URL param so each tab is deep-linkable.
 */
export const TEAM_DETAIL_TABS = ['overview', 'analytics', 'access'] as const
export type TeamDetailTab = (typeof TEAM_DETAIL_TABS)[number]

export function isTeamDetailTab(value: string | null | undefined): value is TeamDetailTab {
  return !!value && (TEAM_DETAIL_TABS as readonly string[]).includes(value)
}

export const TEAM_DETAIL_TAB_META: Record<TeamDetailTab, { label: string }> = {
  overview: { label: 'Overview' },
  analytics: { label: 'Analytics' },
  access: { label: 'Access' },
}
