import type { ManageRailItem } from './sidebar-types'

export function isManageRailItemActive(
  item: ManageRailItem,
  pathname: string,
  isActive: (href: string) => boolean,
): boolean {
  if (item.type === 'link') {
    if (item.id === 'home') return pathname === item.href
    return isActive(item.href)
  }
  if (item.type !== 'panel') return false
  if (item.panelId === 'more') {
    return (
      pathname.startsWith('/projects') ||
      pathname.startsWith('/flows') ||
      pathname.startsWith('/artifacts')
    )
  }
  if (item.panelId === 'spaces') {
    return (
      pathname.startsWith('/spaces') ||
      pathname.startsWith('/campaigns') ||
      pathname.startsWith('/programs')
    )
  }
  if (item.panelId === 'team2') return pathname.startsWith('/team')
  if (item.panelId === 'brain') return pathname.startsWith('/brain')
  return false
}

export function workContextSurfaceForPanel(
  panelId: 'projects' | 'spaces' | 'team2' | 'brain' | 'more',
): 'spaces' | 'brain' | 'team' | 'general' {
  if (panelId === 'spaces') return 'spaces'
  if (panelId === 'brain') return 'brain'
  if (panelId === 'team2') return 'team'
  return 'general'
}
