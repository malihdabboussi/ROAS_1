import { describe, expect, it } from 'vitest'
import { DreamOpsRepository } from './dream-ops.repository'

type UpdateCall = {
  table: string
  payload: Record<string, unknown>
  filters: Array<[string, unknown]>
}

function clientWithUpdates(calls: UpdateCall[]) {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = []
      let payload: Record<string, unknown> = {}
      const chain = {
        update(value: Record<string, unknown>) {
          payload = value
          return chain
        },
        eq(column: string, value: unknown) {
          filters.push([column, value])
          if (filters.length === (table === 'dream_ops_settings' ? 3 : 2)) {
            calls.push({ table, payload, filters: [...filters] })
          }
          return chain
        },
        then(resolve: (value: { error: null }) => unknown) {
          return Promise.resolve({ error: null }).then(resolve)
        },
      }
      return chain
    },
  }
}

describe('DreamOpsRepository success timestamps', () => {
  it('updates shared and Company Cortex timestamps after a successful company dream', async () => {
    const calls: UpdateCall[] = []
    const repository = new DreamOpsRepository({
      getClient: () => clientWithUpdates(calls),
    } as never)

    await repository.markSettingSuccessful({
      operationType: 'company_daily_dream',
      orgId: 'org-1',
      subjectKey: 'brain-1',
      completedAt: '2026-07-20T09:00:00.000Z',
    })

    expect(calls).toEqual([
      {
        table: 'dream_ops_settings',
        payload: { last_successful_run_at: '2026-07-20T09:00:00.000Z' },
        filters: [
          ['org_id', 'org-1'],
          ['operation_type', 'company_daily_dream'],
          ['subject_key', 'brain-1'],
        ],
      },
      {
        table: 'company_cortex_settings',
        payload: { last_successful_dream_at: '2026-07-20T09:00:00.000Z' },
        filters: [
          ['org_id', 'org-1'],
          ['brain_id', 'brain-1'],
        ],
      },
    ])
  })
})
