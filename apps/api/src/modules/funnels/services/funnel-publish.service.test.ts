import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { FunnelPublishService } from './funnel-publish.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('FunnelPublishService', () => {
  it('defaults generated publish URLs to the ROAS funnels domain', async () => {
    const previous = process.env.CLOUDFLARE_BASE_DOMAIN
    delete process.env.CLOUDFLARE_BASE_DOMAIN
    const funnelRuntime = {
      createServiceClient: vi.fn().mockReturnValue({}),
      findGeneratedDomain: vi.fn().mockResolvedValue(null),
      findDomainConflict: vi.fn().mockResolvedValue(null),
      insertGeneratedDomain: vi.fn().mockResolvedValue(undefined),
    }
    const service = new FunnelPublishService(
      {} as never,
      {} as never,
      { addDomain: vi.fn().mockResolvedValue({ success: true }) } as never,
      undefined,
      funnelRuntime as never,
    )

    await expect((service as any).ensureUserSubdomain('12345678-user', null)).resolves.toBe(
      'user-12345678.sites.roas.io',
    )

    if (previous === undefined) delete process.env.CLOUDFLARE_BASE_DOMAIN
    else process.env.CLOUDFLARE_BASE_DOMAIN = previous
  })

  it('resolves slug, custom domain URL, and publish theme CSS during publish', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'funnels') {
          const builder = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            neq: vi.fn(() => builder),
            single: vi.fn(async () => ({ data: null, error: null })),
          }
          return builder
        }
        if (table === 'branding_themes') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    colors: { primary: '#111111', pageBackground: '#ffffff' },
                    font_heading: 'Inter',
                    font_body: 'Inter',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected service table: ${table}`)
      }),
    }
    vi.mocked(createClient).mockReturnValue(serviceClient as never)
    const pageUpdates: Array<Record<string, unknown>> = []
    const funnelUpdates: Array<Record<string, unknown>> = []
    const funnelsRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'funnel-1',
        name: 'Launch Site',
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        funnel_type: 'website',
        domain_id: 'domain-1',
        theme_id: 'theme-1',
        home_page_id: 'page-1',
        slug: null,
      }),
      update: vi.fn().mockImplementation(async (_supabase, _id, fields) => {
        funnelUpdates.push(fields)
        return { id: 'funnel-1', ...fields }
      }),
    }
    const pagesRepo = {
      findByFunnelId: vi.fn().mockResolvedValue([
        {
          id: 'page-1',
          generated_html: 'export default function Page() { return <main /> }',
          generated_css: '.page { color: black; }',
          order_index: 0,
          path: null,
        },
      ]),
      update: vi.fn().mockImplementation(async (_supabase, _id, fields) => {
        pageUpdates.push(fields)
        return { id: 'page-1', ...fields }
      }),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'domains') throw new Error(`Unexpected table: ${table}`)
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { domain_name: 'launch.example' },
                error: null,
              }),
            }),
          }),
        }
      }),
    }
    const service = new FunnelPublishService(
      funnelsRepo as never,
      pagesRepo as never,
      {} as never,
      undefined,
    )

    await expect(service.publishFunnel(supabase as never, 'funnel-1', 'org-1')).resolves.toEqual({
      success: true,
      slug: 'launch-site',
      url: 'https://launch.example/launch-site',
      status: 'published',
    })

    expect(pageUpdates[0]).toMatchObject({
      path: '/',
    })
    expect(String(pageUpdates[0]?.generated_css)).toContain('/* vibey-theme-vars:start */')
    expect(funnelUpdates[0]).toEqual({
      slug: 'launch-site',
      status: 'published',
      published_url: 'https://launch.example/launch-site',
    })
  })
})
