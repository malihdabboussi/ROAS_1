import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import {
  defaultOrgProgramId,
  groupCampaignsByProgram,
  UNGROUPED_PROGRAM_KEY,
} from './group-campaigns-by-program'

function campaign(partial: Partial<Campaign> & { id: string; name: string }): Campaign {
  return {
    user_id: 'u1',
    campaign_type: 'get-more-leads',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...partial,
  }
}

function program(partial: Partial<Program> & { id: string; name: string }): Program {
  return {
    org_id: 'org1',
    user_id: null,
    slug: partial.name.toLowerCase().replace(/\s+/g, '-'),
    system_kind: null,
    icon: null,
    icon_color: null,
    sort_order: 0,
    config: {},
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    deleted_at: null,
    ...partial,
  }
}

describe('groupCampaignsByProgram', () => {
  it('groups by program_id and sorts programs by sort_order', () => {
    const programs = [
      program({ id: 'p-ops', name: 'ROAS Ops', system_kind: 'roas_ops', sort_order: 2 }),
      program({ id: 'p-clients', name: 'Clients', system_kind: 'clients', sort_order: 1 }),
    ]
    const campaigns = [
      campaign({ id: 'c1', name: 'Zebra', program_id: 'p-clients' }),
      campaign({ id: 'c2', name: 'Alpha', program_id: 'p-ops' }),
      campaign({ id: 'c3', name: 'Lone', program_id: null }),
    ]

    const groups = groupCampaignsByProgram(campaigns, programs)
    expect(groups.map((g) => g.label)).toEqual(['Clients', 'ROAS Ops', 'Ungrouped'])
    expect(groups[0]?.campaigns.map((c) => c.id)).toEqual(['c1'])
    expect(groups[2]?.key).toBe(UNGROUPED_PROGRAM_KEY)
  })

  it('treats unknown program_id as ungrouped', () => {
    const groups = groupCampaignsByProgram(
      [campaign({ id: 'c1', name: 'Orphan', program_id: 'missing' })],
      [],
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe(UNGROUPED_PROGRAM_KEY)
  })
  it('includes empty programs in shell order', () => {
    const programs = [
      program({ id: 'p-clients', name: 'Clients', system_kind: 'clients', sort_order: 0 }),
      program({ id: 'p-ops', name: 'ROAS Ops', system_kind: 'roas_ops', sort_order: 1 }),
    ]
    const groups = groupCampaignsByProgram([], programs)
    expect(groups.map((g) => g.label)).toEqual(['Clients', 'ROAS Ops'])
    expect(groups[0]?.campaigns).toEqual([])
  })
})

describe('defaultOrgProgramId', () => {
  it('prefers clients system program', () => {
    expect(
      defaultOrgProgramId([
        program({ id: 'ops', name: 'Ops', system_kind: 'roas_ops' }),
        program({ id: 'clients', name: 'Clients', system_kind: 'clients' }),
      ]),
    ).toBe('clients')
  })
})
