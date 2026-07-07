import { describe, expect, it, vi } from 'vitest'
import type { DocumentAttachment } from '../../types'
import type { AttachedFile, ParsedFileResult } from '../chat/FileAttachments'
import {
  attachedFilesToDocumentAttachments,
  createPendingAttachedFiles,
  removeAttachedFileById,
  revokeAttachedFilePreviewUrls,
  seedAttachedFilesFromDocuments,
} from './chat-input-file-state'

function documentAttachment(overrides: Partial<DocumentAttachment> = {}): DocumentAttachment {
  return {
    filename: 'brief.txt',
    type: 'text',
    text: 'Brief body',
    mimeType: 'text/plain',
    fileUrl: 'https://cdn.example.com/brief.txt',
    mediaAssetId: 'asset-1',
    sizeBytes: 12,
    ...overrides,
  }
}

function attachedFile(overrides: Partial<AttachedFile> = {}): AttachedFile {
  return {
    id: 'file-1',
    file: new File(['hello'], 'brief.txt', { type: 'text/plain' }),
    uploading: false,
    ...overrides,
  }
}

function parsed(overrides: Partial<ParsedFileResult> = {}): ParsedFileResult {
  return {
    filename: 'brief.txt',
    mimeType: 'text/plain',
    sizeBytes: 12,
    type: 'text',
    text: 'Brief body',
    mediaAssetId: 'asset-1',
    documentIntelligence: null,
    ...overrides,
  }
}

describe('chat input file state helpers', () => {
  it('seeds attached files from restored documents', () => {
    const files = seedAttachedFilesFromDocuments(
      [
        documentAttachment(),
        documentAttachment({
          filename: 'hero.png',
          type: 'image',
          text: undefined,
          dataUrl: 'data:image/png;base64,abc',
          fileUrl: undefined,
          mimeType: 'image/png',
          mediaAssetId: 'asset-2',
        }),
      ],
      () => 'seed-id',
    )

    expect(files).toHaveLength(2)
    expect(files[0]).toMatchObject({
      id: 'seed-id',
      uploading: false,
      parsed: [
        {
          filename: 'brief.txt',
          mimeType: 'text/plain',
          type: 'text',
          text: 'Brief body',
          fileUrl: 'https://cdn.example.com/brief.txt',
          mediaAssetId: 'asset-1',
        },
      ],
    })
    expect(files[0]?.file.name).toBe('brief.txt')
    expect(files[1]?.file.type).toBe('image/png')
  })

  it('creates pending upload entries and preview URLs only for images', () => {
    const image = new File(['img'], 'hero.png', { type: 'image/png' })
    const text = new File(['txt'], 'brief.txt', { type: 'text/plain' })
    const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`)
    let index = 0

    const entries = createPendingAttachedFiles([image, text], () => `file-${++index}`, createObjectUrl)

    expect(entries).toMatchObject([
      { id: 'file-1', uploading: true, previewUrl: 'blob:hero.png' },
      { id: 'file-2', uploading: true, previewUrl: undefined },
    ])
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(createObjectUrl).toHaveBeenCalledWith(image)
  })

  it('revokes only blob preview URLs', () => {
    const revoke = vi.fn()

    revokeAttachedFilePreviewUrls(
      [
        attachedFile({ previewUrl: 'blob:one' }),
        attachedFile({ id: 'file-2', previewUrl: 'https://cdn.example.com/hero.png' }),
      ],
      revoke,
    )

    expect(revoke).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:one')
  })

  it('removes a file by id and revokes its blob preview URL', () => {
    const revoke = vi.fn()
    const next = removeAttachedFileById(
      [
        attachedFile({ id: 'keep', previewUrl: 'blob:keep' }),
        attachedFile({ id: 'remove', previewUrl: 'blob:remove' }),
      ],
      'remove',
      revoke,
    )

    expect(next.map((file) => file.id)).toEqual(['keep'])
    expect(revoke).toHaveBeenCalledWith('blob:remove')
  })

  it('maps parsed attached files to document attachments for sending', () => {
    const imageWithUrl = attachedFile({
      id: 'image-url',
      parsed: [
        parsed({
          filename: 'hero.png',
          type: 'image',
          text: undefined,
          dataUrl: 'data:image/png;base64,abc',
          fileUrl: 'https://cdn.example.com/hero.png',
          mimeType: 'image/png',
        }),
      ],
    })
    const imageWithoutUrl = attachedFile({
      id: 'image-data',
      parsed: [
        parsed({
          filename: 'local.png',
          type: 'image',
          text: undefined,
          dataUrl: 'data:image/png;base64,local',
          fileUrl: undefined,
          mimeType: 'image/png',
        }),
      ],
    })
    const failed = attachedFile({ id: 'failed', error: 'failed', parsed: [parsed()] })

    expect(attachedFilesToDocumentAttachments([imageWithUrl, imageWithoutUrl, failed])).toEqual([
      {
        filename: 'hero.png',
        type: 'image',
        fileUrl: 'https://cdn.example.com/hero.png',
        mimeType: 'image/png',
        mediaAssetId: 'asset-1',
        sizeBytes: 12,
      },
      {
        filename: 'local.png',
        type: 'image',
        fileUrl: undefined,
        mimeType: 'image/png',
        mediaAssetId: 'asset-1',
        sizeBytes: 12,
        dataUrl: 'data:image/png;base64,local',
      },
    ])
  })
})
