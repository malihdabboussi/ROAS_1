import { describe, expect, it, vi } from 'vitest'
import { EntityArtifactSearchRepository } from '../repositories/entity-artifact-search.repository'
import { EntityArtifactSearchService } from '../services/entity-artifact-search.service'

class Query {
  eqCalls: Array<[string, unknown]> = []
  ilikeCalls: Array<[string, unknown]> = []

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select() {
    return this
  }

  ilike(column: string, value: unknown) {
    this.ilikeCalls.push([column, value])
    return this
  }

  limit() {
    return this
  }

  neq() {
    return this
  }

  eq(column: string, value: unknown) {
    this.eqCalls.push([column, value])
    return this
  }

  is() {
    return this
  }

  or() {
    return this
  }

  then(resolve: (value: unknown) => void) {
    return Promise.resolve({ data: this.rows, error: null }).then(resolve)
  }
}

function supabaseWithTables(tables: Record<string, Array<Record<string, unknown>>>) {
  const queries: Record<string, Query[]> = {}
  return {
    queries,
    supabase: {
      from: vi.fn((table: string) => {
        const query = new Query(tables[table] ?? [])
        queries[table] = [...(queries[table] ?? []), query]
        return query
      }),
    },
  }
}

describe('EntityArtifactSearchService', () => {
  it('returns no items for blank search without querying', async () => {
    const { supabase } = supabaseWithTables({})
    const result = await new EntityArtifactSearchService(new EntityArtifactSearchRepository()).search(
      supabase as never,
      '   ',
      'org-1',
    )

    expect(result).toEqual({ items: [] })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('maps searchable artifacts and applies organization filtering', async () => {
    const { supabase, queries } = supabaseWithTables({
      offers: [{ id: 'offer-1', name: 'Launch offer', campaign_id: 'campaign-1' }],
      funnels: [
        { id: 'funnel-1', name: 'Launch funnel', campaign_id: 'campaign-1' },
        { id: 'website-1', name: 'Launch site', campaign_id: 'campaign-1' },
      ],
      ads: [{ id: 'ad-1', headline: 'Launch ad', primary_text: 'Body', campaign_id: 'campaign-1' }],
      social_posts: [
        { id: 'post-1', caption: 'Launch caption', headline: null, campaign_id: 'campaign-1' },
      ],
    })

    const result = await new EntityArtifactSearchService(new EntityArtifactSearchRepository()).search(
      supabase as never,
      'Launch',
      'org-1',
    )

    expect(result.items).toEqual(
      expect.arrayContaining([
        {
          kind: 'offer',
          id: 'offer-1',
          campaign_id: 'campaign-1',
          title: 'Launch offer',
        },
        {
          kind: 'funnel',
          id: 'funnel-1',
          campaign_id: 'campaign-1',
          title: 'Launch funnel',
        },
        {
          kind: 'website',
          id: 'website-1',
          campaign_id: 'campaign-1',
          title: 'Launch site',
        },
        {
          kind: 'ad',
          id: 'ad-1',
          campaign_id: 'campaign-1',
          title: 'Launch ad',
        },
        {
          kind: 'social_post',
          id: 'post-1',
          campaign_id: 'campaign-1',
          title: 'Launch caption',
        },
      ]),
    )
    expect(queries.offers[0]?.ilikeCalls).toContainEqual(['name', '%Launch%'])
    expect(queries.offers[0]?.eqCalls).toContainEqual(['org_id', 'org-1'])
  })
})
