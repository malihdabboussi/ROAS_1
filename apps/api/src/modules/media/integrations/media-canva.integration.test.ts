import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaCanvaIntegration } from './media-canva.integration'

describe('MediaCanvaIntegration', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends native design bytes to Canva and polls the imported design', async () => {
    const composio = {
      getAccessTokenForToolkit: vi.fn().mockResolvedValue('canva-token'),
      executeTool: vi.fn(),
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ job: { id: 'job-1', status: 'in_progress' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            job: {
              id: 'job-1',
              status: 'success',
              result: {
                designs: [
                  {
                    id: 'design-1',
                    urls: { edit_url: 'https://www.canva.com/api/design/edit-1' },
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const integration = new MediaCanvaIntegration(composio as never)

    const result = await integration.importDesign({
      connection: { executionUserId: 'user-1', connectedAccountId: 'ca-1' },
      buffer: Buffer.from('native-file'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      title: 'Creative brief',
    })

    expect(result).toEqual({
      editUrl: 'https://www.canva.com/api/design/edit-1',
      designId: 'design-1',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.canva.com/rest/v1/imports',
      expect.objectContaining({ method: 'POST', body: new Uint8Array(Buffer.from('native-file')) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.canva.com/rest/v1/imports/job-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer canva-token' } }),
    )
  })
})
