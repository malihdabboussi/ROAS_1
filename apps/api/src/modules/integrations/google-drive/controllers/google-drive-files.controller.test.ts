import { describe, expect, it, vi } from 'vitest'
import { GoogleDriveFilesController } from './google-drive-files.controller'

describe('GoogleDriveFilesController upload asset refs', () => {
  it('returns an external asset_ref for uploaded Drive files', async () => {
    const api = {
      uploadFile: vi.fn().mockResolvedValue({
        id: 'drive-file-1',
        name: 'notes.txt',
        mimeType: 'text/plain',
        size: '12',
        webViewLink: 'https://drive.example/notes',
        parents: ['folder-1'],
      }),
    }
    const controller = new GoogleDriveFilesController(api as never)

    await expect(
      controller.uploadFile(
        {} as never,
        { id: 'user-1' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        {
          name: 'notes.txt',
          mimeType: 'text/plain',
          content: Buffer.from('hello').toString('base64'),
          folderId: 'folder-1',
        },
      ),
    ).resolves.toMatchObject({
      success: true,
      asset_ref: {
        kind: 'external_asset',
        provider: 'google_drive',
        external_id: 'drive-file-1',
        name: 'notes.txt',
        mime_type: 'text/plain',
        file_size: 12,
        file_path: 'folder-1/notes.txt',
        url: 'https://drive.example/notes',
        org_id: 'org-1',
      },
    })
  })
})
