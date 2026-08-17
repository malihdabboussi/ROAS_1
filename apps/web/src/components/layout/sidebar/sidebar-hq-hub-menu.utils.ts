import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'

/** Sections open by default when the hub menu expands (Projects stays collapsed). */
export const HUB_MENU_DEFAULT_EXPANDED_SECTIONS: HubMenuSectionId[] = ['team', 'spaces', 'brain']

export function hubSectionFromPathname(pathname: string): HubMenuSectionId | null {
  if (pathname.startsWith('/team')) return 'team'
  if (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/programs')
  )
    return 'spaces'
  if (pathname.startsWith('/brain')) return 'brain'
  if (pathname.startsWith('/projects')) return 'projects'
  return null
}

export function defaultHubMenuExpandedSections(pathname?: string): Set<HubMenuSectionId> {
  const next = new Set<HubMenuSectionId>(HUB_MENU_DEFAULT_EXPANDED_SECTIONS)
  const routeSection = pathname ? hubSectionFromPathname(pathname) : null
  if (routeSection) next.add(routeSection)
  return next
}

export function toggleHubMenuSection(
  expanded: Set<HubMenuSectionId>,
  sectionId: HubMenuSectionId,
): Set<HubMenuSectionId> {
  const next = new Set(expanded)
  if (next.has(sectionId)) next.delete(sectionId)
  else next.add(sectionId)
  return next
}
