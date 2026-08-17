import type { Campaign } from '@/lib/campaigns'
import { programDisplayName, type Program } from '@/lib/programs'
import { sortGeneralFirst } from './conversation-scope-sort'

export const SCOPE_UNGROUPED_PROGRAM_KEY = '__ungrouped__'

export type ConversationScopeCampaignGroup = {
  key: string
  label: string
  campaigns: Campaign[]
}

export type ConversationScopeProgramRow = {
  id: string
  name: string
  campaigns: Campaign[]
}

export type ConversationScopeLists = {
  programs: ConversationScopeProgramRow[]
  ungroupedCampaigns: Campaign[]
  clients: Campaign[]
}

function isClientsProgram(program: Program): boolean {
  return program.system_kind === 'clients'
}

export function programNameForCampaign(
  campaign: Campaign | null | undefined,
  programs: readonly Program[],
): string | null {
  if (!campaign?.program_id) return null
  const program = programs.find((row) => row.id === campaign.program_id)
  return program ? programDisplayName(program) : null
}

export function groupScopeCampaignsByProgram(
  campaigns: Campaign[],
  programs: Program[],
): ConversationScopeCampaignGroup[] {
  const lists = buildConversationScopeLists(campaigns, programs)
  const groups = lists.programs.map((program) => ({
    key: program.id,
    label: program.name,
    campaigns: program.campaigns,
  }))
  if (lists.ungroupedCampaigns.length > 0) {
    groups.push({
      key: SCOPE_UNGROUPED_PROGRAM_KEY,
      label: 'General',
      campaigns: lists.ungroupedCampaigns,
    })
  }
  return sortGeneralFirst(groups, (group) => group.label)
}

export function buildConversationScopeLists(
  campaigns: Campaign[],
  programs: Program[],
): ConversationScopeLists {
  const byId = new Map(programs.map((program) => [program.id, program]))
  const clientsProgram = programs.find(isClientsProgram)
  const buckets = new Map<string, Campaign[]>()
  const clients: Campaign[] = []

  for (const campaign of campaigns) {
    if (clientsProgram && campaign.program_id === clientsProgram.id) {
      clients.push(campaign)
      continue
    }
    const key =
      campaign.program_id && byId.has(campaign.program_id)
        ? campaign.program_id
        : SCOPE_UNGROUPED_PROGRAM_KEY
    const list = buckets.get(key) ?? []
    list.push(campaign)
    buckets.set(key, list)
  }

  // Clients stay in `clients` only — never under Programs as "Client Spaces".
  const programRows: ConversationScopeProgramRow[] = []
  for (const program of sortGeneralFirst(programs, (row) => programDisplayName(row))) {
    if (isClientsProgram(program)) {
      buckets.delete(program.id)
      continue
    }
    const rows = buckets.get(program.id) ?? []
    if (rows.length === 0) continue
    programRows.push({
      id: program.id,
      name: programDisplayName(program),
      campaigns: sortGeneralFirst(rows, (row) => row.name),
    })
    buckets.delete(program.id)
  }

  const ungrouped = buckets.get(SCOPE_UNGROUPED_PROGRAM_KEY) ?? []
  for (const [key, list] of buckets) {
    if (key === SCOPE_UNGROUPED_PROGRAM_KEY) continue
    ungrouped.push(...list)
  }
  return {
    programs: sortGeneralFirst(programRows, (row) => row.name),
    ungroupedCampaigns: sortGeneralFirst(ungrouped, (row) => row.name),
    clients: sortGeneralFirst(clients, (row) => row.name),
  }
}

export function filterScopeClients(clients: Campaign[], query: string): Campaign[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return clients
  return clients.filter((client) => client.name.toLowerCase().includes(needle))
}
