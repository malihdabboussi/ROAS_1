import { describe, expect, it } from 'vitest'
import { BrainGraphRepository } from '../../repositories/brain-graph.repository'
import { GraphService } from '../graph.service'

type Call = { table: string; action: string }

function makeSupabase(calls: Call[]) {
  const chain = (table: string) => {
    const self: Record<string, unknown> = {
      select() {
        return self
      },
      eq() {
        return self
      },
      neq() {
        return self
      },
      in() {
        return self
      },
      order() {
        return self
      },
      limit() {
        return self
      },
      maybeSingle: async () => {
        calls.push({ table, action: 'maybeSingle' })
        if (table === 'ns_brains') {
          return { data: { id: 'brain-co', scope: 'company', org_id: 'org-1' }, error: null }
        }
        return { data: null, error: null }
      },
      then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
        calls.push({ table, action: 'then' })
        if (table === 'company_cortex_objects') {
          return Promise.resolve({
            data: [
              {
                id: 'obj-1',
                object_type: 'belief',
                title: 'Move fast',
                truth: 'Draft quickly',
                status: 'active',
                confidence: 0.8,
                source_signal_ids: ['sig-1'],
                retrieval_rule: {},
                metadata: {},
                created_at: '2026-05-19T00:00:00Z',
                updated_at: '2026-05-19T00:00:00Z',
              },
            ],
            error: null,
          }).then(resolve)
        }
        if (table === 'company_cortex_signals') {
          return Promise.resolve({
            data: [
              {
                id: 'sig-1',
                signal_type: 'belief',
                truth: 'signal truth',
                confidence: 0.6,
                status: 'merged',
                created_at: '2026-05-19T00:00:00Z',
                updated_at: '2026-05-19T00:00:00Z',
              },
            ],
            error: null,
          }).then(resolve)
        }
        if (table === 'company_cortex_object_edges') {
          return Promise.resolve({ data: [], error: null }).then(resolve)
        }
        return Promise.resolve({ data: [], error: null }).then(resolve)
      },
    }
    return self
  }
  return { from: chain }
}

describe('GraphService buildCompanyGraph', () => {
  it('returns company nodes, lineage edges, and stats.by_type', async () => {
    const calls: Call[] = []
    const service = new GraphService({} as never, {} as never, new BrainGraphRepository())
    const result = await service.buildGraph(makeSupabase(calls) as never, {
      brain_id: 'brain-co',
      org_id: 'org-1',
    })

    expect(result.nodes.some((n) => n.node_type === 'company_object')).toBe(true)
    expect(result.nodes.some((n) => n.node_type === 'company_signal')).toBe(true)
    expect(result.stats.by_type.belief).toBe(1)
    expect(result.stats.by_type.signal).toBe(1)
    expect(result.connections.some((c) => c.relationship_type === 'derived_from')).toBe(true)
  })
})
