import { type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { vi } from 'vitest'
import { AuthGuard, SupabaseServiceClient } from '@vibey/api-shared'
import { AppModule } from '../../app.module'
import { CreditsGuard } from '../../modules/billing/guards/credits.guard'
import { BrainAuthGuard } from '../../modules/brain/guards/brain-auth.guard'

/**
 * Integration test helpers for VibeyV2 API.
 *
 * Bootstraps a real NestJS app with:
 * - Auth guards bypassed (passthrough)
 * - Test user + mock Supabase injected via middleware
 * - SWC plugin in vitest.config.ts for decorator metadata support
 */

// Env vars must be set before NestJS modules load
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_test_service_role_key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_test_anon_key'
process.env.OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3200'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake_key'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_fake'
process.env.OPENCLAW_SESSIONS_DIR = process.env.OPENCLAW_SESSIONS_DIR || '/tmp/test-sessions'
process.env.COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'test-composio-key-ci'

export const TEST_USER = { id: 'test-user-id', email: 'test@example.com' }
export const TEST_CONVERSATION_ID = 'conv-test-001'

type RowFilter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'neq'; column: string; value: unknown }
  | { kind: 'is'; column: string; value: unknown }
  | { kind: 'in'; column: string; values: unknown[] }
  | { kind: 'contains'; column: string; value: Record<string, unknown> }

function rowMatchesFilters(row: Record<string, unknown>, filters: RowFilter[]): boolean {
  for (const f of filters) {
    const cell = row[f.column]
    switch (f.kind) {
      case 'eq':
        if (cell !== f.value) return false
        break
      case 'neq':
        if (cell === f.value) return false
        break
      case 'is':
        if (f.value === null || f.value === undefined) {
          if (cell != null) return false
        } else if (cell !== f.value) {
          return false
        }
        break
      case 'in':
        if (!f.values.includes(cell)) return false
        break
      case 'contains': {
        if (typeof cell !== 'object' || cell === null || Array.isArray(cell)) return false
        const obj = cell as Record<string, unknown>
        for (const [k, v] of Object.entries(f.value)) {
          if (obj[k] !== v) return false
        }
        break
      }
    }
  }
  return true
}

function filterTableRows(
  rows: Record<string, unknown>[],
  filters: RowFilter[],
): Record<string, unknown>[] {
  return rows.filter((r) => rowMatchesFilters(r, filters))
}

function buildFilterableChain(rows: Record<string, unknown>[]) {
  const filters: RowFilter[] = []

  const resolveListResult = () => ({
    data: filterTableRows(rows, filters),
    error: null as null,
  })

  const resolveSingleResult = () => {
    const filtered = filterTableRows(rows, filters)
    if (filtered.length === 0) {
      return {
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }
    }
    if (filtered.length > 1) {
      return {
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }
    }
    return { data: filtered[0], error: null as null }
  }

  const resolveMaybeSingleResult = () => {
    const filtered = filterTableRows(rows, filters)
    if (filtered.length === 0) {
      return { data: null, error: null as null }
    }
    if (filtered.length > 1) {
      return {
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }
    }
    return { data: filtered[0], error: null as null }
  }

  const chain: any = {}
  const passthroughMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'gt',
    'gte',
    'lt',
    'lte',
    'not',
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
  ]
  for (const m of passthroughMethods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  chain.eq = vi.fn((column: string, value: unknown) => {
    filters.push({ kind: 'eq', column, value })
    return chain
  })
  chain.neq = vi.fn((column: string, value: unknown) => {
    filters.push({ kind: 'neq', column, value })
    return chain
  })
  chain.is = vi.fn((column: string, value: unknown) => {
    filters.push({ kind: 'is', column, value })
    return chain
  })
  chain.in = vi.fn((column: string, values: unknown[]) => {
    filters.push({ kind: 'in', column, values })
    return chain
  })
  chain.contains = vi.fn((column: string, value: Record<string, unknown>) => {
    filters.push({ kind: 'contains', column, value })
    return chain
  })

  chain.single = vi.fn(async () => resolveSingleResult())
  chain.maybeSingle = vi.fn(async () => resolveMaybeSingleResult())

  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(resolveListResult()).then(resolve, reject)
  chain.catch = (reject: any) => Promise.resolve(resolveListResult()).catch(reject)

  return chain
}

export function createMockSupabase(tableResponses: Record<string, any> = {}) {
  const defaultResult = { data: null, error: null }

  function buildChain(result: any = defaultResult) {
    const chain: any = {}
    const methods = [
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
    ]
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain)
    }
    chain.single = vi.fn().mockResolvedValue(result)
    chain.maybeSingle = vi.fn().mockResolvedValue(result)
    chain.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
    chain.catch = (reject: any) => Promise.resolve(result).catch(reject)
    return chain
  }

  return {
    from: vi.fn((table: string) => {
      const raw = tableResponses[table] ?? defaultResult
      if (Array.isArray(raw)) {
        const asRows = raw as Record<string, unknown>[]
        return buildFilterableChain(asRows)
      }
      return buildChain(raw)
    }),
    rpc: vi.fn().mockResolvedValue(defaultResult),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: TEST_USER },
        error: null,
      }),
    },
  }
}

class PassthroughGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return true
  }
}

export type CreateTestAppOptions = {
  /** When true, OrgContextGuard and other DI consumers see the same mock as request.supabase */
  overrideSupabaseServiceClient?: boolean
}

export async function createTestApp(
  supabaseMock?: any,
  options?: CreateTestAppOptions,
): Promise<INestApplication> {
  const mockSupa = supabaseMock ?? createMockSupabase()

  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useClass(PassthroughGuard)
    .overrideGuard(BrainAuthGuard)
    .useClass(PassthroughGuard)
    .overrideGuard(CreditsGuard)
    .useClass(PassthroughGuard)

  if (options?.overrideSupabaseServiceClient) {
    moduleBuilder = moduleBuilder
      .overrideProvider(SupabaseServiceClient)
      .useValue({ client: mockSupa })
  }

  const moduleRef = await moduleBuilder.compile()

  const app = moduleRef.createNestApplication({ rawBody: true })
  app.setGlobalPrefix('api')

  app.use((req: any, _res: any, next: any) => {
    req.user = TEST_USER
    req.supabase = mockSupa
    next()
  })

  await app.init()
  return app
}

export type CreateOrgTestAppOptions = {
  orgId: string
  tableData: Record<string, unknown[]>
}

/**
 * Integration app for org-scoped routes: binds the mock to SupabaseServiceClient (OrgContextGuard),
 * seeds org_members for TEST_USER when not provided, and uses filterable table rows (arrays) so
 * .eq/.is/.in chain filters apply before single/maybeSingle/list resolution.
 */
export async function createOrgTestApp(
  options: CreateOrgTestAppOptions,
): Promise<{ app: INestApplication; orgId: string }> {
  const merged: Record<string, unknown[]> = { ...options.tableData }
  if (!Object.prototype.hasOwnProperty.call(merged, 'org_members')) {
    merged.org_members = [
      {
        id: 'integration-test-org-member',
        org_id: options.orgId,
        user_id: TEST_USER.id,
        role: 'owner',
        status: 'active',
      },
    ]
  }

  const mockSupa = createMockSupabase(merged as Record<string, any>)
  const app = await createTestApp(mockSupa, { overrideSupabaseServiceClient: true })
  return { app, orgId: options.orgId }
}
