import { describe, expect, it } from 'vitest'
import { adRows, funnelRows, websiteRows } from '../artifact-view-rows'

describe('artifact-view-rows', () => {
  it('separates website funnels from funnel artifact rows', () => {
    const salesFunnel = {
      id: 'funnel-1',
      name: 'Sales Funnel',
      funnel_type: 'sales',
      status: 'draft',
      slug: 'sales',
      published_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    }
    const website = {
      id: 'website-1',
      name: 'Website',
      funnel_type: 'website',
      status: 'published',
      slug: 'website',
      published_url: 'https://example.com',
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-02T00:00:00.000Z',
    }

    expect(funnelRows([salesFunnel, website] as never)).toMatchObject([
      {
        id: 'funnel-1',
        title: 'Sales Funnel',
        groupValues: { type: 'sales', status: 'draft' },
        badges: [
          { label: 'sales', tone: 'blue' },
          { label: 'draft', tone: 'green' },
        ],
      },
    ])

    expect(websiteRows([salesFunnel, website] as never, { 'website-1': [{} as never] })).toMatchObject([
      {
        id: 'website-1',
        title: 'Website',
        subtitle: 'https://example.com',
        description: '1 blog post',
        groupValues: { type: 'website', status: 'published' },
      },
    ])
  })

  it('maps ad rows with ad set display names and source badges', () => {
    const rows = adRows(
      [
        {
          id: 'ad-1',
          headline: 'Headline',
          platform: 'instagram',
          placement: 'feed',
          primary_text: 'Primary copy',
          image_url: 'https://example.com/ad.png',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z',
          ad_format: 'SINGLE_IMAGE',
          ad_set_id: 'set-1',
          meta_effective_status: 'ACTIVE',
          source: 'meta',
        },
      ] as never,
      { 'set-1': 'Prospecting' },
    )

    expect(rows).toMatchObject([
      {
        id: 'ad-1',
        title: 'Headline',
        subtitle: 'instagram / feed',
        description: 'Primary copy',
        thumbnailUrl: 'https://example.com/ad.png',
        groupValues: {
          type: 'SINGLE_IMAGE',
          platform: 'instagram',
          placement: 'feed',
          status: 'ACTIVE',
          source: 'meta',
          ad_set_id: 'Prospecting',
        },
        badges: [
          { label: 'instagram', tone: 'blue' },
          { label: 'feed', tone: 'purple' },
          { label: 'meta', tone: 'green' },
        ],
      },
    ])
  })
})
