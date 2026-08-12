import type { ManagePanelId, ManageRailItem } from './sidebar-types'

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
  if (item.panelId === 'favorites') return false
  if (item.panelId === 'more') {
    return (
      pathname.startsWith('/projects') ||
      pathname.startsWith('/flows') ||
      pathname.startsWith('/artifacts') ||
      pathname.startsWith('/team') ||
      pathname.startsWith('/brain')
    )
  }
  if (item.panelId === 'spaces') {
    return (
      pathname.startsWith('/spaces') ||
      pathname.startsWith('/campaigns') ||
      pathname.startsWith('/programs')
    )
  }
  return false
}

export function workContextSurfaceForPanel(
  panelId: ManagePanelId,
): 'spaces' | 'brain' | 'team' | 'general' {
  if (panelId === 'spaces') return 'spaces'
  return 'general'
}
