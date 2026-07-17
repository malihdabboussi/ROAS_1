import { describe, expect, it, vi } from 'vitest'
import { GoogleDriveDocumentExportController } from './google-drive-document-export.controller'

describe('GoogleDriveDocumentExportController', () => {
  it('creates a native Google Doc from validated HTML', async () => {
    const api = {
      createGoogleDoc: vi.fn().mockResolvedValue({
        id: 'google-doc-1',
        name: 'Launch plan',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: 'https://docs.google.com/document/d/google-doc-1/edit',
      }),
    }
    const controller = new GoogleDriveDocumentExportController(api as never)

    await expect(
      controller.createGoogleDoc(
        {} as never,
        { id: 'user-1' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        { title: 'Launch plan', html: '<p>Ship it.</p>' },
      ),
    ).resolves.toMatchObject({
      success: true,
      file: { id: 'google-doc-1' },
    })

    expect(api.createGoogleDoc).toHaveBeenCalledWith(
      {},
      'user-1',
      'Launch plan',
      '<p>Ship it.</p>',
      'org-1',
    )
  })
})
