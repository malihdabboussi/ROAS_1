import { describe, expect, it } from 'vitest'
import { ArtifactCompanyCortexService } from './artifact-company-cortex.service'

type Call = {
  table: string
  method: string
  payload?: unknown
  filters?: Array<{ column: string; value: unknown }>
}

function makeTarget(calls: Call[]) {
  const makeChain = (table: string) => {
    const filters: Array<{ column: string; value: unknown }> = []
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      neq(column: string, value: unknown) {
        filters.push({ column, value })
        return chain
      },
      order() {
        return chain
      },
      limit() {
        return chain
      },
      maybeSingle: async () => {
        calls.push({ table, method: 'maybeSingle', filters: [...filters] })
        if (table === 'ns_brains') {
          return {
            data: { id: 'brain-company', scope: 'company', org_id: 'org-1' },
            error: null,
          }
        }
        return { data: null, error: null }
      },
      insert(payload: unknown) {
        calls.push({ table, method: 'insert', payload, filters: [...filters] })
        return chain
      },
      single: async () => {
        calls.push({ table, method: 'single', filters: [...filters] })
        return { data: { id: 'object-1' }, error: null }
      },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        calls.push({ table, method: 'then', filters: [...filters] })
        return Promise.resolve({
          data: [
            {
              id: 'object-1',
              object_type: 'belief',
              title: 'Ask first',
              truth: 'Ask before mutating workspace state.',
              status: 'active',
              confidence: 0.8,
            },
          ],
          error: null,
        }).then(resolve)
      },
    }
    return chain
  }

  return {
    resolveOrgId: () => 'org-1',
    resolveUserId: () => 'user-1',
    getUserClient: async () => ({
      rpc: async (name: string, payload: unknown) => {
        calls.push({ table: name, method: 'rpc', payload })
        return { data: true, error: null }
      },
    }),
    embeddingService: {
      getEmbedding: async () => [0.1, 0.2, 0.3],
    },
    serviceClient: {
      from: (table: string) => makeChain(table),
      rpc: async (name: string, payload: unknown) => {
        calls.push({ table: name, method: 'rpc', payload })
        return {
          data: [
            {
              id: 'object-semantic',
              object_type: 'belief',
              title: 'Semantic match',
              truth: 'Search found this semantically.',
            },
          ],
          error: null,
        }
      },
    },
  }
}

describe('ArtifactCompanyCortexService', () => {
  it('lists objects only after resolving an org company brain', async () => {
    const calls: Call[] = []
    const handlers = new ArtifactCompanyCortexService().getHandlers(makeTarget(calls))

    const result = await handlers.get_company_brain_objects({ brain_id: 'brain-company' }, 's')

    expect(result).toMatchObject({ success: true, count: 1 })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'ns_brains',
          filters: expect.arrayContaining([{ column: 'id', value: 'brain-company' }]),
        }),
        expect.objectContaining({
          table: 'company_cortex_objects',
          filters: expect.arrayContaining([
            { column: 'brain_id', value: 'brain-company' },
            { column: 'org_id', value: 'org-1' },
          ]),
        }),
      ]),
    )
  })

  it('proposes company brain signals instead of creating objects from raw saves', async () => {
    const calls: Call[] = []
    const handlers = new ArtifactCompanyCortexService().getHandlers(makeTarget(calls))

    const result = await handlers.propose_company_brain_signal(
      {
        brain_id: 'brain-company',
        signal_type: 'standard',
        truth: 'Ask before mutating workspace state.',
        source_title: 'Manual note',
      },
      's',
    )

    expect(result).toMatchObject({ success: true })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_signals',
          method: 'insert',
          payload: expect.objectContaining({
            brain_id: 'brain-company',
            org_id: 'org-1',
            signal_type: 'standard',
            status: 'proposed',
          }),
        }),
      ]),
    )
  })

  it('rejects direct object creation without reviewed signal lineage', async () => {
    const calls: Call[] = []
    const handlers = new ArtifactCompanyCortexService().getHandlers(makeTarget(calls))

    const result = await handlers.create_company_brain_object(
      {
        brain_id: 'brain-company',
        object_type: 'belief',
        title: 'Ask first',
        truth: 'Ask before mutating workspace state.',
      },
      's',
    )

    expect(result).toMatchObject({
      success: false,
      error: 'source_signal_ids are required for company object creation',
    })
    expect(calls.some((call) => call.table === 'company_cortex_objects')).toBe(false)
  })

  it('creates objects only when reviewed lineage, evidence, and retrieval rule exist', async () => {
    const calls: Call[] = []
    const handlers = new ArtifactCompanyCortexService().getHandlers(makeTarget(calls))

    const result = await handlers.create_company_brain_object(
      {
        brain_id: 'brain-company',
        object_type: 'belief',
        title: 'Ask first',
        truth: 'Ask before mutating workspace state.',
        source_signal_ids: ['signal-1'],
        evidence_refs: [{ type: 'company_signal', id: 'signal-1' }],
        retrieval_rule: { trigger: 'workspace mutation', context_form: 'Ask first.' },
      },
      's',
    )

    expect(result).toMatchObject({ success: true })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'company_cortex_objects',
          method: 'insert',
          payload: expect.objectContaining({
            brain_id: 'brain-company',
            org_id: 'org-1',
            object_type: 'belief',
            source_signal_ids: ['signal-1'],
          }),
        }),
      ]),
    )
  })

  it('searches company cortex through the semantic RPC when embeddings are available', async () => {
    const calls: Call[] = []
    const handlers = new ArtifactCompanyCortexService().getHandlers(makeTarget(calls))

    const result = await handlers.search_company_brain(
      { brain_id: 'brain-company', query: 'approval before changes' },
      's',
    )

    expect(result).toMatchObject({ success: true, count: 1 })
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'search_company_cortex_objects',
          method: 'rpc',
          payload: expect.objectContaining({
            p_brain_id: 'brain-company',
            p_org_id: 'org-1',
          }),
        }),
      ]),
    )
  })
})
