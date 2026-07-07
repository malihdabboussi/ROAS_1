import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactFunnelsService } from './artifact-funnels.service'

const originalOpenRouterKey = process.env.OPENROUTER_API_KEY

function makeSupabaseMock(options?: { currentHtml?: string; currentCss?: string }) {
  const state = {
    inserted: null as Record<string, unknown> | null,
    updated: null as Record<string, unknown> | null,
    currentHtml:
      options?.currentHtml ?? 'const Current = () => <div>Current</div>\nexport default Current',
    currentCss: options?.currentCss ?? '',
  }

  const funnelPagesApi = {
    insert: (payload: Record<string, unknown>) => {
      state.inserted = payload
      return {
        select: () => ({
          single: async () => ({
            data: {
              id: 'page-1',
              funnel_id: String(payload.funnel_id ?? 'funnel-1'),
              generated_html: String(payload.generated_html ?? ''),
            },
            error: null,
          }),
        }),
      }
    },
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { generated_html: state.currentHtml, generated_css: state.currentCss },
          error: null,
        }),
      }),
    }),
    update: (payload: Record<string, unknown>) => {
      state.updated = payload
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: 'page-1',
                funnel_id: 'funnel-1',
                generated_html: String(payload.generated_html ?? state.currentHtml),
              },
              error: null,
            }),
            maybeSingle: async () => ({
              data: {
                id: 'page-1',
                funnel_id: 'funnel-1',
                generated_html: String(payload.generated_html ?? state.currentHtml),
              },
              error: null,
            }),
          }),
        }),
      }
    },
  }

  const conversionPointsApi = {
    upsert: () => ({
      select: () => ({
        single: async () => ({ data: { id: 'cp-1' }, error: null }),
      }),
    }),
    delete: () => ({
      eq: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  }

  return {
    state,
    client: {
      from: (table: string) => {
        if (table === 'funnel_pages') return funnelPagesApi
        if (table === 'funnel_conversion_points') return conversionPointsApi
        throw new Error(`Unexpected table ${table}`)
      },
    },
  }
}

function makeTarget(supabaseClient: Record<string, unknown>) {
  return {
    emitProgress: vi.fn(async () => undefined),
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => supabaseClient),
  }
}

function makeCrudSupabaseMock() {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = []
  const deletes: Array<{ table: string; filters: Record<string, unknown> }> = []

  const rowsFor = (table: string) => {
    if (table === 'funnels') {
      return [
        {
          id: 'funnel-1',
          user_id: 'user-1',
          org_id: null,
          campaign_id: 'campaign-1',
          name: 'Launch Funnel',
          slug: 'launch',
          funnel_type: 'website',
          status: 'draft',
          space_id: 'space-1',
          funnel_pages: [{ id: 'page-1', name: 'Home' }],
        },
      ]
    }
    if (table === 'media_assets') return [{ id: 'media-1', mime_type: 'image/png', file_size: 123 }]
    if (table === 'funnel_assets') {
      return [{ id: 'asset-1', funnel_id: 'funnel-1', path: 'assets/hero.png' }]
    }
    return []
  }

  const rowMatches = (row: Record<string, unknown>, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([key, value]) => row[key] === value)

  const makeBuilder = (table: string) => {
    const filters: Record<string, unknown> = {}
    let upsertPayload: Record<string, unknown> | null = null
    const builder: Record<string, any> = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'select', args })
        return builder
      }),
      eq: vi.fn((key: string, value: unknown) => {
        calls.push({ table, method: 'eq', args: [key, value] })
        filters[key] = value
        return builder
      }),
      is: vi.fn((key: string, value: unknown) => {
        calls.push({ table, method: 'is', args: [key, value] })
        filters[key] = value
        return builder
      }),
      order: vi.fn(async (...args: unknown[]) => {
        calls.push({ table, method: 'order', args })
        return { data: rowsFor(table).filter((row) => rowMatches(row, filters)), error: null }
      }),
      maybeSingle: vi.fn(async () => {
        calls.push({ table, method: 'maybeSingle', args: [] })
        return {
          data: rowsFor(table).find((row) => rowMatches(row, filters)) ?? null,
          error: null,
        }
      }),
      upsert: vi.fn((payload: Record<string, unknown>, ...args: unknown[]) => {
        calls.push({ table, method: 'upsert', args: [payload, ...args] })
        upsertPayload = payload
        upserts.push({ table, payload })
        return builder
      }),
      delete: vi.fn(() => {
        calls.push({ table, method: 'delete', args: [] })
        return builder
      }),
      single: vi.fn(async () => {
        calls.push({ table, method: 'single', args: [] })
        if (upsertPayload) return { data: { id: 'asset-1', ...upsertPayload }, error: null }
        return {
          data: rowsFor(table).find((row) => rowMatches(row, filters)) ?? null,
          error: null,
        }
      }),
      then: (resolve: (value: { error: null }) => unknown) => {
        if (table === 'funnel_assets') deletes.push({ table, filters: { ...filters } })
        return Promise.resolve(resolve({ error: null }))
      },
    }
    return builder
  }

  return {
    calls,
    upserts,
    deletes,
    client: {
      from: vi.fn((table: string) => makeBuilder(table)),
    },
  }
}

