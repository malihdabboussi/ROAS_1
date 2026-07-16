import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaCanvaHandoffService } from '../media-canva-handoff.service'

describe('MediaCanvaHandoffService', () => {
  const composio = { executeTool: vi.fn() }
  const mediaService = { getAsset: vi.fn() }
  const mediaReader = { getSignedUrl: vi.fn() }
  const mediaRepository = {
    client: {
      from: vi.fn(),
    },
  }

  let service: MediaCanvaHandoffService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MediaCanvaHandoffService(
      composio as never,
      mediaService as never,
      mediaReader as never,
      mediaRepository as never,
    )
  })

  function mockConnectionQuery(rows: Array<Record<string, unknown>>) {
    const ordered = {
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    const scoped = {
      eq: vi.fn().mockReturnValue(ordered),
      is: vi.fn().mockReturnValue(ordered),
      order: ordered.order,
    }
    // allow chaining .eq().eq() then .order()
    scoped.eq.mockReturnValue(scoped)
    scoped.is.mockReturnValue(scoped)
    mediaRepository.client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(scoped),
      }),
    })
  }

  it('returns NOT_CONNECTED when Canva is missing', async () => {
    mediaService.getAsset.mockResolvedValue({
      id: 'asset-1',
      asset_type: 'image',
      name: 'Hero',
      public_url: 'https://cdn.example.com/a.png',
      width: 1080,
      height: 1080,
    })
    mockConnectionQuery([])

    const result = await service.createHandoff(
      { id: 'user-1' },
      { orgId: 'org-1' } as never,
      'asset-1',
    )

    expect(result).toEqual({
      success: false,
      code: 'NOT_CONNECTED',
      error: 'Canva is not connected. Connect it in Settings first.',
    })
    expect(composio.executeTool).not.toHaveBeenCalled()
  })

  it('imports the image and returns edit_url', async () => {
    mediaService.getAsset.mockResolvedValue({
      id: 'asset-1',
      asset_type: 'image',
      name: 'Hero',
      original_filename: 'hero.png',
      public_url: 'https://cdn.example.com/a.png',
      width: 1200,
      height: 800,
    })
    mediaReader.getSignedUrl.mockResolvedValue('https://signed.example.com/a.png')
    mockConnectionQuery([
      {
        user_id: 'user-1',
        status: 'connected',
        scope_mode: 'personal',
        metadata: { composio_connected_account_id: 'ca_1' },
      },
    ])

    composio.executeTool
      .mockResolvedValueOnce({
        successful: true,
        data: { job: { id: 'job_1' } },
      })
      .mockResolvedValueOnce({
        successful: true,
        data: { job: { status: 'success', asset: { id: 'canva_asset_1' } } },
      })
      .mockResolvedValueOnce({
        successful: true,
        data: {
          design: {
            id: 'DA_1',
            urls: { edit_url: 'https://www.canva.com/design/DA_1/edit' },
          },
        },
      })

    const result = await service.createHandoff(
      { id: 'user-1' },
      { orgId: 'org-1' } as never,
      'asset-1',
    )

    expect(result).toEqual({
      success: true,
      edit_url: 'https://www.canva.com/design/DA_1/edit',
      design_id: 'DA_1',
    })
    expect(composio.executeTool).toHaveBeenNthCalledWith(
      1,
      'CANVA_CREATE_URL_ASSET_UPLOAD_JOB',
      'user-1',
      { url: 'https://signed.example.com/a.png', name: 'Hero' },
      'ca_1',
    )
    expect(composio.executeTool).toHaveBeenNthCalledWith(
      3,
      'CANVA_POST_DESIGNS',
      'user-1',
      {
        title: 'Hero',
        asset_id: 'canva_asset_1',
        design_type: { type: 'custom', width: 1200, height: 800 },
      },
      'ca_1',
    )
  })
})
