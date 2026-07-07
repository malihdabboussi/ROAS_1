import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DocumentAttachment } from '../../types'
import { useChatInputFileUpload } from './use-chat-input-file-upload'

function restoredDocument(overrides: Partial<DocumentAttachment> = {}): DocumentAttachment {
  return {
    filename: 'brief.txt',
    type: 'text',
    text: 'Brief body',
    mimeType: 'text/plain',
    mediaAssetId: 'asset-restored',
    sizeBytes: 12,
    ...overrides,
  }
}

function confirmResponse(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    url: 'https://cdn.example.com/uploaded.txt',
    asset: {
      id: 'asset-uploaded',
      file_path: 'uploads/uploaded.txt',
      file_size: 4,
      mime_type: 'text/plain',
      public_url: 'https://cdn.example.com/uploaded.txt',
      document_intelligence: { status: 'processing' },
    },
    ...overrides,
  }
}

describe('useChatInputFileUpload', () => {
  it('uploads selected files and records parsed document metadata', async () => {
    const uploadFile = vi.fn().mockResolvedValue(confirmResponse())
    const pollDocumentIntelligence = vi.fn().mockResolvedValue({
      document_intelligence: { status: 'ready', summary: 'Done' },
    })
    let id = 0
    const { result } = renderHook(() =>
      useChatInputFileUpload({
        campaignId: 'campaign-1',
        uploadFile,
        pollDocumentIntelligence,
        createId: () => `file-${++id}`,
        createObjectUrl: (file) => `blob:${file.name}`,
      }),
    )

    await act(async () => {
      await result.current.handleFileSelect([new File(['body'], 'brief.txt', { type: 'text/plain' })])
    })

    expect(uploadFile).toHaveBeenCalledWith({
      file: expect.any(File),
      name: 'brief.txt',
      campaign_id: 'campaign-1',
      category: 'chat_upload',
    })
    expect(pollDocumentIntelligence).toHaveBeenCalledWith('asset-uploaded')
    expect(result.current.attachedFiles).toHaveLength(1)
    expect(result.current.attachedFiles[0]).toMatchObject({
      id: 'file-1',
      uploading: false,
      documentStatus: 'ready',
      parsed: [
        {
          filename: 'brief.txt',
          mimeType: 'text/plain',
          type: 'text',
          fileUrl: 'https://cdn.example.com/uploaded.txt',
          mediaAssetId: 'asset-uploaded',
          documentIntelligence: { status: 'ready', summary: 'Done' },
        },
      ],
    })
  })

  it('rejects over-limit selections before starting upload', async () => {
    const uploadFile = vi.fn()
    const toastError = vi.fn()
    const { result } = renderHook(() =>
      useChatInputFileUpload({
        initialDocuments: Array.from({ length: 10 }, (_, index) =>
          restoredDocument({ filename: `restored-${index}.txt` }),
        ),
        uploadFile,
        toastError,
      }),
    )

    await act(async () => {
      await result.current.handleFileSelect([new File(['extra'], 'extra.txt', { type: 'text/plain' })])
    })

    expect(uploadFile).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      'You can attach up to 10 files per message. Remove some to add more.',
    )
    expect(result.current.attachedFiles).toHaveLength(10)
  })

  it('restores documents and revokes preview URLs on remove and clear', async () => {
    const revokeObjectUrl = vi.fn()
    const { result, unmount } = renderHook(() =>
      useChatInputFileUpload({
        initialDocuments: [restoredDocument()],
        uploadFile: vi.fn(),
        createId: () => 'restored-id',
        createObjectUrl: (file) => `blob:${file.name}`,
        revokeObjectUrl,
      }),
    )

    expect(result.current.attachedFiles[0]).toMatchObject({
      id: 'restored-id',
      parsed: [{ filename: 'brief.txt' }],
    })

    act(() => {
      result.current.setAttachedFiles([
        {
          id: 'blob-file',
          file: new File(['img'], 'hero.png', { type: 'image/png' }),
          uploading: false,
          previewUrl: 'blob:hero.png',
        },
      ])
    })

    act(() => result.current.handleRemoveFile('blob-file'))
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:hero.png')
    expect(result.current.attachedFiles).toEqual([])

    act(() => {
      result.current.setAttachedFiles([
        {
          id: 'clear-file',
          file: new File(['img'], 'clear.png', { type: 'image/png' }),
          uploading: false,
          previewUrl: 'blob:clear.png',
        },
      ])
    })
    act(() => result.current.clearAttachedFiles())
    await waitFor(() => expect(result.current.attachedFiles).toEqual([]))
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:clear.png')

    act(() => {
      result.current.restoreAttachedFiles([restoredDocument({ filename: 'restored-again.txt' })])
    })
    expect(result.current.attachedFiles[0]?.file.name).toBe('restored-again.txt')

    unmount()
  })
})
