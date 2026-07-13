import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServiceClient = vi.fn()

vi.mock('./supabase', () => ({
  getServiceClient: () => getServiceClient(),
}))

function createQuery(result: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
  }
  return query
}

describe('resolveFunnelEntryBySlug', () => {
  beforeEach(() => {
    getServiceClient.mockReset()
  })

  it('does not resolve draft funnels from the public direct slug route', async () => {
    const funnelQuery = createQuery({
      data: {
        id: 'funnel-1',
        name: 'Draft funnel',
        title: 'Draft funnel',
        status: 'draft',
        slug: 'draft-funnel',
        hide_branding: false,
        metadata: null,
        user_id: 'user-1',
        home_page_id: null,
        funnel_type: null,
        layout: null,
      },
      error: null,
    })
    const pageQuery = createQuery({
      data: {
        id: 'page-1',
        generated_html: '<main>Draft</main>',
        generated_css: '',
        seo: null,
        page_type: 'landing',
        path: '/',
      },
      error: null,
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'funnels') return funnelQuery
        if (table === 'funnel_pages') return pageQuery
        return createQuery({ data: null, error: null })
      }),
    }
    getServiceClient.mockReturnValue(supabase)
    const { resolveFunnelEntryBySlug } = await import('./resolve-domain')

    const result = await resolveFunnelEntryBySlug('draft-funnel')

    expect(funnelQuery.eq).toHaveBeenCalledWith('status', 'published')
    expect(result).toBeNull()
  })
})

describe('funnel domain defaults', () => {
  it('uses the ROAS funnels host when the environment is absent', async () => {
    const previous = process.env.CLOUDFLARE_BASE_DOMAIN
    delete process.env.CLOUDFLARE_BASE_DOMAIN

    const { resolveFunnelsBaseDomain } = await import('./platform-urls')

    expect(resolveFunnelsBaseDomain()).toBe('sites.roas.io')

    if (previous === undefined) delete process.env.CLOUDFLARE_BASE_DOMAIN
    else process.env.CLOUDFLARE_BASE_DOMAIN = previous
  })
})
