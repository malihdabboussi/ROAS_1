import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { GoogleDriveApiService } from '../google-drive-api.service'
import { GoogleDriveComposioFilesService } from '../google-drive-composio-files.service'
import { GoogleDriveComposioMultiTabDocsService } from '../google-drive-composio-multi-tab-docs.service'
import { GoogleDriveComposioPayloadService } from '../google-drive-composio-payload.service'
import { GoogleDriveContentCacheService } from '../google-drive-content-cache.service'

describe('GoogleDriveApiService', () => {
  function createService(
    composio: {
      executeTool: ReturnType<typeof vi.fn>
      getAccessTokenForToolkit?: ReturnType<typeof vi.fn>
    },
    repo: { findConnectionMode: ReturnType<typeof vi.fn> },
  ) {
    const payload = new GoogleDriveComposioPayloadService()
    return new GoogleDriveApiService(
      repo as never,
      new GoogleDriveComposioFilesService(composio as never, payload),
      new GoogleDriveComposioMultiTabDocsService(composio as never, payload),
      new GoogleDriveContentCacheService(),
    )
  }

  it('uses the connected Composio account for file listing', async () => {
    const composio = {
      executeTool: vi.fn().mockResolvedValue({
        files: [{ id: 'file-1', name: 'Doc', mimeType: 'application/vnd.google-apps.document' }],
      }),
    }
    const repo = {
      findConnectionMode: vi.fn().mockResolvedValue({
        status: 'connected',
        metadata: { composio_connected_account_id: 'account-1' },
      }),
    }
    const service = createService(composio, repo)

    await expect(
      service.listFiles({} as never, 'user-1', { folderId: 'folder-1' }, null),
    ).resolves.toEqual({
      files: [{ id: 'file-1', name: 'Doc', mimeType: 'application/vnd.google-apps.document' }],
      nextPageToken: undefined,
    })

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLEDRIVE_LIST_FILES',
      'user-1',
      expect.objectContaining({ q: "trashed = false and 'folder-1' in parents" }),
      'account-1',
    )
  })

  it('rejects file listing when Drive has no connected account metadata', async () => {
    const repo = {
      findConnectionMode: vi.fn().mockResolvedValue({
        status: 'connected',
        metadata: {},
      }),
    }
    const service = createService({ executeTool: vi.fn() }, repo)

    await expect(service.listFiles({} as never, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('downloads exported Composio file content from base64 payloads', async () => {
    const csv = 'name,email\nVibey,vibey@example.com'
    const composio = {
      executeTool: vi.fn().mockResolvedValue({
        data: {
          downloaded_file_content: {
            base64: Buffer.from(csv).toString('base64'),
            mimeType: 'text/csv',
          },
        },
      }),
    }
    const repo = {
      findConnectionMode: vi.fn().mockResolvedValue({
        status: 'connected',
        metadata: { composio_connected_account_id: 'account-1' },
      }),
    }
    const service = createService(composio, repo)

    const result = await service.downloadFile(
      {} as never,
      'user-1',
      'file-1',
      'application/vnd.google-apps.spreadsheet',
      null,
      'text/csv',
    )

    expect(result).toEqual({
      buffer: Buffer.from(csv),
      exportMimeType: 'text/csv',
      exportExt: '.csv',
    })
    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLEDRIVE_DOWNLOAD_FILE',
      'user-1',
      { file_id: 'file-1', mime_type: 'text/csv' },
      'account-1',
    )
  })

  it('creates an editable native Google Doc through the connected Drive account', async () => {
    const composio = {
      executeTool: vi.fn().mockResolvedValue({
        successful: true,
        data: {
          document_id: 'google-doc-1',
        },
      }),
    }
    const repo = {
      findConnectionMode: vi.fn().mockResolvedValue({
        status: 'connected',
        metadata: { composio_connected_account_id: 'account-1' },
      }),
    }
    const service = createService(composio, repo)

    await expect(
      service.createGoogleDoc(
        {} as never,
        'user-1',
        'Launch plan',
        '<h1>Launch plan</h1><p>Ship it.</p>',
        null,
      ),
    ).resolves.toMatchObject({
      id: 'google-doc-1',
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: 'https://docs.google.com/document/d/google-doc-1/edit',
    })

    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN',
      'user-1',
      {
        title: 'Launch plan',
        markdown_text: '# Launch plan\n\nShip it.',
      },
      'account-1',
    )
  })
})
