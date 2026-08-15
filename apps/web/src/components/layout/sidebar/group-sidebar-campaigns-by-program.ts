import { programDisplayName, type Program } from '@/lib/programs'
import type { SidebarCampaignRow } from './sidebar-types'

export const SIDEBAR_UNGROUPED_PROGRAM_KEY = '__ungrouped__'

export type SidebarProgramCampaignGroup = {
  key: string
  label: string
  program: Program | null
  campaigns: SidebarCampaignRow[]
}

/** Group sidebar campaign buckets under program headers (empty programs included). */
export function groupSidebarCampaignsByProgram(
  campaigns: SidebarCampaignRow[],
  programs: Program[],
): SidebarProgramCampaignGroup[] {
  const byId = new Map(programs.map((p) => [p.id, p]))
  const buckets = new Map<string, SidebarCampaignRow[]>()

  for (const campaign of campaigns) {
    const key =
      campaign.program_id && byId.has(campaign.program_id)
        ? campaign.program_id
        : SIDEBAR_UNGROUPED_PROGRAM_KEY
    const list = buckets.get(key) ?? []
    list.push(campaign)
    buckets.set(key, list)
  }

  const groups: SidebarProgramCampaignGroup[] = []
  for (const program of [...programs].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )) {
    groups.push({
      key: program.id,
      label: programDisplayName(program),
      program,
      campaigns: [...(buckets.get(program.id) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    })
    buckets.delete(program.id)
  }

  const ungrouped = buckets.get(SIDEBAR_UNGROUPED_PROGRAM_KEY) ?? []
  for (const [key, list] of buckets) {
    if (key === SIDEBAR_UNGROUPED_PROGRAM_KEY) continue
    ungrouped.push(...list)
  }
  if (ungrouped.length > 0 || programs.length === 0) {
    if (ungrouped.length > 0) {
      groups.push({
        key: SIDEBAR_UNGROUPED_PROGRAM_KEY,
        label: 'General',
        program: null,
        campaigns: ungrouped.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        ),
      })
    }
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}