describe('ArtifactFunnelsService contract behavior', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = ''
  })

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey
  })

  it('rejects generated_html on add_funnel_page (TSX retired) without saving', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        name: 'Opt In',
        generated_html: 'const Page = () => <div>Page</div>\nexport default Page',
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('TSX_RETIRED')
    expect(supabase.state.inserted).toBeNull()
  })

  it('rejects generated_html on update_funnel_page (TSX retired) without overwriting', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.update_funnel_page(
      {
        funnel_page_id: 'page-1',
        generated_html: '<div>',
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('TSX_RETIRED')
    expect(supabase.state.updated).toBeNull()
  })

  it('no longer exposes patch_funnel_page or patch_website_page handlers', () => {
    const service = new ArtifactFunnelsService()
    const handlers = service.getHandlers({} as any)
    expect(handlers.patch_funnel_page).toBeUndefined()
    expect(handlers.patch_website_page).toBeUndefined()
  })

  it('routes create_website through createFunnel with funnel_type website', async () => {
    const service = new ArtifactFunnelsService()
    const target = {
      createFunnel: vi.fn(async (data: Record<string, unknown>) => ({
        success: true,
        ...data,
      })),
    }
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.create_website(
      { name: 'Brand Website', funnel_type: 'lead-magnet' },
      'session-1',
    )) as Record<string, unknown>

    expect(target.createFunnel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Brand Website', funnel_type: 'website' }),
      'session-1',
      undefined,
    )
    expect(result).toMatchObject({ success: true, funnel_type: 'website' })
  })

  it('normalizes add_website_page home defaults before delegating to addFunnelPage', async () => {
    const service = new ArtifactFunnelsService()
    const target = {
      addFunnelPage: vi.fn(async (data: Record<string, unknown>) => ({
        success: true,
        ...data,
      })),
    }
    const handlers = service.getHandlers(target as any)

    await handlers.add_website_page(
      { funnel_id: 'website-1', name: 'Home', slug: 'home', path: '/' },
      'session-1',
      undefined,
    )

    expect(target.addFunnelPage).toHaveBeenCalledWith(
      expect.objectContaining({
        funnel_id: 'website-1',
        page_type: 'home',
        path: '/',
      }),
      'session-1',
      undefined,
    )
  })

  it('rejects general-home-page only through safe homepage mapping guidance', async () => {
    const service = new ArtifactFunnelsService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => null),
      getUserClient: vi.fn(async () => ({
        from: () => ({
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => ({ data: { id: 'funnel-1', ...payload }, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      })),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      resolveThemeId: vi.fn(async () => null),
      isMissionSessionKey: vi.fn(() => false),
    }
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.create_funnel(
      { name: 'Home', funnel_type: 'general-home-page' },
      'session-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({ funnel_type: 'home-page' })
  })

  it('lists campaign funnels with user/org/campaign/type scoping', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeCrudSupabaseMock()
    const target = {
      ...makeTarget(supabase.client),
      resolveOrgId: vi.fn(() => null),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
    }
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.list_funnels(
      { funnel_type_filter: 'website' },
      'session-1',
    )) as Array<Record<string, unknown>>

    expect(result).toHaveLength(1)
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({ table: 'funnels', method: 'eq', args: ['user_id', 'user-1'] }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({ table: 'funnels', method: 'is', args: ['org_id', null] }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({
        table: 'funnels',
        method: 'eq',
        args: ['campaign_id', 'campaign-1'],
      }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({ table: 'funnels', method: 'eq', args: ['funnel_type', 'website'] }),
    )
  })

  it('returns a delete-confirm block for an owned funnel', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeCrudSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.delete_funnel({ funnel_id: 'funnel-1' }, 'session-1')) as Record<
      string,
      unknown
    >

    expect(result).toMatchObject({
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        expect.objectContaining({
          delete_action: 'delete_funnel',
          entity_id: 'funnel-1',
          entity_name: 'Launch Funnel',
        }),
      ],
    })
  })

  it('attaches and detaches funnel assets with the owned funnel scope', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeCrudSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const attachResult = (await handlers.attach_funnel_asset(
      { funnel_id: 'funnel-1', media_asset_id: 'media-1', path: 'assets/hero.png' },
      'session-1',
    )) as Record<string, unknown>
    const detachResult = (await handlers.detach_funnel_asset(
      { funnel_id: 'funnel-1', path: 'assets/hero.png' },
      'session-1',
    )) as Record<string, unknown>

    expect(attachResult).toMatchObject({ success: true })
    expect(supabase.upserts).toContainEqual(
      expect.objectContaining({
        table: 'funnel_assets',
        payload: expect.objectContaining({
          funnel_id: 'funnel-1',
          media_asset_id: 'media-1',
          path: 'assets/hero.png',
          mime_type: 'image/png',
          size_bytes: 123,
        }),
      }),
    )
    expect(detachResult).toMatchObject({ success: true, funnel_id: 'funnel-1' })
    expect(supabase.deletes).toContainEqual(
      expect.objectContaining({
        table: 'funnel_assets',
        filters: expect.objectContaining({ funnel_id: 'funnel-1', path: 'assets/hero.png' }),
      }),
    )
  })
})

