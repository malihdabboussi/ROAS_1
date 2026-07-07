import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMock = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
}))

vi.mock('@/lib/supabase', () => ({
  getServiceClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        supabaseMock.inserts.push({ table, row })
        return Promise.resolve({ error: null })
      },
    }),
  }),
}))

vi.mock(
  '@vibey/api-shared/observability',
  () => ({
    extractSourceCodePointer: () => ({}),
    normalizeRequestTraceEvent: (input: Record<string, unknown>) => input,
  }),
)

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('reportFunnelsServerErrorNow', () => {
  beforeEach(() => {
    supabaseMock.inserts = []
  })

  it('writes funnels app_errors and route events', async () => {
    const { reportFunnelsServerErrorNow } = await import('./server-error-reporter')
    const request = new Request('https://funnels.test/api/form-upload', {
      method: 'POST',
      headers: {
        'x-vibey-request-id': 'request-1',
      },
    })

    await reportFunnelsServerErrorNow({
      request,
      route: '/api/form-upload',
      feature: 'funnels_form_upload',
      error_code: 'FUNNELS_FORM_UPLOAD_STORAGE_FAILED',
      error: new Error('storage failed'),
      statusCode: 500,
    })
    await flushPromises()

    const appError = supabaseMock.inserts.find((entry) => entry.table === 'app_errors')?.row
    const routeEvent = supabaseMock.inserts.find(
      (entry) => entry.table === 'request_trace_events',
    )?.row

    expect(appError).toEqual(
      expect.objectContaining({
        app: 'funnels',
        category: 'server_route',
        feature: 'funnels_form_upload',
        error_code: 'FUNNELS_FORM_UPLOAD_STORAGE_FAILED',
        request_id: 'request-1',
      }),
    )
    expect(routeEvent).toEqual(
      expect.objectContaining({
        surface: 'funnels',
        event_type: 'exception',
        request_id: 'request-1',
      }),
    )
  })
})
