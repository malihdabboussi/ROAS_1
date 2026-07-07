import { describe, expect, it } from 'vitest'
import {
  buildLegacyIntegrationHttpRoute,
  getLegacyIntegrationRouteConfig,
} from './legacy-integration-routes'

describe('buildLegacyIntegrationHttpRoute', () => {
  it('resolves camelCase path params from normalized snake_case keys', () => {
    const route = buildLegacyIntegrationHttpRoute(
      {
        method: 'GET',
        path: '/api/integrations/fathom/recordings/:recordingId/transcript',
      },
      { recording_id: '149415442' },
    )

    expect(route).toEqual({
      method: 'GET',
      path: '/api/integrations/fathom/recordings/149415442/transcript',
    })
  })

  it('exposes Fathom recording transcript and summary routes', () => {
    expect(getLegacyIntegrationRouteConfig('fathom', 'get_transcript')).toEqual({
      method: 'GET',
      path: '/api/integrations/fathom/recordings/:recordingId/transcript',
    })
    expect(getLegacyIntegrationRouteConfig('fathom', 'get_summary')).toEqual({
      method: 'GET',
      path: '/api/integrations/fathom/recordings/:recordingId/summary',
    })
  })

  it('does not repeat consumed snake_case path params as query params', () => {
    const route = buildLegacyIntegrationHttpRoute(
      {
        method: 'GET',
        path: '/api/integrations/stripe/products/:productId',
        query_remainder: true,
      },
      { product_id: 'prod_123', expand: 'prices' },
    )

    expect(route).toEqual({
      method: 'GET',
      path: '/api/integrations/stripe/products/prod_123?expand=prices',
    })
  })

  it('throws an agent-action guidance error when a path param is missing', () => {
    expect(() =>
      buildLegacyIntegrationHttpRoute(
        {
          method: 'GET',
          path: '/api/integrations/fathom/recordings/:recordingId/transcript',
        },
        {},
      ),
    ).toThrow(/data\.params/)
  })

  it('builds WordPress list routes with query remainder', () => {
    const config = getLegacyIntegrationRouteConfig('wordpress', 'list_posts')
    expect(config).toEqual({
      method: 'GET',
      path: '/api/integrations/wordpress/posts',
      query_remainder: true,
    })

    const route = buildLegacyIntegrationHttpRoute(config!, {
      search: 'launch',
      status: 'draft',
      per_page: 20,
    })

    expect(route).toEqual({
      method: 'GET',
      path: '/api/integrations/wordpress/posts?search=launch&status=draft&per_page=20',
    })
  })

  it('builds WordPress update routes from post id params', () => {
    const config = getLegacyIntegrationRouteConfig('wordpress', 'update_post')
    expect(config).toEqual({
      method: 'PATCH',
      path: '/api/integrations/wordpress/posts/:postId',
    })

    const route = buildLegacyIntegrationHttpRoute(config!, {
      post_id: '123',
      title: 'Updated title',
    })

    expect(route).toEqual({
      method: 'PATCH',
      path: '/api/integrations/wordpress/posts/123',
      body: { title: 'Updated title' },
    })
  })

  it('builds SEO Research POST routes with params as request body', () => {
    const config = getLegacyIntegrationRouteConfig('dataforseo', 'google_serp')
    expect(config).toEqual({
      method: 'POST',
      path: '/api/integrations/dataforseo/serp/google/organic',
    })

    const route = buildLegacyIntegrationHttpRoute(config!, {
      keyword: 'ai landing page builder',
      location_code: 2840,
      language_code: 'en',
    })

    expect(route).toEqual({
      method: 'POST',
      path: '/api/integrations/dataforseo/serp/google/organic',
      body: {
        keyword: 'ai landing page builder',
        location_code: 2840,
        language_code: 'en',
      },
    })
  })
})
