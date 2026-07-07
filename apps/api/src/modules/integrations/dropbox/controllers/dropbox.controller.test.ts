import { describe, expect, it, vi } from 'vitest'
import { DropboxController } from './dropbox.controller'

describe('DropboxController upload asset refs', () => {
  it('returns an external asset_ref for uploaded Dropbox files', async () => {
    const api = {
      uploadFile: vi.fn().mockResolvedValue({
        id: 'id:dropbox-file-1',
        name: 'deck.pdf',
        path_display: '/Campaign/deck.pdf',
        path_lower: '/campaign/deck.pdf',
        '.tag': 'file',
        size: 120,
      }),
    }
    const controller = new DropboxController({} as never, api as never)

    await expect(
      controller.uploadFile({} as never, { id: 'user-1' }, {
        path: '/Campaign/deck.pdf',
        content: Buffer.from('pdf').toString('base64'),
        mode: 'add',
      }),
    ).resolves.toMatchObject({
      success: true,
      asset_ref: {
        kind: 'external_asset',
        provider: 'dropbox',
        external_id: 'id:dropbox-file-1',
        name: 'deck.pdf',
        file_path: '/Campaign/deck.pdf',
        file_size: 120,
      },
    })
  })
})