function makeBundleSupabaseMock(options?: { pageSourceMode?: string }) {
  const state = {
    insertedPage: null as Record<string, unknown> | null,
    insertedFiles: [] as Record<string, unknown>[],
    deletedFiles: [] as Record<string, unknown>[],
    historyChangeSets: [] as Record<string, unknown>[],
    historyItems: [] as Record<string, unknown>[],
    conversionUpserts: 0,
    conversionDeletes: 0,
  }
  const pageSourceMode = options?.pageSourceMode ?? 'html_bundle'

  const funnelsApi = {
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'funnel-1',
              user_id: 'user-1',
              org_id: null,
              name: 'Funnel',
              funnel_type: 'lead-magnet',
              campaign_id: 'campaign-1',
              space_id: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  }

  const funnelPagesApi = {
    insert: (payload: Record<string, unknown>) => {
      state.insertedPage = payload
      return {
        select: () => ({
          single: async () => ({
            data: { id: 'page-1', funnel_id: 'funnel-1', ...payload },
            error: null,
          }),
        }),
      }
    },
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'page-1', source_mode: pageSourceMode },
            error: null,
          }),
        }),
        maybeSingle: async () => ({
          data: {
            id: 'page-1',
            funnel_id: 'funnel-1',
            generated_html: '',
            generated_css: '',
            source_mode: pageSourceMode,
          },
          error: null,
        }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: { id: 'page-1', funnel_id: 'funnel-1' },
            error: null,
          }),
        }),
      }),
    }),
  }

  const funnelFilesApi = {
    select: () => {
      const chain: any = {
        eq: () => chain,
        is: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        order: async () => ({ data: [], error: null }),
        or: () => chain,
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: [], error: null }),
      }
      return chain
    },
    insert: (payload: Record<string, unknown>) => {
      state.insertedFiles.push(payload)
      return {
        select: () => ({
          single: async () => ({
            data: { id: `file-${state.insertedFiles.length}`, ...payload },
            error: null,
          }),
        }),
      }
    },
    delete: () => {
      const chain: any = {
        filters: {} as Record<string, unknown>,
        eq: (field: string, value: unknown) => {
          chain.filters[field] = value
          return chain
        },
        is: (field: string, value: unknown) => {
          chain.filters[field] = value
          return chain
        },
        then: (resolve: (value: { error: null }) => unknown) => {
          state.deletedFiles.push({ ...chain.filters })
          return resolve({ error: null })
        },
      }
      return chain
    },
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'file-updated' }, error: null }),
        }),
      }),
    }),
  }

  const changeSetsApi = {
    insert: (payload: Record<string, unknown>) => {
      const row = { id: `change-${state.historyChangeSets.length + 1}`, ...payload }
      state.historyChangeSets.push(row)
      return {
        select: () => ({
          single: async () => ({ data: row, error: null }),
        }),
      }
    },
    update: () => {
      const chain: any = {
        eq: () => chain,
        is: () => chain,
        or: () => chain,
        then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
      }
      return chain
    },
  }

  const changeItemsApi = {
    insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
      const rows = Array.isArray(payload) ? payload : [payload]
      state.historyItems.push(...rows)
      return {
        select: () => ({
          single: async () => ({ data: rows[0] ?? null, error: null }),
        }),
      }
    },
  }

  const conversionPointsApi = {
    upsert: () => {
      state.conversionUpserts += 1
      return {
        select: () => ({ single: async () => ({ data: { id: 'cp-1' }, error: null }) }),
      }
    },
    delete: () => {
      state.conversionDeletes += 1
      return { eq: () => ({ eq: async () => ({ error: null }) }) }
    },
  }

  return {
    state,
    client: {
      from: (table: string) => {
        if (table === 'funnels') return funnelsApi
        if (table === 'funnel_pages') return funnelPagesApi
        if (table === 'funnel_files') return funnelFilesApi
        if (table === 'funnel_change_sets') return changeSetsApi
        if (table === 'funnel_change_items') return changeItemsApi
        if (table === 'funnel_conversion_points') return conversionPointsApi
        if (table === 'funnel_assets') return funnelFilesApi
        if (table === 'space_views') {
          throw new Error('space_views not needed')
        }
        throw new Error(`Unexpected table ${table}`)
      },
    },
  }
}

