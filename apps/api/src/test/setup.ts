/**
 * Vitest global setup — common mocks for the API test suite.
 */
import { vi } from 'vitest'

// ── Environment Variables ────────────────────────────────────────────────
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_test_service_role_key'
process.env.SUPABASE_ANON_KEY = 'sb_test_anon_key'
process.env.OPENCLAW_GATEWAY_URL = 'http://localhost:3200'
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake'
process.env.OPENCLAW_SESSIONS_DIR = '/tmp/test-sessions'

// ── Supabase Client Mock ─────────────────────────────────────────────────

const CHAINABLE_QUERY_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not',
  'is',
  'like',
  'ilike',
  'order',
  'limit',
  'range',
  'filter',
  'match',
  'or',
  'and',
  'contains',
  'containedBy',
  'textSearch',
  'overlaps',
  'throwOnError',
  'returns',
] as const

export function createMockSupabaseChain(
  returnValue: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const promise = Promise.resolve(returnValue)

  for (const m of CHAINABLE_QUERY_METHODS) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  ;(chain as unknown as PromiseLike<typeof returnValue>).then = promise.then.bind(promise)
  ;(chain as unknown as Promise<typeof returnValue>).catch = promise.catch.bind(promise)
  ;(chain as unknown as Promise<typeof returnValue>).finally = promise.finally.bind(promise)

  chain.single = vi.fn().mockResolvedValue(returnValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(returnValue)

  chain.from = vi.fn().mockReturnValue(chain)

  return chain
}

// ── NestJS Logger Mock ───────────────────────────────────────────────────

export function createMockLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  }
}
