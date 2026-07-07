import { describe, expect, it } from 'vitest'
import { WordpressIntegration } from '../wordpress.integration'

function createIntegration(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    WORDPRESS_APP_PASSWORD_CALLBACK_URL:
      'https://api.govibey.com/api/integrations/wordpress/application-password/callback',
    WORDPRESS_COM_CLIENT_ID: 'client-id',
    WORDPRESS_COM_CLIENT_SECRET: 'client-secret',
    WORDPRESS_COM_REDIRECT_URI: 'https://api.govibey.com/api/integrations/wordpress/oauth/callback',
    ...overrides,
  }

  return new WordpressIntegration({
    get: (key: string) => values[key],
  } as any)
}

describe('WordpressIntegration', () => {
  it('normalizes self-hosted WordPress URLs to HTTPS origins', () => {
    const integration = createIntegration()

    expect(integration.normalizeSiteUrl('example.com/wp-admin?x=1#top')).toBe(
      'https://example.com/wp-admin',
    )
    expect(integration.normalizeSiteUrl('https://example.com/')).toBe('https://example.com')
  })

  it('rejects non-HTTPS self-hosted URLs outside localhost', () => {
    const integration = createIntegration()

    expect(() => integration.normalizeSiteUrl('http://example.com')).toThrow(/HTTPS/)
  })

  it('builds an application password authorization URL with signed callback state', () => {
    const integration = createIntegration()
    const url = new URL(
      integration.buildApplicationPasswordAuthorizationUrl('https://example.com', 'signed-state'),
    )

    expect(url.origin).toBe('https://example.com')
    expect(url.pathname).toBe('/wp-admin/authorize-application.php')
    expect(url.searchParams.get('app_name')).toBe('Vibey')
    expect(url.searchParams.get('app_id')).toBe('vibey-wordpress-integration')
    expect(url.searchParams.get('success_url')).toBe(
      'https://api.govibey.com/api/integrations/wordpress/application-password/callback?state=signed-state',
    )
  })

  it('builds a WordPress.com OAuth authorization URL', () => {
    const integration = createIntegration()
    const url = new URL(integration.buildWordpressComAuthorizationUrl('signed-state'))

    expect(url.origin).toBe('https://public-api.wordpress.com')
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.govibey.com/api/integrations/wordpress/oauth/callback',
    )
    expect(url.searchParams.get('state')).toBe('signed-state')
  })
})
