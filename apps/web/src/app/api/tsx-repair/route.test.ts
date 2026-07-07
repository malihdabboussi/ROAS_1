import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reporterMocks = vi.hoisted(() => ({
  reportWebServerError: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/observability/server-error-reporter.server', () => ({
  reportWebServerError: reporterMocks.reportWebServerError,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: supabaseMocks.getUser },
  })),
}))

function createRepairRequest() {
  return new NextRequest('https://app.vibey.test/api/tsx-repair', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vibey-request-id': 'req-tsx',
    },
    body: JSON.stringify({
      code: 'export default function Broken(){ return <div>Broken</div> }',
      error: 'ReferenceError: missing is not defined',
    }),
  })
}

describe('tsx repair route observability', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    reporterMocks.reportWebServerError.mockReset()
    supabaseMocks.getUser.mockReset()
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-tsx-repair' } } })
    process.env.OPENROUTER_API_KEY = 'openrouter-key'
    process.env.INTERNAL_API_TOKEN = 'internal-token'
    process.env.MAIN_API_URL = 'https://api.vibey.test'
  })

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.INTERNAL_API_TOKEN
    delete process.env.MAIN_API_URL
  })

  it('reports OpenRouter 5xx failures without changing the response contract', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response('upstream unavailable', { status: 503 }))

    const { POST } = await import('./route')
    const response = await POST(createRepairRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Repair failed' })
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.vibey.test/api/internal/provider-billing/attempts',
      expect.objectContaining({
        body: expect.stringContaining('"billingOwnerType":"personal"'),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.vibey.test/api/internal/provider-billing/attempts',
      expect.objectContaining({
        body: expect.stringContaining('"userId":"user-tsx-repair"'),
      }),
    )
    expect(reporterMocks.reportWebServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/api/tsx-repair',
        feature: 'tsx_repair',
        error_code: 'TSX_REPAIR_OPENROUTER_FAILED',
        message: 'OpenRouter returned 503',
        statusCode: 500,
        context: expect.objectContaining({
          upstream_status: 503,
          upstream_body: 'upstream unavailable',
        }),
      }),
    )
  })

  it('does not call OpenRouter when the repair request is unauthenticated', async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: null } })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { POST } = await import('./route')
    const response = await POST(createRepairRequest())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
