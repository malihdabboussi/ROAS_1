import { describe, expect, it, vi } from 'vitest'
import { PulseCompositorService } from './pulse-compositor.service'

type Row = Record<string, any>

function makeClient(tables: Record<string, Row[]>) {
  return {
    from: vi.fn((table: string) => {
      const state: {
        filters: Array<(row: Row) => boolean>
        limit?: number
      } = { filters: [] }
      const materialize = () => {
        let rows = [...(tables[table] ?? [])]
        for (const filter of state.filters) rows = rows.filter(filter)
        if (state.limit !== undefined) rows = rows.slice(0, state.limit)
        return rows
      }
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn((field: string, value: unknown) => {
          state.filters.push((row) => row[field] === value)
          return query
        }),
        is: vi.fn((field: string, value: null) => {
          state.filters.push((row) => row[field] === value)
          return query
        }),
        not: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn((limit: number) => {
          state.limit = limit
          return query
        }),
        maybeSingle: vi.fn(async () => ({ data: materialize()[0] ?? null, error: null })),
        then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: materialize(), error: null })),
      }
      return query
    }),
  }
}

describe('PulseCompositorService', () => {
  it('summarizes active campaigns, missions, and promoted-agent signals', async () => {
    const client = makeClient({
      campaigns: [
        { id: 'campaign-1', user_id: 'user-1', org_id: 'org-1', name: 'Launch', status: 'active' },
        { id: 'campaign-2', user_id: 'user-1', org_id: 'org-1', name: 'Nurture', status: 'draft' },
      ],
      missions: [
        { user_id: 'user-1', org_id: 'org-1', status: 'in_progress' },
        { user_id: 'user-1', org_id: 'org-1', status: 'review' },
      ],
      agents_registry: [
        {
          user_id: 'user-1',
          org_id: 'org-1',
          agent_key: 'ceo',
          level: 'c_level',
          config: { archetype: 'ceo' },
        },
      ],
      agent_signals: [
        {
          user_id: 'user-1',
          org_id: 'org-1',
          consumed_at: null,
          signal_type: 'mission_blocked',
        },
      ],
    })
    const service = new PulseCompositorService()

    const pulse = await service.buildPulse(client as never, {
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'ceo',
      resolvedCampaignId: 'campaign-2',
      channel: 'studio',
    })

    expect(pulse).toContain('Campaigns: Launch (active), Nurture (draft)')
    expect(pulse).toContain('Active: Nurture')
    expect(pulse).toContain('Missions: 1 active | 1 reviewing')
    expect(pulse).toContain('Signals: 1 pending (mission_blocked)')
    expect(pulse).toContain('Channel: studio')
  })
})
