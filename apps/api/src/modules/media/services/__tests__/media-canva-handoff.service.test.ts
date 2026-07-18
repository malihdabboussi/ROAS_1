import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaCanvaHandoffService } from '../media-canva-handoff.service'

describe('MediaCanvaHandoffService', () => {
  const mediaService = { getAsset: vi.fn() }
  const mediaReader = { getSignedUrl: vi.fn() }
  const canvaRepository = { listConnections: vi.fn() }
  const canvaIntegration = { createImageDesign: vi.fn(), importDesign: vi.fn() }
  let service: MediaCanvaHandoffService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MediaCanvaHandoffService(
      mediaService as never,
      mediaReader as never,
      canvaRepository as never,
      canvaIntegration as never,
    )
  })

  function connectCanva() {
    canvaRepository.listConnections.mockResolvedValue([
      {
        user_id: 'user-1',
        status: 'connected',
        scope_mode: 'personal',
        metadata: { composio_connected_account_id: 'ca_1' },
      },
    ])
  }

  it('returns NOT_CONNECTED when Canva is missing', async () => {
    mediaService.getAsset.mockResolvedValue({ id: 'asset-1', asset_type: 'image' })
    canvaRepository.listConnections.mockResolvedValue([])

    const result = await service.createImageHandoff(
      { id: 'user-1' },
      { orgId: 'org-1' } as never,
      'asset-1',
    )

    expect(result).toMatchObject({ success: false, code: 'NOT_CONNECTED' })
    expect(canvaIntegration.createImageDesign).not.toHaveBeenCalled()
  })

  it('imports the original image and returns the Canva edit URL', async () => {
    mediaService.getAsset.mockResolvedValue({
      id: 'asset-1',
      asset_type: 'image',
      name: 'Hero',
      public_url: 'https://cdn.example.com/a.png',
      width: 1200,
      height: 800,
    })
    mediaReader.getSignedUrl.mockResolvedValue('https://signed.example.com/a.png')
    connectCanva()
    canvaIntegration.createImageDesign.mockResolvedValue({
      editUrl: 'https://www.canva.com/design/DA_1/edit',
      designId: 'DA_1',
    })

    const result = await service.createImageHandoff(
      { id: 'user-1' },
      { orgId: 'org-1' } as never,
      'asset-1',
    )

    expect(result).toEqual({
      success: true,
      edit_url: 'https://www.canva.com/design/DA_1/edit',
      design_id: 'DA_1',
    })
    expect(canvaIntegration.createImageDesign).toHaveBeenCalledWith({
      connection: { executionUserId: 'user-1', connectedAccountId: 'ca_1' },
      imageUrl: 'https://signed.example.com/a.png',
      title: 'Hero',
      width: 1200,
      height: 800,
    })
  })

  it('imports PPTX as a design instead of flattening it as an image asset', async () => {
    connectCanva()
    canvaIntegration.importDesign.mockResolvedValue({
      editUrl: 'https://www.canva.com/design/DA_DECK/edit',
      designId: 'DA_DECK',
    })

    const result = await service.importDesign({ id: 'user-1' }, { orgId: 'org-1' } as never, {
      buffer: Buffer.from('pptx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      title: 'Launch deck',
    })

    expect(result).toMatchObject({ success: true, design_id: 'DA_DECK' })
    expect(canvaIntegration.importDesign).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        title: 'Launch deck',
      }),
    )
  })
})
