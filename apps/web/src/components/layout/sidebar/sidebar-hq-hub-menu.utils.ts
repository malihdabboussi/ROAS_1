import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'

export function hubSectionFromPathname(pathname: string): HubMenuSectionId | null {
  if (pathname.startsWith('/team')) return 'team'
  if (pathname.startsWith('/spaces')) return 'spaces'
  if (pathname.startsWith('/brain')) return 'brain'
  if (pathname.startsWith('/projects')) return 'projects'
  return null
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
