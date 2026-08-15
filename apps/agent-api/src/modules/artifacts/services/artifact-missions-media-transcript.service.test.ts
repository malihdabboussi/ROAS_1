import { describe, expect, it, vi } from 'vitest'
import { ArtifactMissionsMediaTranscriptService } from './artifact-missions-media-transcript.service'

const YOUTUBE_URL = 'https://youtu.be/S8lXMGq7JnY'
const TIKTOK_URL = 'https://www.tiktok.com/@creator/video/123'

function makeService(overrides?: {
  youtube?: { fetchNativeTranscript: ReturnType<typeof vi.fn> }
  scrapeCreators?: { fetchTranscriptBody: ReturnType<typeof vi.fn> }
  process?: {
    downloadViaYtDlp: ReturnType<typeof vi.fn>
    transcodeAudioToMp3: ReturnType<typeof vi.fn>
    fetchYtDlpMetadata: ReturnType<typeof vi.fn>
  }
  deepgram?: { transcribeAudioFile: ReturnType<typeof vi.fn> }
  usage?: {
    chargeScrapeCreatorsUsage: ReturnType<typeof vi.fn>
    chargeDeepgramUsage: ReturnType<typeof vi.fn>
  }
}) {
  const youtube = overrides?.youtube ?? {
    fetchNativeTranscript: vi.fn(async () => null),
  }
  const scrapeCreators = overrides?.scrapeCreators ?? {
    fetchTranscriptBody: vi.fn(async () => null),
  }
  const process = overrides?.process ?? {
    downloadViaYtDlp: vi.fn(async () => {
      throw new Error('yt-dlp blocked')
    }),
    transcodeAudioToMp3: vi.fn(async () => undefined),
    fetchYtDlpMetadata: vi.fn(async () => null),
  }
  const deepgram = overrides?.deepgram ?? {
    transcribeAudioFile: vi.fn(async () => ({ transcript: '', segments: [] })),
  }
  const usage = overrides?.usage ?? {
    chargeScrapeCreatorsUsage: vi.fn(async () => undefined),
    chargeDeepgramUsage: vi.fn(async () => undefined),
  }
  const browserSessions = {
    loadCookiesForYtDlp: vi.fn(async () => null),
  }
  const service = new ArtifactMissionsMediaTranscriptService(
    browserSessions as never,
    usage as never,
    process as never,
    deepgram as never,
    scrapeCreators as never,
    youtube as never,
  )
  return { service, youtube, scrapeCreators, process, deepgram, usage }
}

describe('ArtifactMissionsMediaTranscriptService extractUrlTranscript', () => {
  it('pulls a YouTube transcript from the Social Analysis main API before yt-dlp', async () => {
    const { service, process, usage, scrapeCreators } = makeService()
    const mainApiCall = vi.fn(async () => ({
      success: true,
      action: 'youtube_video_transcript',
      data: { transcript_only_text: 'All right, buckle up.' },
    }))
    const target = {
      mainApiCall,
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
    }

    const result = (await service.extractUrlTranscript(
      target,
      { url: YOUTUBE_URL, include_metadata: false },
      'agent:pixel:conversation-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      platform: 'youtube',
      transcript: 'All right, buckle up.',
      source: 'social_analysis',
      via: 'platform_api',
    })
    expect(mainApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/integrations/scrapecreators/youtube/video/transcript?url=https%3A%2F%2Fyoutu.be%2FS8lXMGq7JnY',
      'agent:pixel:conversation-1',
    )
    expect(process.downloadViaYtDlp).not.toHaveBeenCalled()
    expect(scrapeCreators.fetchTranscriptBody).not.toHaveBeenCalled()
    expect(usage.chargeScrapeCreatorsUsage).not.toHaveBeenCalled()
  })

  it('uses native captions when they are available and skips Social Analysis', async () => {
    const { service } = makeService({
      youtube: {
        fetchNativeTranscript: vi.fn(async () => ({
          transcript: 'Native captions.',
          segments: [{ start: 0, end: 1, text: 'Native captions.' }],
        })),
      },
    })
    const mainApiCall = vi.fn()
    const result = (await service.extractUrlTranscript(
      { mainApiCall, resolveUserId: vi.fn(() => 'user-1') },
      { url: YOUTUBE_URL, include_metadata: false },
      'agent:pixel:conversation-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      source: 'native_captions',
      transcript: 'Native captions.',
    })
    expect(mainApiCall).not.toHaveBeenCalled()
  })

  it('calls the TikTok Social Analysis transcript route for TikTok URLs', async () => {
    const { service, process } = makeService()
    const mainApiCall = vi.fn(async () => ({
      success: true,
      data: { transcript: 'TikTok spoken line.' },
    }))

    const result = (await service.extractUrlTranscript(
      { mainApiCall, resolveUserId: vi.fn(() => 'user-1') },
      { url: TIKTOK_URL, include_metadata: false },
      'agent:pixel:conversation-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.transcript).toBe('TikTok spoken line.')
    expect(mainApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/integrations/scrapecreators/tiktok/video/transcript?url=https%3A%2F%2Fwww.tiktok.com%2F%40creator%2Fvideo%2F123',
      'agent:pixel:conversation-1',
    )
    expect(process.downloadViaYtDlp).not.toHaveBeenCalled()
  })

  it('charges locally only when the direct ScrapeCreators key path is used', async () => {
    const { service, usage } = makeService({
      scrapeCreators: {
        fetchTranscriptBody: vi.fn(async () => ({ transcript: 'Direct key transcript.' })),
      },
    })
    const mainApiCall = vi.fn(async () => {
      throw new Error('Main API unavailable')
    })

    const result = (await service.extractUrlTranscript(
      {
        mainApiCall,
        resolveUserId: vi.fn(() => 'user-1'),
        resolveOrgId: vi.fn(() => 'org-1'),
      },
      { url: YOUTUBE_URL, include_metadata: false },
      'agent:pixel:conversation-1',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      transcript: 'Direct key transcript.',
      via: 'direct',
    })
    expect(usage.chargeScrapeCreatorsUsage).toHaveBeenCalledTimes(1)
  })

  it('does not tell Pixel captions are unavailable when the pull fails', async () => {
    const { service, process } = makeService()
    const result = (await service.extractUrlTranscript(
      {
        mainApiCall: vi.fn(async () => {
          throw new Error('Social Analysis 403')
        }),
        resolveUserId: vi.fn(() => 'user-1'),
      },
      { url: YOUTUBE_URL, include_metadata: false },
      'agent:pixel:conversation-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(result.error_code).toBe('ARTIFACT_URL_TRANSCRIPT_FAILED')
    expect(result.workflow_class).toBe('extract_url_transcript')
    expect(String(result.agent_instruction)).toMatch(/Retry extract_url_transcript once/i)
    expect(String(result.agent_instruction)).toMatch(/Do not ask them to paste/i)
    expect(result.forbidden_user_framing).toEqual(
      expect.arrayContaining([
        "captions aren't available",
        'captions unavailable',
        'paste the transcript',
      ]),
    )
    expect(process.downloadViaYtDlp).toHaveBeenCalled()
  })
})
