import type { MissionAgentSidebar } from '@/lib/agents/mission-agents-api'

export function sortAgentsForTeamDmList(
  agents: MissionAgentSidebar[],
  favoriteIds: Set<string>,
): MissionAgentSidebar[] {
  return [...agents].sort((a, b) => {
    const aFav = favoriteIds.has(a.id)
    const bFav = favoriteIds.has(b.id)
    if (aFav !== bFav) return aFav ? -1 : 1

    if (a.is_active !== false && b.is_active === false) return -1
    if (a.is_active === false && b.is_active !== false) return 1

    const aOrder = a.sort_order ?? 0
    const bOrder = b.sort_order ?? 0
    if (aOrder !== bOrder) return aOrder - bOrder

    const at = new Date(a.updated_at ?? 0).getTime()
    const bt = new Date(b.updated_at ?? 0).getTime()
    if (at !== bt) return bt - at

    return a.name.localeCompare(b.name)
  })
}
