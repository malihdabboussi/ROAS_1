import {
  applyOwnerScope,
  findOwnedFunnel,
  findOwnedFunnelPage,
  type OwnerScope,
} from './ownership.ts'

type QueryCall = {
  method: string
  args: unknown[]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(message ?? `Expected ${e}, got ${a}`)
}

function makeQuery(result: { data: unknown; error?: unknown }, calls: QueryCall[]) {
  const query = {
    select: (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      return query
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: 'eq', args })
      return query
    },
    is: (...args: unknown[]) => {
      calls.push({ method: 'is', args })
      return query
    },
    maybeSingle: async () => {
      calls.push({ method: 'maybeSingle', args: [] })
      return result
    },
  }
  return query
}

function makeSupabase(results: Record<string, Array<{ data: unknown; error?: unknown }>>) {
  const callsByTable = new Map<string, QueryCall[][]>()
  return {
    client: {
      from(table: string) {
        const tableResults = results[table]
        assert(tableResults && tableResults.length > 0, `Unexpected table ${table}`)
        const result = tableResults.shift()!
        const queryCalls: QueryCall[] = []
        const existing = callsByTable.get(table) ?? []
        existing.push(queryCalls)
        callsByTable.set(table, existing)
        return makeQuery(result, queryCalls)
      },
    },
    callsByTable,
  }
}

Deno.test('applyOwnerScope scopes personal queries by user_id and null org_id', () => {
  const calls: QueryCall[] = []
  const query = makeQuery({ data: null }, calls)

  applyOwnerScope(query, { userId: 'user-1', orgId: null })

  assertEquals(
    calls.filter((call) => call.method === 'eq').map((call) => call.args),
    [['user_id', 'user-1']],
  )
  assertEquals(
    calls.filter((call) => call.method === 'is').map((call) => call.args),
    [['org_id', null]],
  )
})

Deno.test('applyOwnerScope scopes org queries by org_id only', () => {
  const calls: QueryCall[] = []
  const query = makeQuery({ data: null }, calls)

  applyOwnerScope(query, { userId: 'user-1', orgId: 'org-1' })

  assertEquals(
    calls.filter((call) => call.method === 'eq').map((call) => call.args),
    [['org_id', 'org-1']],
  )
  assertEquals(
    calls.filter((call) => call.method === 'is'),
    [],
  )
})

Deno.test('findOwnedFunnel loads only funnels inside the caller owner scope', async () => {
  const { client, callsByTable } = makeSupabase({
    funnels: [
      {
        data: {
          id: 'funnel-1',
          user_id: 'user-1',
          org_id: null,
          funnel_type: 'lead-magnet',
        },
      },
    ],
  })

  const funnel = await findOwnedFunnel(client, { userId: 'user-1', orgId: null }, 'funnel-1')

  assertEquals(funnel?.id, 'funnel-1')
  const calls = callsByTable.get('funnels')![0]!
  assertEquals(
    calls.filter((call) => call.method === 'eq').map((call) => call.args),
    [
      ['id', 'funnel-1'],
      ['user_id', 'user-1'],
    ],
  )
  assertEquals(
    calls.filter((call) => call.method === 'is').map((call) => call.args),
    [['org_id', null]],
  )
})

Deno.test('findOwnedFunnel enforces website parent type for website page actions', async () => {
  const scope: OwnerScope = { userId: 'user-1', orgId: 'org-1' }
  const { client, callsByTable } = makeSupabase({
    funnels: [
      {
        data: {
          id: 'website-1',
          user_id: 'owner-user',
          org_id: 'org-1',
          funnel_type: 'website',
        },
      },
    ],
  })

  const funnel = await findOwnedFunnel(client, scope, 'website-1', { funnelType: 'website' })

  assertEquals(funnel?.id, 'website-1')
  const calls = callsByTable.get('funnels')![0]!
  assertEquals(
    calls.filter((call) => call.method === 'eq').map((call) => call.args),
    [
      ['id', 'website-1'],
      ['org_id', 'org-1'],
      ['funnel_type', 'website'],
    ],
  )
})

Deno.test(
  'findOwnedFunnelPage rejects a page when its parent funnel is outside scope',
  async () => {
    const { client } = makeSupabase({
      funnel_pages: [{ data: { id: 'page-1', funnel_id: 'funnel-1' } }],
      funnels: [{ data: null }],
    })

    const owned = await findOwnedFunnelPage(client, { userId: 'user-1', orgId: null }, 'page-1')

    assertEquals(owned, null)
  },
)

Deno.test(
  'findOwnedFunnelPage returns the page only after verifying the owned parent funnel',
  async () => {
    const { client, callsByTable } = makeSupabase({
      funnel_pages: [{ data: { id: 'page-1', funnel_id: 'website-1' } }],
      funnels: [
        {
          data: {
            id: 'website-1',
            user_id: 'user-1',
            org_id: null,
            funnel_type: 'website',
          },
        },
      ],
    })

    const owned = await findOwnedFunnelPage(client, { userId: 'user-1', orgId: null }, 'page-1', {
      funnelType: 'website',
    })

    assertEquals(owned?.page.id, 'page-1')
    assertEquals(owned?.funnel.id, 'website-1')
    assertEquals(
      callsByTable
        .get('funnel_pages')![0]!
        .filter((call) => call.method === 'eq')
        .map((call) => call.args),
      [['id', 'page-1']],
    )
    assertEquals(
      callsByTable
        .get('funnels')![0]!
        .filter((call) => call.method === 'eq')
        .map((call) => call.args),
      [
        ['id', 'website-1'],
        ['user_id', 'user-1'],
        ['funnel_type', 'website'],
      ],
    )
  },
)
