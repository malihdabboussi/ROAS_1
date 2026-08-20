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

describe('PageGraderIntegration.listClients', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks Portal for every pipeline stage so intake clients are not dropped', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ clients: [{ id: 'c1', name: 'Intake', status: 'new_client_intake' }] }),
        {
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const clients = await new PageGraderIntegration().listClients(
      'https://portal.example/functions/v1/roas-api',
      'secret-api-key',
      { limit: 100, offset: 0 },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://portal.example/functions/v1/roas-api/clients?limit=100&offset=0&include_all_statuses=true&include_inactive=true',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-api-key' }),
      }),
    )
    expect(clients).toEqual([{ id: 'c1', name: 'Intake', status: 'new_client_intake' }])
  })

  it('retries without all-status flags when Portal rejects them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unknown query parameter include_all_statuses' }), {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clients: [{ id: 'c1', name: 'Active' }] }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const clients = await new PageGraderIntegration().listClients(
      'https://portal.example/functions/v1/roas-api',
      'secret-api-key',
      { limit: 100, offset: 0 },
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://portal.example/functions/v1/roas-api/clients?limit=100&offset=0&include_all_statuses=true&include_inactive=true',
      expect.anything(),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://portal.example/functions/v1/roas-api/clients?limit=100&offset=0',
      expect.anything(),
    )
    expect(clients).toEqual([{ id: 'c1', name: 'Active' }])
  })
})

describe('PageGraderIntegration.listLaunches', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the Page Grader launches feed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'campaign-1:launch:2026-08-20',
              kind: 'launch',
              day_key: '2026-08-20',
              name: 'Fall Launch',
              client_id: 'client-1',
            },
          ],
          launches: [
            {
              id: 'campaign-1:launch:2026-08-20',
              kind: 'launch',
              day_key: '2026-08-20',
              name: 'Fall Launch',
              client_id: 'client-1',
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await new PageGraderIntegration().listLaunches(
      'https://portal.example/functions/v1/roas-api/',
      'secret-api-key',
      { q: 'Fall', clientId: 'client-1' },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://portal.example/functions/v1/roas-api/launches?q=Fall&client_id=client-1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-api-key' }),
      }),
    )
    expect(result).toEqual([
      expect.objectContaining({ id: 'campaign-1:launch:2026-08-20', kind: 'launch' }),
    ])
  })
})
