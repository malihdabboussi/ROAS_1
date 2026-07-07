import { describe, expect, it, vi } from 'vitest'
import { OrgService } from '../org.service'

function makeQuery(result: { data?: unknown; error?: { message: string } | null }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeServiceClient() {
  const queues: Record<string, ReturnType<typeof makeQuery>[]> = {
    agents_registry: [
      makeQuery({ data: null, error: null }),
      makeQuery({ error: null }),
      makeQuery({ data: null, error: null }),
      makeQuery({ error: null }),
      makeQuery({ data: null, error: null }),
      makeQuery({ error: null }),
    ],
    org_credit_purchases: [makeQuery({ data: [], error: null }), makeQuery({ error: null })],
  }
  const client = {
    from: vi.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected table query: ${table}`)
      return query
    }),
  }
  return { client, queues }
}

describe('OrgService.createOrg', () => {
  it('creates the org, adds the owner, and seeds default agents and starter credits', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Acme' }),
      addMember: vi.fn().mockResolvedValue({ id: 'member-1' }),
    }
    const logger = { logError: vi.fn() }
    const serviceClient = makeServiceClient()
    const service = new OrgService(
      repo as never,
      logger as never,
      { client: serviceClient.client } as never,
    )

    await expect(
      service.createOrg({} as never, 'owner-1', { name: 'Acme', slug: 'acme' }),
    ).resolves.toEqual({ id: 'org-1', name: 'Acme' })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(repo.findBySlug).toHaveBeenCalledWith(expect.anything(), 'acme')
    expect(repo.create).toHaveBeenCalledWith(expect.anything(), 'owner-1', {
      name: 'Acme',
      slug: 'acme',
    })
    expect(repo.addMember).toHaveBeenCalledWith(expect.anything(), 'org-1', 'owner-1', 'owner', null)
    expect(serviceClient.client.from).toHaveBeenCalledWith('agents_registry')
    expect(serviceClient.client.from).toHaveBeenCalledWith('org_credit_purchases')
  })
})
