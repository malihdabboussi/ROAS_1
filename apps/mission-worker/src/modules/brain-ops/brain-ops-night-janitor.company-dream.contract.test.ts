import { describe, expect, it, vi } from 'vitest'
import { BrainOpsNightJanitorService } from './brain-ops-night-janitor.service'

type InsertCall = { table: string; payload: Record<string, unknown> }

function makeChain(table: string, inserts: InsertCall[]) {
  let selectValue = ''
  let insertPayload: Record<string, unknown> | null = null
  const chain: Record<string, unknown> = {
    select(value: string) {
      selectValue = value
      return chain
    },
    eq() {
      return chain
    },
    is() {
      return chain
    },
    in() {
      return chain
    },
    lt() {
      return chain
    },
    limit() {
      return chain
    },
    update() {
      return chain
    },
    insert(payload: Record<string, unknown>) {
      insertPayload = payload
      inserts.push({ table, payload })
      return chain
    },
    async maybeSingle() {
      return { data: null, error: null }
    },
    then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
      if (table === 'company_cortex_settings') {
        return Promise.resolve({
          data: [
            {
              org_id: 'org-1',
              brain_id: 'brain-company-1',
              enabled: true,
              schedule: 'daily',
              local_time: '02:00',
              timezone: 'UTC',
              lookback_hours: 24,
              min_activity_threshold: 1,
              ns_brains: { owner_id: 'owner-1' },
            },
          ],
          error: null,
        }).then(resolve)
      }
      if (table === 'ns_brains' && selectValue === 'id') {
        return Promise.resolve({ data: [], error: null }).then(resolve)
      }
      if (table === 'brain_ops_outbox' && insertPayload) {
        return Promise.resolve({ data: [], error: null }).then(resolve)
      }
      return Promise.resolve({ data: [], error: null }).then(resolve)
    },
  }
  return chain
}

describe('BrainOpsNightJanitorService company daily dream contract', () => {
  it('enqueues company_daily_dream for enabled Company Cortex settings', async () => {
    const inserts: InsertCall[] = []
    const service = new BrainOpsNightJanitorService(
      { get: vi.fn().mockReturnValue(999999999) } as any,
      {
        getClient: () => ({
          from: (table: string) => makeChain(table, inserts),
          rpc: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any,
    )

    await service.runSweep()

    expect(inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'brain_ops_outbox',
          payload: expect.objectContaining({
            brain_id: 'brain-company-1',
            user_id: 'owner-1',
            org_id: 'org-1',
            event_type: 'company_daily_dream',
            dedupe_key: expect.stringContaining('company-dream-org-1-'),
            payload: expect.objectContaining({
              source: 'night_janitor',
              local_date: expect.any(String),
              window_start: expect.any(String),
              window_end: expect.any(String),
            }),
          }),
        }),
      ]),
    )
  })
})
