import { describe, expect, it, vi } from 'vitest'
import { EntitySearchRepository } from '../repositories/entity-search.repository'
import { EntitySearchService } from '../services/entity-search.service'

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    ilike: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

describe('EntitySearchService', () => {
  it('returns personal profile results when searching people outside an org', async () => {
    const profileQuery = createQuery({
      data: [
        {
          id: 'user-1',
          full_name: 'Ada Lovelace',
          email: 'ada@example.com',
          avatar_url: 'https://example.com/avatar.png',
        },
      ],
      error: null,
    })
    const supabase = { from: vi.fn(() => profileQuery) }
    const service = new EntitySearchService(new EntitySearchRepository())

    await expect(
      service.search(supabase as never, 'user-1', null, 'Ada', ['person'], 10, 0, null),
    ).resolves.toEqual({
      results: [
        {
          kind: 'person',
          id: 'user-1',
          label: 'Ada Lovelace',
          subtitle: 'ada@example.com',
          iconUrl: 'https://example.com/avatar.png',
          url: null,
        },
      ],
    })

    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('returns sorted single-kind space results scoped to an org', async () => {
    const spacesQuery = createQuery({
      data: [{ id: 'space-1', title: 'Build', description: 'Work', updated_at: '2026-06-10' }],
      error: null,
    })
    const supabase = { from: vi.fn(() => spacesQuery) }
    const service = new EntitySearchService(new EntitySearchRepository())

    await expect(
      service.search(supabase as never, 'user-1', 'org-1', 'Build', ['space'], 5, 0, null),
    ).resolves.toEqual({
      results: [
        {
          kind: 'space',
          id: 'space-1',
          label: 'Build',
          subtitle: 'Work',
          iconUrl: null,
          url: '/spaces/space-1',
        },
      ],
    })

    expect(spacesQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('returns campaign and artifact results through the unified search contract', async () => {
    const repository = {
      searchCampaigns: vi.fn(async () => [
        { id: 'campaign-1', name: 'Launch strategy', icon: 'target' },
      ]),
    }
    const artifactService = {
      search: vi.fn(async () => ({
        items: [
          {
            kind: 'offer',
            id: 'offer-1',
            campaign_id: 'campaign-1',
            title: 'Launch offer',
          },
        ],
      })),
    }
    const service = new EntitySearchService(repository as never, artifactService as never)

    await expect(
      service.search(
        {} as never,
        'user-1',
        'org-1',
        'Launch',
        ['campaign', 'artifact'],
        10,
        0,
        null,
      ),
    ).resolves.toEqual({
      results: [
        {
          kind: 'campaign',
          id: 'campaign-1',
          label: 'Launch strategy',
          subtitle: 'Campaign',
          iconUrl: null,
          url: null,
          campaignIcon: 'target',
        },
        {
          kind: 'artifact',
          id: 'offer-1',
          label: 'Launch offer',
          subtitle: 'Offer',
          iconUrl: null,
          url: null,
          campaignId: 'campaign-1',
          artifactKind: 'offer',
        },
      ],
    })
  })

  it('does not truncate a blank account artifact listing to the search result limit', async () => {
    const items = Array.from({ length: 60 }, (_, index) => ({
      kind: 'presentation' as const,
      id: `presentation-${index}`,
      campaign_id: 'campaign-1',
      title: `Deck ${index}`,
    }))
    const artifactService = { search: vi.fn(async () => ({ items })) }
    const service = new EntitySearchService({} as never, artifactService as never)

    const result = await service.search(
      {} as never,
      'user-1',
      'org-1',
      '',
      ['artifact'],
      50,
      0,
      null,
    )

    expect(result.results).toHaveLength(60)
    expect(artifactService.search).toHaveBeenCalledWith({}, '', 'user-1', 'org-1')
  })

  it('returns searchable conversation documents and mission deliverables with usable targets', async () => {
    const repository = {
      searchSpaceItems: vi.fn(async () => []),
      searchConversationDocuments: vi.fn(async () => [
        {
          id: 'document-1',
          title: 'Impact pre-call strategy',
          document_type: 'pdf',
          conversation_id: 'conversation-1',
          campaign_id: 'campaign-1',
        },
      ]),
      searchDeliverables: vi.fn(async () => [
        {
          id: 'deliverable-1',
          title: 'Impact strategy output',
          type: 'doc',
          mission_id: 'mission-1',
          campaign_id: 'campaign-1',
        },
      ]),
    }
    const service = new EntitySearchService(repository as never)

    await expect(
      service.search({} as never, 'user-1', 'org-1', 'Impact', ['doc', 'deliverable'], 10, 0, null),
    ).resolves.toEqual({
      results: [
        {
          kind: 'doc',
          id: 'document-1',
          label: 'Impact pre-call strategy',
          subtitle: 'Document · pdf',
          iconUrl: null,
          url: '/team?c=conversation-1',
          campaignId: 'campaign-1',
        },
        {
          kind: 'deliverable',
          id: 'deliverable-1',
          label: 'Impact strategy output',
          subtitle: 'Deliverable · doc',
          iconUrl: null,
          url: '/mission-control?mission=mission-1',
          campaignId: 'campaign-1',
        },
      ],
    })
  })
})
