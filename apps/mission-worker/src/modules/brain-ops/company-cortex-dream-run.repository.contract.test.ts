import { describe, expect, it } from 'vitest'

type Call = {
  table: string
  action: string
  payload?: Record<string, unknown>
  filters?: Array<{ column: string; value: unknown }>
}

function makeClient(calls: Call[], result: Record<string, unknown> | null = { id: 'run-1' }) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
    let payload: Record<string, unknown> | undefined
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      insert(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'insert', payload })
        return chain
      },
      update(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'update', payload })
        return chain
      },
      async maybeSingle() {
        calls.push({ table, action: 'maybeSingle', filters: [...filters] })
        return { data: result, error: null }
      },
      async single() {
        calls.push({ table, action: 'single', payload, filters: [...filters] })
        return { data: result ?? { id: 'run-1' }, error: null }
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadRepository() {
  const mod = await import('./company-cortex-dream-run.repository')
  expect(mod.CompanyCortexDreamRunRepository).toBeTypeOf('function')
  return mod.CompanyCortexDreamRunRepository as new (database: { getClient(): unknown }) => {
    findByDedupeKey(key: string): Promise<Record<string, unknown> | null>
    createRun(input: Record<string, unknown>): Promise<{ id: string }>
    completeRun(id: string, output: Record<string, unknown>): Promise<void>
  }
}

describe('CompanyCortexDreamRunRepository contract', () => {
  it('finds dream runs by dedupe key', async () => {
    const calls: Call[] = []
    const Repository = await loadRepository()
    const repository = new Repository({ getClient: () => makeClient(calls) })

    const result = await repository.findByDedupeKey('company-dream-org-1-2026-05-18')

    expect(result?.id).toBe('run-1')
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_dream_runs',
          action: 'maybeSingle',
          filters: [{ column: 'dedupe_key', value: 'company-dream-org-1-2026-05-18' }],
        }),
      ]),
    )
  })

  it('creates and completes dream runs in company_cortex_dream_runs', async () => {
    const calls: Call[] = []
    const Repository = await loadRepository()
    const repository = new Repository({ getClient: () => makeClient(calls) })

    await repository.createRun({
      org_id: 'org-1',
      brain_id: 'brain-1',
      dedupe_key: 'company-dream-org-1-2026-05-18',
      window_start: '2026-05-18T00:00:00.000Z',
      window_end: '2026-05-19T00:00:00.000Z',
      status: 'running',
    })
    await repository.completeRun('run-1', { status: 'completed', signals_created: 2 })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_dream_runs',
          action: 'insert',
          payload: expect.objectContaining({ org_id: 'org-1', status: 'running' }),
        }),
        expect.objectContaining({
          table: 'company_cortex_dream_runs',
          action: 'update',
          payload: expect.objectContaining({ status: 'completed', signals_created: 2 }),
        }),
      ]),
    )
  })
})
