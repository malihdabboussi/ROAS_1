import { createHmac } from 'crypto'
import { describe, expect, it, vi } from 'vitest'
import { MetaIntegration } from './meta.integration'

function createMetaIntegration() {
  const config = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        META_APP_ID: 'app-1',
        META_APP_SECRET: 'secret-1',
        META_OAUTH_REDIRECT_URI: 'https://api.test/meta/callback',
        META_WEBHOOK_VERIFY_TOKEN: 'verify-1',
      }
      return values[key]
    }),
  }
  return new MetaIntegration(config as never, {} as never)
}

describe('MetaIntegration', () => {
  it('builds authorization URLs with configured OAuth state and scopes', () => {
    const integration = createMetaIntegration()

    const url = new URL(integration.buildAuthorizationUrl('state-1'))

    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v25.0/dialog/oauth')
    expect(url.searchParams.get('client_id')).toBe('app-1')
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.test/meta/callback')
    expect(url.searchParams.get('state')).toBe('state-1')
    expect(url.searchParams.get('scope')).toContain('ads_management')
  })

  it('creates ad sets with the existing safe-targeting payload rules', async () => {
    const integration = createMetaIntegration()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'adset-1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      integration.createAdSet('token-1', 'act_1', {
        campaign_id: 'campaign-1',
        name: 'Ad Set',
        daily_budget: 1234.4,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        targeting: {
          geo_locations: { countries: ['WW'] },
          age_min: 35,
          age_max: 45,
          interests: [{ id: 'interest-1', name: 'Interest' }],
          publisher_platforms: ['facebook'],
        },
      }),
    ).resolves.toEqual({ id: 'adset-1' })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>
    const targeting = body.targeting as Record<string, unknown>
    expect(body.daily_budget).toBe(1234)
    expect(targeting.interests).toBeUndefined()
    expect(targeting.publisher_platforms).toBeUndefined()
    expect(targeting.geo_locations).toBeUndefined()
    expect(targeting.age_min).toBe(18)
    expect(targeting.age_max).toBe(65)
    expect(targeting.targeting_automation).toEqual({ advantage_audience: 1 })
    expect(body.appsecret_proof).toBe(
      createHmac('sha256', 'secret-1').update('token-1').digest('hex'),
    )
  })

  it('verifies Meta webhook signatures with the configured app secret', () => {
    const integration = createMetaIntegration()
    const rawBody = JSON.stringify({ entry: [] })
    const signature = createHmac('sha256', 'secret-1').update(rawBody).digest('hex')

    expect(integration.verifyWebhookSignature(rawBody, `sha256=${signature}`)).toBe(true)
    expect(integration.verifyWebhookSignature(rawBody, 'sha256=bad')).toBe(false)
    expect(integration.getWebhookVerifyToken()).toBe('verify-1')
  })
})
