import { BadRequestException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageGraderIntegration } from './page-grader.integration'

describe('PageGraderIntegration.getClientMetaContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads a validated client Meta context without returning connection credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          meta_context: {
            client: { id: 'client-1', name: 'Acme' },
            connected: true,
            accounts: [{ ad_account_id: 'act_123', active: true }],
            recommended_ad_account_id: 'act_123',
            pages: [],
            pixels: [],
            campaigns: [],
            provenance: {
              source: 'page_grader',
              generated_at: '2026-07-19T20:00:00.000Z',
            },
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await new PageGraderIntegration().getClientMetaContext(
      'https://portal.example/functions/v1/roas-api/',
      'secret-api-key',
      'client/one',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://portal.example/functions/v1/roas-api/clients/client%2Fone/meta-context',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-api-key' }),
      }),
    )
    expect(result.recommended_ad_account_id).toBe('act_123')
    expect(JSON.stringify(result)).not.toContain('secret-api-key')
  })

  it('rejects an invalid response instead of passing untrusted fields downstream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ meta_context: { access_token: 'leaked' } }), {
          status: 200,
        }),
      ),
    )

    await expect(
      new PageGraderIntegration().getClientMetaContext(
        'https://portal.example/functions/v1/roas-api',
        'secret-api-key',
        'client-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

describe('PageGraderIntegration.upsertClientMeeting', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends an idempotent meeting payload to the mapped client endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          meeting: { id: 'note-1', client_id: 'client-1' },
          unchanged: true,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await new PageGraderIntegration().upsertClientMeeting(
      'https://portal.example/functions/v1/roas-api/',
      'secret-api-key',
      'client/one',
      {
        source_meeting_id: 'meeting-1',
        meeting_title: 'Weekly call',
        meeting_date: '2026-07-22T16:00:00.000Z',
      },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://portal.example/functions/v1/roas-api/clients/client%2Fone/meetings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-api-key' }),
      }),
    )
    expect(result).toMatchObject({ unchanged: true, meeting: { id: 'note-1' } })
  })
})

describe('PageGraderIntegration.createEmbedSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a short-lived Portal handoff without exposing the connection key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'single-use-code',
          embed_url: 'https://portal.roas.io/embed?parent_origin=https%3A%2F%2Fapp.roas.io',
          expires_at: '2026-07-28T22:02:00.000Z',
        }),
        { status: 201 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await new PageGraderIntegration().createEmbedSession(
      'https://portal.example/functions/v1/roas-api/',
      'secret-api-key',
      {
        email: 'dylan@example.com',
        parentOrigin: 'https://app.roas.io',
        targetPath: '/clients',
      },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://portal.example/functions/v1/roas-api/embed/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-api-key' }),
        body: JSON.stringify({
          email: 'dylan@example.com',
          parent_origin: 'https://app.roas.io',
          target_path: '/clients',
        }),
      }),
    )
    expect(result.code).toBe('single-use-code')
    expect(JSON.stringify(result)).not.toContain('secret-api-key')
  })
})
