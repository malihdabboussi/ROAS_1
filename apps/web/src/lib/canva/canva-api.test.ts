import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importCanvaDesignFile, openCanvaDesignFile } from './canva-api'

const mocks = vi.hoisted(() => ({
  backendUpload: vi.fn(),
  connectComposioIntegration: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({ backendUpload: mocks.backendUpload }))
vi.mock('@/lib/integrations/connect-composio-integration', () => ({
  connectComposioIntegration: mocks.connectComposioIntegration,
}))

describe('Canva design import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads a native design file with its title and filename', async () => {
    mocks.backendUpload.mockResolvedValue({
      success: true,
      edit_url: 'https://www.canva.com/design/deck/edit',
    })
    const blob = new Blob(['pptx'])

    await importCanvaDesignFile({ blob, filename: 'launch.pptx', title: 'Launch deck' })

    const [path, body] = mocks.backendUpload.mock.calls[0] as [string, FormData]
    expect(path).toBe('/api/media/canva/import')
    expect(body.get('title')).toBe('Launch deck')
    expect((body.get('file') as File).name).toBe('launch.pptx')
    expect((body.get('file') as File).type).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
  })

  it('reuses the click-opened tab for the Canva editor URL', async () => {
    const replace = vi.fn()
    const pendingTab = { close: vi.fn(), location: { replace }, opener: window }
    vi.spyOn(window, 'open').mockReturnValue(pendingTab as unknown as Window)
    mocks.backendUpload.mockResolvedValue({
      success: true,
      edit_url: 'https://www.canva.com/design/doc/edit',
    })

    const result = await openCanvaDesignFile({
      title: 'Creative brief',
      createFile: async () => ({ blob: new Blob(['docx']), filename: 'brief.docx' }),
    })

    expect(result).toEqual({
      status: 'opened',
      editUrl: 'https://www.canva.com/design/doc/edit',
    })
    expect(replace).toHaveBeenCalledWith('https://www.canva.com/design/doc/edit')
    expect(pendingTab.close).not.toHaveBeenCalled()
  })

  it('retries the import in the same tab when Composio reuses a Canva connection', async () => {
    const replace = vi.fn()
    const pendingTab = { close: vi.fn(), location: { replace }, opener: window }
    vi.spyOn(window, 'open').mockReturnValue(pendingTab as unknown as Window)
    mocks.backendUpload
      .mockResolvedValueOnce({ success: false, code: 'NOT_CONNECTED' })
      .mockResolvedValueOnce({
        success: true,
        edit_url: 'https://www.canva.com/design/reused/edit',
      })
    mocks.connectComposioIntegration.mockResolvedValue({ status: 'already_connected' })

    await openCanvaDesignFile({
      title: 'Brief',
      createFile: async () => ({ blob: new Blob(['docx']), filename: 'brief.docx' }),
    })

    expect(mocks.backendUpload).toHaveBeenCalledTimes(2)
    expect(replace).toHaveBeenCalledWith('https://www.canva.com/design/reused/edit')
    expect(pendingTab.close).not.toHaveBeenCalled()
  })
})
