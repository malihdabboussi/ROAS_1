import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactPresentationsService } from './artifact-presentations.service'

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  operation: 'insert' | 'update' | 'upsert' | 'delete' | null
  payload: unknown
  upsertOptions: Record<string, unknown> | undefined
  selectColumns: string | undefined
  orders: Array<{ column: string; options?: Record<string, unknown> }>
  limitValue: number | null
}

function makeQueryClient(
  handler: (
    record: QueryRecord,
    terminal: 'maybeSingle' | 'single' | 'then',
  ) => Promise<{ data: unknown; error: unknown }> | { data: unknown; error: unknown },
) {
  const records: QueryRecord[] = []
  const client = {
    from: vi.fn((table: string) => {
      const record: QueryRecord = {
        table,
        filters: {},
        operation: null,
        payload: null,
        upsertOptions: undefined,
        selectColumns: undefined,
        orders: [],
        limitValue: null,
      }
      records.push(record)
      const query: any = {
        select: vi.fn((columns?: string) => {
          record.selectColumns = columns
          return query
        }),
        eq: vi.fn((key: string, value: unknown) => {
          record.filters[key] = value
          return query
        }),
        order: vi.fn((column: string, options?: Record<string, unknown>) => {
          record.orders.push({ column, options })
          return query
        }),
        limit: vi.fn((value: number) => {
          record.limitValue = value
          return query
        }),
        insert: vi.fn((payload: unknown) => {
          record.operation = 'insert'
          record.payload = payload
          return query
        }),
        update: vi.fn((payload: unknown) => {
          record.operation = 'update'
          record.payload = payload
          return query
        }),
        upsert: vi.fn((payload: unknown, options?: Record<string, unknown>) => {
          record.operation = 'upsert'
          record.payload = payload
          record.upsertOptions = options
          return query
        }),
        delete: vi.fn(() => {
          record.operation = 'delete'
          return query
        }),
        maybeSingle: vi.fn(() => handler(record, 'maybeSingle')),
        single: vi.fn(() => handler(record, 'single')),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => Promise.resolve(handler(record, 'then')).then(resolve, reject),
      }
      return query
    }),
  }
  return { client, records }
}

function makeTarget(client: unknown) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => null),
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    resolveThemeId: vi.fn(async () => 'theme-1'),
    getUserClient: vi.fn(async () => client),
    emitProgress: vi.fn(async (onProgress?: (message: string) => void, message?: string) => {
      if (message) onProgress?.(message)
    }),
    isMissionSessionKey: vi.fn(() => false),
  }
}

