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
