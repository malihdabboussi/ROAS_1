import { describe, expect, it } from 'vitest'

type Call = {
  table: string
  action: string
  payload?: Record<string, unknown> | Record<string, unknown>[]
  filters?: Array<{ column: string; value: unknown }>
}

function makeClient(calls: Call[]) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
    let payload: Record<string, unknown> | Record<string, unknown>[] | undefined
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      in(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      order() {
        return chain
      },
      limit() {
        return chain
      },
      insert(value: Record<string, unknown> | Record<string, unknown>[]) {
        payload = value
        calls.push({ table, action: 'insert', payload })
        return chain
      },
      update(value: Record<string, unknown>) {
        payload = value
        calls.push({ table, action: 'update', payload, filters: [...filters] })
        return chain
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        if (table === 'company_cortex_signals') {
          return Promise.resolve({
            data: [
              {
                id: 'signal-1',
                signal_type: 'standard',
                truth: 'The company prefers subtle copy.',
                confidence: 0.8,
              },
            ],
            error: null,
          }).then(resolve)
        }
        return Promise.resolve({ data: [], error: null }).then(resolve)
      },
    }
    return chain
  }
  return { from: (table: string) => makeChain(table) }
}

async function loadRepository() {
  const mod = await import('./company-cortex-object.repository')
  expect(mod.CompanyCortexObjectRepository).toBeTypeOf('function')
  return mod.CompanyCortexObjectRepository as new (database: { getClient(): unknown }) => {
    listFormationSignals(input: {
      brainId: string
      limit: number
      signalIds?: string[]
    }): Promise<Array<Record<string, unknown>>>
    insertObjects(objects: Array<Record<string, unknown>>): Promise<number>
    markSignalsMerged(signalIds: string[]): Promise<void>
  }
}

describe('CompanyCortexObjectRepository contract', () => {
  it('lists active review signals and writes durable company cortex objects', async () => {
    const calls: Call[] = []
    const Repository = await loadRepository()
    const repository = new Repository({ getClient: () => makeClient(calls) })

    const signals = await repository.listFormationSignals({
      brainId: 'brain-1',
      limit: 25,
      signalIds: ['signal-1'],
    })
    await repository.insertObjects([
      {
        org_id: 'org-1',
        brain_id: 'brain-1',
        object_type: 'standard',
        title: 'Subtle positioning',
        truth: 'The company prefers subtle copy.',
        status: 'active',
        confidence: 0.8,
        source_signal_ids: ['signal-1'],
        evidence_refs: [{ type: 'company_signal', id: 'signal-1' }],
        retrieval_rule: { trigger: 'customer-facing copy', context_form: 'Keep it subtle.' },
      },
    ])
    await repository.markSignalsMerged(['signal-1'])

    expect(signals[0]?.id).toBe('signal-1')
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_objects',
          action: 'insert',
          payload: expect.arrayContaining([
            expect.objectContaining({
              object_type: 'standard',
              source_signal_ids: ['signal-1'],
              confidence_basis: expect.objectContaining({
                formation: expect.objectContaining({ source_signal_count: 1 }),
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          table: 'company_cortex_signals',
          action: 'update',
          payload: expect.objectContaining({ status: 'merged' }),
        }),
      ]),
    )
  })
})
