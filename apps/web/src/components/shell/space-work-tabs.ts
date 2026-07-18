export type SpaceWorkTabKind = 'doc' | 'task'

export type SpaceWorkTab = {
  id: string
  kind: SpaceWorkTabKind
  title: string
  spaceId: string
}

export type SpaceWorkSession = {
  tabs: SpaceWorkTab[]
  activeTabId: string | null
}

export const SPACE_WORK_TABS_MAX = 12

export const EMPTY_SPACE_WORK_SESSION: SpaceWorkSession = {
  tabs: [],
  activeTabId: null,
}

export function normalizeSpaceWorkSession(
  value: SpaceWorkSession | null | undefined,
): SpaceWorkSession {
  if (!value || !Array.isArray(value.tabs)) return { ...EMPTY_SPACE_WORK_SESSION }
  const tabs = value.tabs
    .filter(
      (tab): tab is SpaceWorkTab =>
        Boolean(tab) &&
        typeof tab.id === 'string' &&
        tab.id.length > 0 &&
        (tab.kind === 'doc' || tab.kind === 'task') &&
        typeof tab.title === 'string' &&
        typeof tab.spaceId === 'string',
    )
    .slice(0, SPACE_WORK_TABS_MAX)
  const activeTabId =
    value.activeTabId && tabs.some((tab) => tab.id === value.activeTabId)
      ? value.activeTabId
      : (tabs[0]?.id ?? null)
  return { tabs, activeTabId }
}

export function upsertSpaceWorkTab(session: SpaceWorkSession, tab: SpaceWorkTab): SpaceWorkSession {
  const current = normalizeSpaceWorkSession(session)
  const without = current.tabs.filter((row) => row.id !== tab.id)
  const nextTabs = [{ ...tab, title: tab.title.trim() || 'Untitled' }, ...without].slice(
    0,
    SPACE_WORK_TABS_MAX,
  )
  return { tabs: nextTabs, activeTabId: tab.id }
}

export function activateSpaceWorkTab(session: SpaceWorkSession, tabId: string): SpaceWorkSession {
  const current = normalizeSpaceWorkSession(session)
  if (!current.tabs.some((tab) => tab.id === tabId)) return current
  return { ...current, activeTabId: tabId }
}

export function closeSpaceWorkTab(session: SpaceWorkSession, tabId: string): SpaceWorkSession {
  const current = normalizeSpaceWorkSession(session)
  const tabs = current.tabs.filter((tab) => tab.id !== tabId)
  if (tabs.length === current.tabs.length) return current
  const activeTabId = current.activeTabId === tabId ? (tabs[0]?.id ?? null) : current.activeTabId
  return { tabs, activeTabId }
}

export function spaceWorkTabKindFromViewType(viewType: unknown): SpaceWorkTabKind {
  return viewType === 'doc' ? 'doc' : 'task'
}
