import { describe, expect, it, vi } from 'vitest'
import { FunnelsService } from './funnels.service'

function createService(overrides: {
  funnelsRepo?: Record<string, unknown>
  pagesRepo?: Record<string, unknown>
  filesRepo?: Record<string, unknown>
} = {}) {
  const funnelsRepo = {
    findById: vi.fn().mockResolvedValue({ id: 'funnel-1', org_id: 'org-1' }),
    ...overrides.funnelsRepo,
  }
  const pagesRepo = {
    findById: vi.fn().mockResolvedValue({ id: 'page-1', funnel_id: 'funnel-1' }),
    delete: vi.fn(),
    ...overrides.pagesRepo,
  }
  return new FunnelsService(
    funnelsRepo as never,
    pagesRepo as never,
    (overrides.filesRepo ?? {}) as never,
    {} as never,
    {} as never,
  )
}

describe('FunnelsService', () => {
  it('deletes a page only after verifying it belongs to the funnel', async () => {
    let deletedPageId: string | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'funnel_pages') throw new Error(`Unexpected table: ${table}`)
        return {
          delete: () => ({
            eq: async (_column: string, value: string) => {
              deletedPageId = value
              return { error: null }
            },
          }),
        }
      }),
    }
    const pagesRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'page-1', funnel_id: 'funnel-1' }),
      delete: vi.fn().mockImplementation(async (_supabase, pageId) => {
        deletedPageId = pageId
      }),
    }
    const service = createService({ pagesRepo })

    await expect(
      service.deletePage(supabase as never, 'funnel-1', 'page-1', 'org-1'),
    ).resolves.toBeUndefined()

    expect(deletedPageId).toBe('page-1')
  })

  it('upserts email capture conversion points for verified funnel pages', async () => {
    const operations: Array<Record<string, unknown>> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'funnel_conversion_points') throw new Error(`Unexpected table: ${table}`)
        const builder = {
          upsert: vi.fn((row: Record<string, unknown>, options: Record<string, unknown>) => {
            operations.push({ type: 'upsert', row, options })
            return builder
          }),
          select: vi.fn(() => builder),
          single: vi.fn(async () => ({
            data: { id: 'conversion-1', ...operations[0]?.row },
            error: null,
          })),
        }
        return builder
      }),
    }
    const service = createService()

    await expect(
      service.upsertEmailCaptureConversionPoint(
        supabase as never,
        'user-1',
        'funnel-1',
        'page-1',
        'org-1',
        { source: 'hero' },
      ),
    ).resolves.toMatchObject({
      id: 'conversion-1',
      funnel_id: 'funnel-1',
      funnel_page_id: 'page-1',
      kind: 'email_capture',
      config: { source: 'hero' },
      org_id: 'org-1',
    })

    expect(operations[0]).toMatchObject({
      type: 'upsert',
      options: { onConflict: 'funnel_page_id,kind' },
      row: {
        user_id: 'user-1',
        funnel_id: 'funnel-1',
        funnel_page_id: 'page-1',
        kind: 'email_capture',
        config: { source: 'hero' },
        org_id: 'org-1',
      },
    })
  })

  it('returns signed URLs for private bundle assets', async () => {
    const service = createService({
      pagesRepo: {
        findById: vi.fn().mockResolvedValue({ id: 'page-1', funnel_id: 'funnel-1' }),
      },
      filesRepo: {
        listForPage: vi.fn().mockResolvedValue([{ path: 'index.html', funnel_page_id: 'page-1' }]),
        listAssets: vi.fn().mockResolvedValue([
          {
            id: 'asset-1',
            media_assets: {
              bucket_name: 'campaigns',
              file_path: 'asset.png',
              public_url: null,
            },
          },
        ]),
      },
    })
    const supabase = {
      storage: {
        from: vi.fn((bucket: string) => ({
          createSignedUrl: vi.fn(async (path: string) => ({
            data: { signedUrl: `https://signed.example/${bucket}/${path}` },
          })),
        })),
      },
    }

    await expect(
      service.getPageBundle(supabase as never, 'funnel-1', 'page-1', 'org-1'),
    ).resolves.toMatchObject({
      assets: [
        {
          id: 'asset-1',
          url: 'https://signed.example/campaigns/asset.png',
          signed_url: 'https://signed.example/campaigns/asset.png',
        },
      ],
    })
  })
})
