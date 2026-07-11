import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryOperation = {
  method: string
  args: unknown[]
}

type TableQueryCall = {
  table: string
  operations: QueryOperation[]
}

const supabaseMockState = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  tableCalls: [] as TableQueryCall[],
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: supabaseMockState.createServerClient,
}))

function createQuery(table: string) {
  const call: TableQueryCall = { table, operations: [] }
  supabaseMockState.tableCalls.push(call)

  const query = {
    select: vi.fn((...args: unknown[]) => {
      call.operations.push({ method: 'select', args })
      return query
    }),
    eq: vi.fn((...args: unknown[]) => {
      call.operations.push({ method: 'eq', args })
      return query
    }),
    in: vi.fn((...args: unknown[]) => {
      call.operations.push({ method: 'in', args })
      return query
    }),
    limit: vi.fn((...args: unknown[]) => {
      call.operations.push({ method: 'limit', args })
      return query
    }),
    single: vi.fn(async () => {
      call.operations.push({ method: 'single', args: [] })
      if (table === 'user_profiles') return { data: { role: 'user' } }
      if (table === 'profiles') {
        return {
          data: {
            fly_machine_id: 'runtime-machine',
            agent_runtime_type: 'fly_machine',
            agent_runtime_url: null,
            onboarding_completed: true,
            account_mode: 'personal',
          },
        }
      }
      return { data: null }
    }),
    maybeSingle: vi.fn(async () => {
      call.operations.push({ method: 'maybeSingle', args: [] })
      if (table === 'org_members') return { data: { id: 'active-org-member' } }
      return { data: null }
    }),
  }

  return query
}

function installSupabaseMock() {
  supabaseMockState.tableCalls.length = 0
  supabaseMockState.getUser.mockReset()
  supabaseMockState.getSession.mockReset()
  supabaseMockState.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  supabaseMockState.getSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  })
  supabaseMockState.createServerClient.mockReturnValue({
    auth: {
      getUser: supabaseMockState.getUser,
      getSession: supabaseMockState.getSession,
    },
    from: vi.fn((table: string) => createQuery(table)),
  })
}

function createMiddlewareRequest(url: string): NextRequest {
  const nextUrl = new URL(url) as URL & { clone: () => URL }
  nextUrl.clone = () => new URL(nextUrl.toString())

  return {
    headers: new Headers(),
    cookies: { getAll: () => [] },
    nextUrl,
  } as unknown as NextRequest
}

describe('middleware access checks', () => {
  beforeEach(() => {
    vi.resetModules()
    installSupabaseMock()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('checks org membership existence without requiring a single active org row', async () => {
    const { middleware } = await import('./middleware')
    const request = createMiddlewareRequest('https://app.vibey.test/onboarding')

    const response = await middleware(request)

    expect(response.headers.get('location')).toBe('https://app.vibey.test/home')

    const orgMemberCall = supabaseMockState.tableCalls.find((call) => call.table === 'org_members')
    expect(orgMemberCall?.operations).toEqual([
      { method: 'select', args: ['id'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['status', 'active'] },
      { method: 'limit', args: [1] },
      { method: 'maybeSingle', args: [] },
    ])
  })

  it('keeps authenticated dev users on dashboard routes when verified auth is temporarily unavailable', async () => {
    supabaseMockState.getUser.mockRejectedValue(new Error('fetch failed'))
    supabaseMockState.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })
    const { middleware } = await import('./middleware')
    const request = createMiddlewareRequest('https://app.vibey.test/spaces')

    const response = await middleware(request)

    expect(response.headers.get('location')).toBeNull()
    expect(supabaseMockState.getSession).toHaveBeenCalled()
  })
})
