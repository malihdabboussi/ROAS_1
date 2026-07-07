import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TranscribeController } from './transcribe.controller'

const user = { id: 'user-1', email: 'user@example.com' }
const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' as const }

describe('TranscribeController asset-backed file transcription', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('transcribes an audio asset_ref without requiring multipart upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn(() => 'audio/mpeg') },
        arrayBuffer: vi.fn(async () => Buffer.from('audio-bytes').buffer),
      }),
    )
    const transcribeService = {
      transcribeFile: vi.fn().mockResolvedValue({ success: true, text: 'hello' }),
    }
    const creditsService = { processDirectTextUsage: vi.fn().mockResolvedValue(undefined) }
    const controller = new TranscribeController(transcribeService as never, creditsService as never)

    await expect(
      (controller as any).transcribeFile(user, undefined, scope, {
        asset_ref: {
          kind: 'vibey_asset',
          asset_id: 'asset-1',
          url: 'https://cdn.example/audio.mp3',
          mime_type: 'audio/mpeg',
          original_filename: 'audio.mp3',
          file_size: 11,
        },
      }),
    ).resolves.toEqual({ success: true, text: 'hello' })

    expect(transcribeService.transcribeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: expect.any(Buffer),
        mimetype: 'audio/mpeg',
        originalname: 'audio.mp3',
        size: expect.any(Number),
      }),
      user,
    )
  })

  it('still rejects requests with neither multipart audio nor asset_ref', async () => {
    const controller = new TranscribeController({} as never, {} as never)

    await expect((controller as any).transcribeFile(user, undefined, scope, {})).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