describe('ArtifactFunnelsService HTML bundle behavior', () => {
  it('saves add_funnel_page with files as html_bundle without TSX contract', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        name: 'Opt In',
        slug: 'opt-in',
        page_type: 'opt-in',
        files: [
          {
            path: 'index.html',
            role: 'entry',
            content:
              '<!doctype html><html><body><form data-vibey-capture><input name="email" /></form></body></html>',
          },
          { path: 'styles.css', role: 'style', content: '.hero { min-height: 80vh; }' },
        ],
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    expect(result.success).not.toBe(false)
    expect(supabase.state.insertedPage).toMatchObject({ source_mode: 'html_bundle' })
    expect(supabase.state.insertedFiles).toHaveLength(2)
    expect(supabase.state.conversionUpserts).toBe(1)
    expect(result.source_mode).toBe('html_bundle')
  })

  it('rejects add_funnel_page files without index.html entry', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        files: [{ path: 'styles.css', content: '.a { color: red; }' }],
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('index.html')
    expect(supabase.state.insertedPage).toBeNull()
  })

  it('saves the page but reports missing stylesheet refs as lint errors', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        name: 'Opt In',
        files: [
          {
            path: 'index.html',
            role: 'entry',
            content:
              '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hi</h1></body></html>',
          },
        ],
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    // Write-then-lint: the page saves, the missing ref comes back as a lint error.
    expect(result.success).not.toBe(false)
    expect(supabase.state.insertedPage).not.toBeNull()
    expect(String((result.bundle_errors as string[])?.join(' '))).toContain('styles.css')
  })

  it('requires explicit full-replacement intent for update_funnel_page files', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.update_funnel_page(
      {
        funnel_page_id: 'page-1',
        files: [
          {
            path: 'index.html',
            role: 'entry',
            content: '<!doctype html><html><body><h1>Replace</h1></body></html>',
          },
        ],
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('replace_entire_page')
    expect(supabase.state.insertedFiles).toHaveLength(0)
  })

  it('diff-applies explicit full replacements and records a grouped history set', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.update_funnel_page(
      {
        funnel_page_id: 'page-1',
        replace_entire_page: true,
        files: [
          {
            path: 'index.html',
            role: 'entry',
            content: '<!doctype html><html><body><h1>Replace</h1></body></html>',
          },
        ],
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).not.toBe(false)
    expect(supabase.state.deletedFiles).toHaveLength(0)
    expect(supabase.state.historyChangeSets).toHaveLength(1)
    expect(supabase.state.historyItems).toHaveLength(1)
  })

  it('saves valid files and rejects only the broken CSS file', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        name: 'Opt In',
        files: [
          {
            path: 'index.html',
            role: 'entry',
            content:
              '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hi</h1></body></html>',
          },
          { path: 'styles.css', role: 'style', content: '.hero { color: red;' },
        ],
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    // Page + entry saved; the broken stylesheet is rejected per-file with the reason.
    expect(result.success).not.toBe(false)
    expect(supabase.state.insertedPage).not.toBeNull()
    expect(supabase.state.insertedFiles.map((f) => f.path)).toEqual(['index.html'])
    const rejected = result.rejected_files as Array<{ path: string; error: string }>
    expect(rejected).toHaveLength(1)
    expect(rejected[0]!.path).toBe('styles.css')
    expect(rejected[0]!.error).toContain('unclosed')
    expect(String((result.bundle_errors as string[])?.join(' '))).toContain('styles.css')
  })

  it('rejects an invalid entry document outright (nothing saved)', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.add_funnel_page(
      {
        funnel_id: 'funnel-1',
        name: 'Opt In',
        files: [
          { path: 'index.html', role: 'entry', content: '<section><h1>Fragment</h1></section>' },
        ],
      },
      'session-1',
      undefined,
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('BUNDLE_INVALID')
    expect(String(result.error ?? '')).toContain('doctype')
    expect(supabase.state.insertedPage).toBeNull()
  })

  it('rejects broken CSS on write_funnel_file (single-file retry)', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.write_funnel_file(
      {
        funnel_id: 'funnel-1',
        path: 'shared/styles.css',
        content: '.hero { color: red;',
        role: 'style',
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error ?? '')).toContain('BUNDLE_INVALID')
    expect(supabase.state.insertedFiles).toHaveLength(0)
  })

  it('writes funnel-shared files when funnel_page_id is omitted', async () => {
    const service = new ArtifactFunnelsService()
    const supabase = makeBundleSupabaseMock()
    const target = makeTarget(supabase.client)
    const handlers = service.getHandlers(target as any)

    const result = (await handlers.write_funnel_file(
      {
        funnel_id: 'funnel-1',
        path: 'shared/styles.css',
        content: ':root { --color-primary: #10b981; }',
        role: 'style',
      },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(supabase.state.insertedFiles).toHaveLength(1)
    expect(supabase.state.insertedFiles[0]).toMatchObject({
      funnel_page_id: null,
      path: 'shared/styles.css',
    })
    expect(supabase.state.historyChangeSets).toHaveLength(1)
    expect(supabase.state.historyItems[0]).toMatchObject({
      path: 'shared/styles.css',
      operation: 'insert',
    })
  })
})