describe('ArtifactPresentationsService', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('lists campaign presentations for the resolved user and campaign', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations') {
        return { data: [{ id: 'presentation-1', name: 'Launch Deck' }], error: null }
      }
      return { data: [], error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.list_presentations({}, 'session-1')

    expect(result).toEqual([{ id: 'presentation-1', name: 'Launch Deck' }])
    expect(records[0]).toMatchObject({
      table: 'presentations',
      selectColumns: '*',
      filters: { user_id: 'user-1', campaign_id: 'campaign-1' },
      orders: [{ column: 'created_at', options: { ascending: false } }],
    })
  })

  it('creates an HTML bundle presentation and persists its file rows', async () => {
    global.fetch = vi.fn(async () => new Response('ok')) as unknown as typeof fetch
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === 'insert') {
        return {
          data: {
            id: 'presentation-1',
            user_id: 'user-1',
            org_id: null,
            campaign_id: 'campaign-1',
            name: 'Launch Deck',
            status: 'draft',
          },
          error: null,
        }
      }
      if (record.table === 'presentation_files') {
        return {
          data: [{ presentation_id: 'presentation-1', path: 'index.html', role: 'entry' }],
          error: null,
        }
      }
      if (record.table === 'spaces') return { data: [], error: null }
      return { data: null, error: null }
    })
    const target = makeTarget(client)
    const handlers = new ArtifactPresentationsService().getHandlers(target)
    const progress: string[] = []

    const result = (await handlers.create_presentation(
      {
        name: 'Launch Deck',
        files: [{ path: 'index.html', content: '<!doctype html><body>Deck</body>' }],
      },
      'session-1',
      (message) => progress.push(message),
    )) as Record<string, unknown>

    expect(progress).toEqual([
      'Structuring your presentation',
      'Saving your presentation',
      'Presentation is ready',
    ])
    expect(result).toMatchObject({
      id: 'presentation-1',
      name: 'Launch Deck',
      ui_blocks: [
        expect.objectContaining({
          artifactType: 'presentation',
          artifactId: 'presentation-1',
          name: 'Launch Deck',
        }),
      ],
    })
    expect(records.find((record) => record.table === 'presentations')).toMatchObject({
      operation: 'insert',
      payload: expect.objectContaining({
        user_id: 'user-1',
        campaign_id: 'campaign-1',
        theme_id: 'theme-1',
        generated_html: null,
        metadata: {
          source_mode: 'html_bundle',
          entry_file: 'index.html',
          html_runtime_version: 1,
          slide_count: 0,
        },
      }),
    })
    expect(records.find((record) => record.table === 'presentation_files')).toMatchObject({
      operation: 'upsert',
      upsertOptions: { onConflict: 'presentation_id,path' },
      payload: [
        expect.objectContaining({
          presentation_id: 'presentation-1',
          user_id: 'user-1',
          path: 'index.html',
          role: 'entry',
          mime_type: 'text/html',
        }),
      ],
    })
  })

  it('stores the HTML slide count and removes the shell if bundle persistence fails', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === 'insert') {
        return {
          data: {
            id: 'presentation-1',
            user_id: 'user-1',
            org_id: null,
            campaign_id: 'campaign-1',
            name: 'Launch Deck',
          },
          error: null,
        }
      }
      if (record.table === 'presentation_files' && record.operation === 'upsert') {
        return { data: null, error: { message: 'bundle write failed' } }
      }
      if (record.table === 'presentations' && record.operation === 'delete') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    await expect(
      handlers.create_presentation(
        {
          name: 'Launch Deck',
          files: [
            {
              path: 'index.html',
              content:
                '<!doctype html><html><body><main class="deck"><section class="slide"></section><section class="slide"></section></main></body></html>',
            },
          ],
        },
        'session-1',
      ),
    ).rejects.toMatchObject({ message: 'bundle write failed' })

    expect(records.find((record) => record.table === 'presentations')).toMatchObject({
      payload: expect.objectContaining({
        metadata: expect.objectContaining({ slide_count: 2 }),
      }),
    })
    expect(
      records.find((record) => record.table === 'presentations' && record.operation === 'delete'),
    ).toMatchObject({ filters: { id: 'presentation-1', user_id: 'user-1' } })
  })

  it('rejects a full HTML bundle without index.html before creating a presentation', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === 'insert') {
        return {
          data: { id: 'presentation-1', user_id: 'user-1', org_id: null },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.create_presentation(
      {
        name: 'Broken Deck',
        files: [{ path: 'styles.css', content: '.slide { width: 1280px; }' }],
      },
      'session-1',
    )

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/BUNDLE_INVALID.*NOT saved.*index\.html/i),
    })
    expect(records.find((record) => record.table === 'presentations')).toBeUndefined()
  })

  it('writes a presentation file and marks the presentation as an HTML bundle', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === null) {
        return {
          data: { id: 'presentation-1', user_id: 'user-1', org_id: null },
          error: null,
        }
      }
      if (record.table === 'presentation_files') {
        return {
          data: [{ presentation_id: 'presentation-1', path: 'styles.css', role: 'source' }],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.write_presentation_file(
      { presentation_id: 'presentation-1', path: 'styles.css', content: 'body { color: red; }' },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      file: { presentation_id: 'presentation-1', path: 'styles.css', role: 'source' },
    })
    expect(records.find((record) => record.table === 'presentation_files')).toMatchObject({
      operation: 'upsert',
      payload: [
        expect.objectContaining({
          presentation_id: 'presentation-1',
          path: 'styles.css',
          mime_type: 'text/css',
          role: 'source',
        }),
      ],
    })
    expect(
      records.find((record) => record.table === 'presentations' && record.operation === 'update'),
    ).toMatchObject({
      payload: {
        generated_html: null,
        metadata: {
          source_mode: 'html_bundle',
          entry_file: 'index.html',
          html_runtime_version: 1,
        },
      },
      filters: { id: 'presentation-1' },
    })
  })

  it('rejects a malformed presentation file before upsert', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === null) {
        return {
          data: { id: 'presentation-1', user_id: 'user-1', org_id: null },
          error: null,
        }
      }
      if (record.table === 'presentation_files') {
        return {
          data: [{ presentation_id: 'presentation-1', path: 'styles.css', role: 'source' }],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.write_presentation_file(
      {
        presentation_id: 'presentation-1',
        path: 'styles.css',
        content: '.slide { width: 1280px;',
      },
      'session-1',
    )

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/BUNDLE_INVALID.*NOT saved.*styles\.css/i),
    })
    expect(
      records.find(
        (record) => record.table === 'presentation_files' && record.operation === 'upsert',
      ),
    ).toBeUndefined()
  })

  it('patches a presentation file only when the find text matches exactly once', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations') {
        return {
          data: { id: 'presentation-1', user_id: 'user-1', org_id: null },
          error: null,
        }
      }
      if (record.table === 'presentation_files' && record.operation === null) {
        return {
          data: {
            presentation_id: 'presentation-1',
            path: 'index.html',
            content: '<!doctype html><html><body>Old headline</body></html>',
          },
          error: null,
        }
      }
      if (record.table === 'presentation_files' && record.operation === 'upsert') {
        return {
          data: [{ presentation_id: 'presentation-1', path: 'index.html', role: 'entry' }],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.patch_presentation_file(
      {
        presentation_id: 'presentation-1',
        path: 'index.html',
        find: 'Old headline',
        replace: 'New headline',
      },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      file: { presentation_id: 'presentation-1', path: 'index.html', role: 'entry' },
    })
    expect(
      records.find(
        (record) => record.table === 'presentation_files' && record.operation === 'upsert',
      ),
    ).toMatchObject({
      payload: [
        expect.objectContaining({
          presentation_id: 'presentation-1',
          path: 'index.html',
          content: '<!doctype html><html><body>New headline</body></html>',
          role: 'entry',
        }),
      ],
    })
  })

  it('updates one generated_html presentation slide without changing sibling slides', async () => {
    const generatedHtml = [
      'const Deck = () => (',
      '  <main>',
      '    <section>One</section>',
      '    <section>Two</section>',
      '  </main>',
      ')',
      'export default Deck',
    ].join('\n')
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations' && record.operation === null) {
        return {
          data: { id: 'presentation-1', generated_html: generatedHtml },
          error: null,
        }
      }
      if (record.table === 'presentations' && record.operation === 'update') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.update_presentation_slide(
      {
        presentation_id: 'presentation-1',
        slide_index: 1,
        generated_html: '<section>Updated two</section>',
      },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      presentation_id: 'presentation-1',
      slide_index: 1,
      total_slides: 2,
    })
    const update = records.find(
      (record) => record.table === 'presentations' && record.operation === 'update',
    )
    expect(update).toMatchObject({
      filters: { id: 'presentation-1', user_id: 'user-1' },
    })
    expect(String((update?.payload as Record<string, unknown>).generated_html)).toContain(
      '<section>One</section>',
    )
    expect(String((update?.payload as Record<string, unknown>).generated_html)).toContain(
      '<section>Updated two</section>',
    )
  })

  it('attaches a media asset to a presentation path', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'presentations') {
        return {
          data: { id: 'presentation-1', user_id: 'user-1', org_id: null },
          error: null,
        }
      }
      if (record.table === 'media_assets') {
        return { data: { id: 'asset-1', mime_type: 'image/png', file_size: 42 }, error: null }
      }
      if (record.table === 'presentation_assets') {
        return {
          data: { presentation_id: 'presentation-1', media_asset_id: 'asset-1', path: 'hero.png' },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const handlers = new ArtifactPresentationsService().getHandlers(makeTarget(client))

    const result = await handlers.attach_presentation_asset(
      { presentation_id: 'presentation-1', media_asset_id: 'asset-1', path: 'hero.png' },
      'session-1',
    )

    expect(result).toEqual({
      success: true,
      asset: { presentation_id: 'presentation-1', media_asset_id: 'asset-1', path: 'hero.png' },
    })
    expect(records.find((record) => record.table === 'presentation_assets')).toMatchObject({
      operation: 'upsert',
      upsertOptions: { onConflict: 'presentation_id,path' },
      payload: expect.objectContaining({
        presentation_id: 'presentation-1',
        media_asset_id: 'asset-1',
        user_id: 'user-1',
        path: 'hero.png',
        mime_type: 'image/png',
        size_bytes: 42,
        role: 'asset',
      }),
    })
  })
})
