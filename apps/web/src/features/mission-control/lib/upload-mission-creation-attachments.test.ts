import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MAX_FILES, CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'
import { uploadMissionCreationAttachments } from './upload-mission-creation-attachments'

vi.mock('@/lib/media/presigned-client-upload', () => ({
  concurrentMap: async <T, R>(items: T[], _limit: number, fn: (item: T) => Promise<R>) => {
    const results: PromiseSettledResult<R>[] = []
    for (const item of items) {
      try {
        results.push({ status: 'fulfilled', value: await fn(item) })
      } catch (reason) {
        results.push({ status: 'rejected', reason })
      }
    }
    return results
  },
  presignPutUploadFile: vi.fn(),
}))

describe('uploadMissionCreationAttachments', () => {
  beforeEach(() => {
    vi.mocked(presignPutUploadFile).mockReset()
  })

  it('keeps the normalized asset ref from presigned uploads', async () => {
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' })
    const assetRef = {
      kind: 'vibey_asset',
      asset_id: 'asset-1',
      bucket_name: 'media',
      file_path: 'user-1/uploads/brief.pdf',
      url: 'https://cdn.example.com/brief.pdf',
      mime_type: 'application/pdf',
      asset_type: 'document',
      name: 'brief.pdf',
      original_filename: 'brief.pdf',
      file_size: file.size,
      campaign_id: 'campaign-1',
      space_id: null,
      org_id: 'org-1',
      source: 'upload',
      source_surface: null,
    }
    vi.mocked(presignPutUploadFile).mockResolvedValue({
      success: true,
      asset: {
        id: 'asset-1',
        file_path: 'user-1/uploads/brief.pdf',
        file_size: file.size,
        mime_type: 'application/pdf',
        public_url: 'https://cdn.example.com/brief.pdf',
      },
      url: 'https://cdn.example.com/brief.pdf',
      asset_ref: assetRef,
    } as never)

    await expect(uploadMissionCreationAttachments([file], 'campaign-1')).resolves.toEqual([
      {
        url: 'https://cdn.example.com/brief.pdf',
        name: 'brief.pdf',
        size: file.size,
        type: 'application/pdf',
        asset_id: 'asset-1',
        asset_ref: assetRef,
      },
    ])
  })

  it('rejects more than the chat file limit before upload', async () => {
    const files = Array.from(
      { length: CHAT_MAX_FILES + 1 },
      (_, index) => new File(['brief'], `brief-${index}.pdf`, { type: 'application/pdf' }),
    )

    await expect(uploadMissionCreationAttachments(files, 'campaign-1')).rejects.toThrow(
      CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage,
    )
    expect(presignPutUploadFile).not.toHaveBeenCalled()
  })

  it('rejects oversized images before upload', async () => {
    const file = new File(['image'], 'large.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 + 1 })

    await expect(uploadMissionCreationAttachments([file], 'campaign-1')).rejects.toThrow(
      CHAT_TOAST_ERRORS.IMAGE_FILE_TOO_LARGE.userMessage,
    )
    expect(presignPutUploadFile).not.toHaveBeenCalled()
  })

  it('reports upload failure when the confirmed asset has no URL', async () => {
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' })
    vi.mocked(presignPutUploadFile).mockResolvedValue({
      success: true,
      asset: {
        id: 'asset-1',
        file_path: 'user-1/uploads/brief.pdf',
        file_size: file.size,
        mime_type: 'application/pdf',
        public_url: null,
      },
      url: '',
    } as never)

    await expect(uploadMissionCreationAttachments([file], 'campaign-1')).rejects.toThrow(
      CHAT_TOAST_ERRORS.UPLOAD_FAILED.userMessage,
    )
  })
})
