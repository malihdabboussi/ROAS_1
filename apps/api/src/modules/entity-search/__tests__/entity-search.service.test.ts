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
})
