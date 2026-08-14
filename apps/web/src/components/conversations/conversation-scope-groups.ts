import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'

export const SCOPE_UNGROUPED_PROGRAM_KEY = '__ungrouped__'

export type ConversationScopeCampaignGroup = {
  key: string
  label: string
  campaigns: Campaign[]
}

export function groupScopeCampaignsByProgram(
  campaigns: Campaign[],
  programs: Program[],
): ConversationScopeCampaignGroup[] {
  const byId = new Map(programs.map((program) => [program.id, program]))
  const buckets = new Map<string, Campaign[]>()
  for (const campaign of campaigns) {
    const key =
      campaign.program_id && byId.has(campaign.program_id)
        ? campaign.program_id
        : SCOPE_UNGROUPED_PROGRAM_KEY
    const list = buckets.get(key) ?? []
    list.push(campaign)
    buckets.set(key, list)
  }
  const groups: ConversationScopeCampaignGroup[] = []
  for (const program of [...programs].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )) {
    const rows = buckets.get(program.id) ?? []
    if (rows.length === 0) continue
    groups.push({
      key: program.id,
      label: program.name,
      campaigns: [...rows].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    })
    buckets.delete(program.id)
  }
  const ungrouped = buckets.get(SCOPE_UNGROUPED_PROGRAM_KEY) ?? []
  for (const [key, list] of buckets) {
    if (key === SCOPE_UNGROUPED_PROGRAM_KEY) continue
    ungrouped.push(...list)
  }
  if (ungrouped.length > 0) {
    groups.push({
      key: SCOPE_UNGROUPED_PROGRAM_KEY,
      label: 'General',
      campaigns: ungrouped.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    })
  }
  return groups.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}
