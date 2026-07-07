import { describe, expect, it, vi } from 'vitest'
import { BrainRetrievalArtifactsRepository } from '../../repositories/brain-retrieval-artifacts.repository'
import { BrainRetrievalRepository } from '../../repositories/brain-retrieval.repository'
import { BrainRerankerService } from '../brain-reranker.service'
import { BrainRetrievalService } from '../brain-retrieval.service'
import { BrainSufficiencyService } from '../brain-sufficiency.service'

function makeQuery(rows: unknown, single: unknown = null) {
  const filters: Array<{ method: 'eq' | 'in' | 'overlaps'; column: string; value: unknown }> = []
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'eq', column, value })
      return query
    }),
    is: vi.fn(() => query),
    in: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'in', column, value })
      return query
    }),
    overlaps: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'overlaps', column, value })
      return query
    }),
    neq: vi.fn(() => query),
    textSearch: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: single, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: filterRows(rows, filters), error: null })),
  }
  return query
}

function filterRows(
  rows: unknown,
  filters: Array<{ method: 'eq' | 'in' | 'overlaps'; column: string; value: unknown }>,
) {
  if (!Array.isArray(rows)) return rows
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return true
    const record = row as Record<string, unknown>
    return filters.every((filter) => {
      if (filter.method === 'eq') return record[filter.column] === filter.value
      if (filter.method === 'in')
        return Array.isArray(filter.value) && filter.value.includes(record[filter.column])
      if (filter.method === 'overlaps') {
        const rowValue = record[filter.column]
        return (
          Array.isArray(filter.value) &&
          Array.isArray(rowValue) &&
          rowValue.some((value) => filter.value.includes(value))
        )
      }
      return true
    })
  })
}

describe('Main API BrainRetrievalService', () => {
  it('uses shared hybrid retrieval contract for company exact-title matches', async () => {
    const brain = {
      id: 'brain-company',
      owner_id: 'owner-1',
      org_id: 'org-1',
      scope: 'company',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery([], brain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'company_cortex_objects') {
          return makeQuery([
            {
              id: 'object-approval',
              brain_id: 'brain-company',
              org_id: 'org-1',
              object_type: 'protocol',
              title: 'Approval before mutation',
              truth: 'Agents ask before creating workspace tasks.',
              status: 'active',
              confidence: 0.8,
              evidence_refs: [{ type: 'decision', id: 'signal-1' }],
              retrieval_rule: { trigger: 'workspace changes' },
              metadata: { source_path: 'company/standards' },
            },
          ])
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
    const permissions = {
      assertCanQueryBrain: vi.fn(async () => undefined),
    }
    const service = new BrainRetrievalService(
      permissions as any,
      { getEmbedding: vi.fn(async () => null) } as any,
      new BrainRerankerService(),
      new BrainSufficiencyService(),
      new BrainRetrievalRepository(),
      new BrainRetrievalArtifactsRepository(),
    )

    const result = await service.search(supabase as any, {
      family: 'company',
      brainId: 'brain-company',
      query: 'Approval before mutation',
      userId: 'user-1',
      orgId: 'org-1',
      orgRole: 'admin',
      requiredAccess: 'query',
      limit: 10,
    })

    expect(permissions.assertCanQueryBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      { orgId: 'org-1', orgRole: 'admin' },
      'brain-company',
    )
    expect(result).toMatchObject({
      success: true,
      family: 'company',
      count: 1,
      context_sufficient: true,
      results: [
        {
          id: 'object-approval',
          brain_id: 'brain-company',
          kind: 'company_object',
          title: 'Approval before mutation',
          source_type: 'company_cortex_object',
          source_id: 'object-approval',
          source_title: 'Approval before mutation',
          evidence_refs: [{ type: 'decision', id: 'signal-1' }],
        },
      ],
    })
    expect(result.results[0]!.scores.lexical).toBe(1)
  })

  it('filters retrieved candidates to requested kinds', async () => {
    const brain = {
      id: 'brain-customer',
      owner_id: 'owner-1',
      org_id: 'org-1',
      scope: 'customer',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery([], brain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'ns_memories') {
          return makeQuery([
            {
              id: 'mem-pricing',
              brain_id: 'brain-customer',
              content: 'Pricing anchor is customer-approved.',
              memory_type: 'customer_signal',
              source_type: 'conversation',
              source_id: 'conv-1',
              source_title: 'Pricing call',
              significance: 0.8,
              confidence: 0.9,
              metadata: {},
            },
          ])
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-pricing',
                brain_id: 'brain-customer',
                content: 'Pricing anchor is customer-approved.',
                memory_type: 'customer_signal',
                source_type: 'conversation',
                source_id: 'conv-1',
                source_title: 'Pricing call',
                significance: 0.8,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_avatar_discriminator_axes_lexical') {
          return {
            data: [
              {
                id: 'money',
                org_id: null,
                name: 'Money relationship',
                description: 'How the customer frames spend, risk, and return.',
                high_end_signature: 'ROI-confident',
                low_end_signature: 'cautious',
                status: 'active',
                recurrence_count: 0,
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const permissions = {
      assertCanQueryBrain: vi.fn(async () => undefined),
    }
    const service = new BrainRetrievalService(
      permissions as any,
      { getEmbedding: vi.fn(async () => null) } as any,
      new BrainRerankerService(),
      new BrainSufficiencyService(),
      new BrainRetrievalRepository(),
      new BrainRetrievalArtifactsRepository(),
    )

    const result = await service.search(supabase as any, {
      family: 'customer',
      brainId: 'brain-customer',
      query: 'pricing anchor',
      userId: 'user-1',
      orgId: 'org-1',
      orgRole: 'admin',
      requiredAccess: 'query',
      includeKinds: ['memory'],
      limit: 10,
    })

    expect(result.results).toEqual([
      expect.objectContaining({
        id: 'mem-pricing',
        kind: 'memory',
      }),
    ])
    expect(result.results).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'avatar_axis' })]),
    )
  })
})
