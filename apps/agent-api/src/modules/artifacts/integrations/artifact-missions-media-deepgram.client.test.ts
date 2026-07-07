import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactMissionsMediaDeepgramClient } from './artifact-missions-media-deepgram.client'

describe('ArtifactMissionsMediaDeepgramClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends an explicit language hint to Deepgram', async () => {
    vi.stubEnv('DEEPGRAM_API_KEY', 'test-deepgram-key')
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: {
          channels: [{ alternatives: [{ transcript: 'שלום עולם' }] }],
          utterances: [{ start: 0, end: 1, transcript: 'שלום עולם' }],
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new ArtifactMissionsMediaDeepgramClient()
    const result = await client.transcribeAudioBuffer(Buffer.from('mp3'), { language: 'he' })

    const url = String(fetchMock.mock.calls[0]?.[0] ?? '')
    expect(url).toContain('language=he')
    expect(url).not.toContain('detect_language=true')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Token test-deepgram-key',
        'Content-Type': 'audio/mpeg',
      }),
    })
    expect(result).toEqual({
      transcript: 'שלום עולם',
      segments: [{ start: 0, end: 1, text: 'שלום עולם' }],
    })
  })
})
