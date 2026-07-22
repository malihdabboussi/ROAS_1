import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'

export const UNGROUPED_PROGRAM_KEY = '__ungrouped__'

export type ProgramCampaignGroup = {
  key: string
  program: Program | null
  label: string
  sortOrder: number
  campaigns: Campaign[]
}

function campaignSort(a: Campaign, b: Campaign): number {
  const aGeneral = (a.config as Record<string, unknown>)?.system_kind === 'general'
  const bGeneral = (b.config as Record<string, unknown>)?.system_kind === 'general'
  if (aGeneral && !bGeneral) return -1
  if (!aGeneral && bGeneral) return 1
  return (a.name ?? '').localeCompare(b.name ?? '')
}

/** Group campaigns under programs; null program_id → Ungrouped. */
export function groupCampaignsByProgram(
  campaigns: Campaign[],
  programs: Program[],
): ProgramCampaignGroup[] {
  const byId = new Map(programs.map((p) => [p.id, p]))
  const buckets = new Map<string, Campaign[]>()

  for (const campaign of campaigns) {
    const key =
      campaign.program_id && byId.has(campaign.program_id)
        ? campaign.program_id
        : UNGROUPED_PROGRAM_KEY
    const list = buckets.get(key) ?? []
    list.push(campaign)
    buckets.set(key, list)
  }

  const groups: ProgramCampaignGroup[] = []

  for (const program of [...programs].sort((a, b) => a.sort_order - b.sort_order)) {
    const list = buckets.get(program.id) ?? []
    groups.push({
      key: program.id,
      program,
      label: program.name,
      sortOrder: program.sort_order,
      campaigns: [...list].sort(campaignSort),
    })
    buckets.delete(program.id)
  }

  const ungrouped = buckets.get(UNGROUPED_PROGRAM_KEY) ?? []
  // Orphan program_ids (program missing from list) also land ungrouped.
  for (const [key, list] of buckets) {
    if (key === UNGROUPED_PROGRAM_KEY) continue
    ungrouped.push(...list)
  }

  if (ungrouped.length > 0) {
    groups.push({
      key: UNGROUPED_PROGRAM_KEY,
      program: null,
      label: 'Ungrouped',
      sortOrder: Number.MAX_SAFE_INTEGER,
      campaigns: ungrouped.sort(campaignSort),
    })
  }

  return groups
}

export function defaultOrgProgramId(programs: Program[]): string | null {
  const clients = programs.find((p) => p.system_kind === 'clients')
  return clients?.id ?? programs[0]?.id ?? null
}
