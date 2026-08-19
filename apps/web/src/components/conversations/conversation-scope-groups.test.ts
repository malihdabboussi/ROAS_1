import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import {
  buildConversationScopeLists,
  filterScopeClients,
  groupScopeCampaignsByProgram,
} from './conversation-scope-groups'

function campaign(id: string, name: string, programId: string | null): Campaign {
  return { id, name, program_id: programId } as Campaign
}

function program(id: string, name: string, systemKind: Program['system_kind'] = null): Program {
  return { id, name, system_kind: systemKind } as Program
}

describe('buildConversationScopeLists', () => {
  it('keeps clients only in the Clients folder list, not under Programs', () => {
    const lists = buildConversationScopeLists(
      [
        campaign('c1', 'Launch', 'p1'),
        campaign('c2', 'Ops', null),
        campaign('c3', 'Yasir Khan', 'clients'),
        campaign('c4', 'General', 'clients'),
        campaign('c5', 'Above It', 'clients'),
      ],
      [program('p1', 'Growth'), program('clients', 'Clients', 'clients')],
    )

    expect(lists.programs.map((row) => row.name)).toEqual(['Growth'])
    expect(lists.programs[0]?.campaigns.map((row) => row.id)).toEqual(['c1'])
    expect(lists.ungroupedCampaigns.map((row) => row.id)).toEqual(['c2'])
    expect(lists.clients.map((row) => row.name)).toEqual(['General', 'Above It', 'Yasir Khan'])
  })

  it('hides inactive, blocked, and churned clients from the Connections list', () => {
    const lists = buildConversationScopeLists(
      [
        campaign('c3', 'Yasir Khan', 'clients'),
        {
          ...campaign('c6', 'Sunset Co', 'clients'),
          status: 'churned_inactive',
        },
      ],
      [program('clients', 'Clients', 'clients')],
    )
    expect(filterScopeClients(lists.clients, '').map((row) => row.id)).toEqual(['c3'])
    expect(filterScopeClients(lists.clients, 'sunset').map((row) => row.id)).toEqual(['c6'])
  })

  it('filters clients by name without changing program rows', () => {
    const lists = buildConversationScopeLists(
      [campaign('c3', 'Yasir Khan', 'clients'), campaign('c5', 'Above It', 'clients')],
      [program('clients', 'Clients', 'clients')],
    )
    expect(lists.programs).toEqual([])
    expect(filterScopeClients(lists.clients, 'yasir').map((row) => row.id)).toEqual(['c3'])
  })
})

describe('groupScopeCampaignsByProgram', () => {
  it('places leftover campaigns under General after named programs', () => {
    const groups = groupScopeCampaignsByProgram(
      [campaign('c1', 'Launch', 'p1'), campaign('c2', 'Ops', null)],
      [program('p1', 'Growth')],
    )

    expect(groups.map((group) => group.label)).toEqual(['General', 'Growth'])
    expect(groups[0]?.campaigns.map((row) => row.id)).toEqual(['c2'])
    expect(groups[1]?.campaigns.map((row) => row.id)).toEqual(['c1'])
  })
})
