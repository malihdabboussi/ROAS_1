import { describe, expect, it, vi } from 'vitest'
import { BrainOpsProcessor } from './brain-ops.processor'

function makeDatabase() {
  const calls: Array<{ table: string; action: string; payload?: Record<string, unknown> }> = []
  const makeChain = (table: string) => {
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq() {
        return chain
      },
      update(payload: Record<string, unknown>) {
        calls.push({ table, action: 'update', payload })
        return chain
      },
      async maybeSingle() {
        calls.push({ table, action: 'maybeSingle' })
        return {
          data: {
            id: 'brain-1',
            owner_id: 'user-1',
            org_id: 'org-1',
            scope: 'company',
          },
          error: null,
        }
      },
      async single() {
        calls.push({ table, action: 'single' })
        return { data: { cortex_max: true }, error: null }
      },
    }
    return chain
  }
  return {
    calls,
    service: { getClient: () => ({ from: (table: string) => makeChain(table) }) },
  }
}

describe('BrainOpsProcessor company daily dream', () => {
  it('does not enqueue or invoke formation after signal generation', async () => {
    const database = makeDatabase()
    const runDailyDream = vi.fn(async () => ({
      runId: 'run-1',
      skipped: false,
      signalsCreated: 3,
      tokensEstimated: 120,
    }))
    const runFormation = vi.fn()
    const processor = new BrainOpsProcessor(
      {} as never,
      database.service as never,
      { runDailyDream } as never,
      { runFormation } as never,
      {} as never,
    )

    const result = await processor.process({
      data: {
        outboxId: 'outbox-1',
        brainId: 'brain-1',
        userId: 'user-1',
        orgId: 'org-1',
        eventType: 'company_daily_dream',
        payload: {
          local_date: '2026-06-24',
          window_start: '2026-06-23T00:00:00.000Z',
          window_end: '2026-06-24T00:00:00.000Z',
        },
      },
    } as never)

    expect(result).toMatchObject({ success: true, eventType: 'company_daily_dream' })
    expect(runDailyDream).toHaveBeenCalledOnce()
    expect(runFormation).not.toHaveBeenCalled()
    expect(database.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'brain_ops_outbox',
          action: 'update',
          payload: expect.objectContaining({ status: 'done' }),
        }),
      ]),
    )
  })
})
