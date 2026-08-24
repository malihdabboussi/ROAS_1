import { describe, expect, it, vi } from 'vitest'
import { EntitySearchRepository } from '../repositories/entity-search.repository'
import { EntitySearchService } from '../services/entity-search.service'

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    in: vi.fn(() => query),
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
          personKind: 'portal_user',
          brainId: null,
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

  it('includes Slack-only people with Person Brains and deduplicates mapped portal users', async () => {
    const repository = {
      searchOrgRoster: vi.fn(async () => [
        {
          participant_id: 'participant-1',
          user_id: 'user-1',
          display_name: 'Bob Builder',
          role_label: 'Media buyer',
          avatar_url: null,
        },
      ]),
      searchManagedPeople: vi.fn(async () => [
        {
          id: 'slack-alias',
          vibey_user_id: 'user-1',
          display_name: 'Bob B.',
          relationship_kind: 'internal',
          person_brain_id: null,
          avatar_url: null,
        },
        {
          id: 'slack-ghost',
          vibey_user_id: null,
          display_name: 'Client Carol',
          relationship_kind: 'external',
          person_brain_id: 'brain-carol',
          avatar_url: 'https://example.com/carol.png',
        },
      ]),
      listDefaultUserBrains: vi.fn(async () => [{ id: 'brain-bob', owner_id: 'user-1' }]),
    }
    const service = new EntitySearchService(repository as never)

    await expect(
      service.search({} as never, 'user-1', 'org-1', '', ['person'], 10, 0, null),
    ).resolves.toEqual({
      results: [
        {
          kind: 'person',
          id: 'user-1',
          label: 'Bob Builder',
          subtitle: 'Media buyer',
          iconUrl: null,
          url: null,
          personKind: 'portal_user',
          brainId: 'brain-bob',
        },
        {
          kind: 'person',
          id: 'slack-ghost',
          label: 'Client Carol',
          subtitle: 'External · Person Brain',
          iconUrl: 'https://example.com/carol.png',
          url: null,
          personKind: 'managed_person',
          relationshipKind: 'external',
          brainId: 'brain-carol',
        },
      ],
    })
  })

  it('returns campaign and artifact results through the unified search contract', async () => {
    const repository = {
      searchPageGraderCampaignSpaces: vi.fn(async () => []),
      searchCampaigns: vi.fn(async () => [{ id: 'campaign-1', name: 'Launch strategy' }]),
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
          campaignIcon: null,
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

  it('finds Page Grader clients from campaign config and their requests by client name', async () => {
    const client = {
      id: 'campaign-client-1',
      name: 'Yasir Khan Coaching LTD',
      config: {
        external_sources: { page_grader: { client_id: 'pg-yasir' } },
      },
      context: {},
    }
    const request = {
      id: 'request-1',
      title: '8 Ad Graphics',
      space_id: 'space-1',
      status: 'approved_qc',
      custom_data: {
        page_grader_work_id: 'work-1',
        page_grader_client_id: 'pg-yasir',
      },
    }
    const repository = {
      searchPageGraderClients: vi.fn(async () => [client]),
      searchPageGraderRequests: vi.fn(async () => []),
      searchPageGraderRequestsByClientIds: vi.fn(async () => [request]),
    }
    const service = new EntitySearchService(repository as never)

    await expect(
      service.search({} as never, 'user-1', 'org-1', 'Yasir', ['client', 'request'], 10, 0),
    ).resolves.toEqual({
      results: [
        {
          kind: 'client',
          id: 'pg-yasir',
          label: 'Yasir Khan Coaching LTD',
          subtitle: 'Client',
          iconUrl: null,
          url: '/clients/pg-yasir',
          clientId: 'pg-yasir',
        },
        {
          kind: 'request',
          id: 'request-1',
          label: '8 Ad Graphics',
          subtitle: 'Yasir Khan Coaching LTD · Request · approved qc',
          iconUrl: null,
          url: '/spaces?space=space-1&item=request-1',
          clientId: 'pg-yasir',
          campaignId: null,
        },
      ],
    })
    expect(repository.searchPageGraderRequestsByClientIds).toHaveBeenCalledWith(
      {},
      'user-1',
      'org-1',
      ['pg-yasir'],
      10,
      0,
    )
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
