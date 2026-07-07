import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMock = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  insertError: null as { code?: string; message: string } | null,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        supabaseMock.inserts.push({ table, row })
        return Promise.resolve({ error: supabaseMock.insertError })
      },
    }),
  }),
}))

async function loadReporter() {
  vi.resetModules()
  return import('./server-error-reporter.server')
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('reportWebServerErrorNow', () => {
  beforeEach(() => {
    supabaseMock.inserts = []
    supabaseMock.insertError = null
    process.env.SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('writes app_errors and request_trace_events with source pointers', async () => {
    const { reportWebServerErrorNow } = await loadReporter()
    const request = new Request('https://app.test/api/tsx-repair', {
      method: 'POST',
      headers: {
        'x-vibey-request-id': 'request-1',
      },
    })

    await reportWebServerErrorNow({
      request,
      route: '/api/tsx-repair',
      feature: 'tsx_repair',
      error_code: 'TSX_REPAIR_TEST',
      error: new Error('repair failed'),
      stack: 'Error: repair failed\n    at POST (apps/web/src/app/api/tsx-repair/route.ts:59:11)',
      statusCode: 500,
    })
    await flushPromises()

    expect(supabaseMock.inserts.map((entry) => entry.table)).toContain('app_errors')
    expect(supabaseMock.inserts.map((entry) => entry.table)).toContain('request_trace_events')
    const appError = supabaseMock.inserts.find((entry) => entry.table === 'app_errors')?.row
    expect(appError).toEqual(
      expect.objectContaining({
        app: 'web',
        feature: 'tsx_repair',
        error_code: 'TSX_REPAIR_TEST',
        request_id: 'request-1',
        source_file: 'apps/web/src/app/api/tsx-repair/route.ts',
        source_line: 59,
      }),
    )
  })

  it('does nothing when service-role env is unavailable', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { reportWebServerErrorNow } = await loadReporter()

    await reportWebServerErrorNow({
      feature: 'test',
      error_code: 'TEST',
      message: 'missing env',
    })

    expect(supabaseMock.inserts).toEqual([])
    warn.mockRestore()
  })
})
