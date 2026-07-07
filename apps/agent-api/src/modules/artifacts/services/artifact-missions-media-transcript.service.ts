import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BrowserSessionsService } from '../../browser-sessions/services/browser-sessions.service'
import { ArtifactMissionsMediaDeepgramClient } from '../integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaProcessClient } from '../integrations/artifact-missions-media-process.client'
import { ArtifactMissionsMediaScrapeCreatorsClient } from '../integrations/artifact-missions-media-scrape-creators.client'
import { ArtifactMissionsMediaYoutubeTranscriptClient } from '../integrations/artifact-missions-media-youtube-transcript.client'
import { ArtifactMissionsMediaUsageService } from './artifact-missions-media-usage.service'

type MediaPlatform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook' | 'unknown'

export class ArtifactMissionsMediaTranscriptService {
  constructor(
    private readonly browserSessions: BrowserSessionsService,
    private readonly usage: ArtifactMissionsMediaUsageService,
    private readonly processClient = new ArtifactMissionsMediaProcessClient(),
    private readonly deepgramClient = new ArtifactMissionsMediaDeepgramClient(),
    private readonly scrapeCreatorsClient = new ArtifactMissionsMediaScrapeCreatorsClient(),
    private readonly youtubeTranscriptClient = new ArtifactMissionsMediaYoutubeTranscriptClient(),
  ) {}

  async extractUrlTranscript(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const url = String(input.url ?? '').trim()
    if (!url) {
      return { success: false, error: 'url is required' }
    }

    const lang = String(input.lang ?? 'en').trim()
    const includeMetadata = input.include_metadata !== false

    const platform = this.detectPlatform(url)
    const tempRoot = await mkdtemp(join(tmpdir(), 'vibey-url-transcript-'))

    try {
      let metadata: { title: string; duration_seconds: number } | null = null
      let transcript = ''
      let segments: Array<{ start: number; end: number; text: string }> = []
      let source: 'native_captions' | 'ai_transcription' = 'native_captions'

      if (platform === 'youtube') {
        const videoId = this.extractYouTubeVideoId(url)
        if (videoId) {
          await onProgress?.('Fetching YouTube captions')
          const native = await this.tryYouTubeNativeTranscript(videoId, lang)
          if (native) {
            transcript = native.transcript
            segments = native.segments
            source = 'native_captions'

            if (includeMetadata) {
              await onProgress?.('Fetching video metadata')
              metadata = await this.processClient.fetchYtDlpMetadata(url)
            }
            return {
              success: true,
              platform,
              url,
              ...(metadata ? { metadata } : {}),
              transcript,
              segments,
              source,
            }
          }
        }
      }
      await onProgress?.('Downloading audio from video')
      const audioPath = join(tempRoot, `audio-${randomUUID()}.m4a`)
      const attempts: Array<{ method: string; error?: string; used_cookies?: boolean }> = []
      const userCookieFile = await this.resolveYtDlpCookieFile(target, sessionKey, platform)
      let downloadOk = false
      let firstError: unknown = null

      if (userCookieFile) {
        try {
          await onProgress?.('Downloading audio (with your saved session)')
          await this.downloadViaYtDlp(url, audioPath, userCookieFile)
          attempts.push({ method: 'yt-dlp', used_cookies: true })
          downloadOk = true
        } catch (dlError) {
          firstError = dlError
          attempts.push({
            method: 'yt-dlp',
            used_cookies: true,
            error: dlError instanceof Error ? dlError.message : String(dlError),
          })
        }
      }

      if (!downloadOk) {
        try {
          if (userCookieFile) {
            await onProgress?.('Retrying download without saved session')
          }
          await this.downloadViaYtDlp(url, audioPath)
          attempts.push({ method: 'yt-dlp', used_cookies: false })
          downloadOk = true
        } catch (dlError) {
          firstError = firstError ?? dlError
          attempts.push({
            method: 'yt-dlp',
            used_cookies: false,
            error: dlError instanceof Error ? dlError.message : String(dlError),
          })
        }
      }

      if (!downloadOk) {
        const scRoute = this.scrapeCreatorsRouteForPlatform(platform)
        if (scRoute) {
          await onProgress?.('yt-dlp failed; falling back to Social Analysis')
          const viaScrapeCreators = await this.transcribeViaScrapeCreators(url, platform)
          if (viaScrapeCreators && viaScrapeCreators.transcript.trim().length > 0) {
            attempts.push({ method: `social_analysis.${viaScrapeCreators.actionSlug}` })
            if (sessionKey && typeof target.resolveUserId === 'function') {
              const userId = target.resolveUserId(sessionKey)
              await this.usage.chargeScrapeCreatorsUsage(target, {
                userId,
                sessionKey,
                actionSlug: viaScrapeCreators.actionSlug,
                metadata: { url, platform },
              })
            }
            if (includeMetadata) {
              await onProgress?.('Fetching video metadata')
              metadata = await this.processClient.fetchYtDlpMetadata(url)
            }
            return {
              success: true,
              platform,
              url,
              ...(metadata ? { metadata } : {}),
              transcript: viaScrapeCreators.transcript,
              segments: viaScrapeCreators.segments,
              source: 'social_analysis',
              via: 'social_analysis_fallback',
              attempts,
            }
          }
          attempts.push({
            method: `social_analysis.${scRoute.actionSlug}`,
            error: 'no transcript returned (missing API key, rate-limit, or empty response)',
          })
        }

        const retryHint =
          platform === 'instagram' ||
          platform === 'tiktok' ||
          platform === 'x' ||
          platform === 'facebook'
            ? `yt-dlp is often rate-limited on ${platform}. Social Analysis fallback also failed. Manual options: (a) ask the user to download the media and upload it, then call transcribe_audio with the media_url for audio-only files or analyze_video for video frames; (b) verify the URL is public; (c) ask an admin to confirm the Social Analysis provider is configured.`
            : `Transcript extraction failed. Manual options: (a) ask the user to download the media and upload it, then call transcribe_audio with the media_url for audio-only files or analyze_video for video frames; (b) verify the URL is public.`

        return {
          success: false,
          error: 'Transcript extraction failed on all paths',
          platform,
          url,
          attempts,
          retry_hint: retryHint,
        }
      }

      const mp3Path = join(tempRoot, 'audio.mp3')
      await onProgress?.('Converting audio')
      await this.processClient.transcodeAudioToMp3({
        sourcePath: audioPath,
        outputPath: mp3Path,
        operation: 'audio conversion',
      })

      await onProgress?.('Transcribing audio')
      const result = await this.deepgramClient.transcribeAudioFile(mp3Path)
      transcript = result.transcript
      segments = result.segments
      source = 'ai_transcription'
      if (sessionKey && typeof target.resolveUserId === 'function') {
        const userId = target.resolveUserId(sessionKey)
        await this.usage.chargeDeepgramUsage(target, {
          userId,
          campaignId: null,
          sessionKey,
          action: 'extract_url_transcript',
          transcript,
          metadata: {
            url,
            platform,
          },
        })
      }

      if (includeMetadata) {
        await onProgress?.('Fetching video metadata')
        metadata = await this.processClient.fetchYtDlpMetadata(url)
      }
      return {
        success: true,
        platform,
        url,
        ...(metadata ? { metadata } : {}),
        transcript,
        segments,
        source,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'extract_url_transcript failed',
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  }

  private domainForPlatform(platform: MediaPlatform): string | null {
    switch (platform) {
      case 'instagram':
        return 'instagram.com'
      case 'tiktok':
        return 'tiktok.com'
      case 'x':
        return 'x.com'
      case 'facebook':
        return 'facebook.com'
      case 'youtube':
        return 'youtube.com'
      default:
        return null
    }
  }

  private async resolveYtDlpCookieFile(
    target: Record<string, any>,
    sessionKey: string | undefined,
    platform: MediaPlatform,
  ): Promise<string | null> {
    try {
      if (!sessionKey || typeof target.resolveUserId !== 'function') return null
      const domain = this.domainForPlatform(platform)
      if (!domain) return null
      const userId = target.resolveUserId(sessionKey)
      if (!userId) return null
      const orgId =
        typeof target.resolveOrgId === 'function'
          ? (target.resolveOrgId(sessionKey) as string | null)
          : null
      const supabase = target.serviceClient
      if (!supabase) return null
      return await this.browserSessions.loadCookiesForYtDlp(supabase, userId, orgId, domain)
    } catch {
      return null
    }
  }

  private detectPlatform(url: string): MediaPlatform {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
      if (host === 'youtube.com' || host === 'youtu.be') return 'youtube'
      if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
      if (host === 'instagram.com') return 'instagram'
      if (host === 'x.com' || host === 'twitter.com') return 'x'
      if (host === 'facebook.com' || host === 'fb.watch') return 'facebook'
      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
      if (host === 'youtube.com') {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v')
        const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)
        if (shortsMatch) return shortsMatch[1]
        return null
      }
      if (host === 'youtu.be') {
        const id = parsed.pathname.slice(1).split('/')[0]
        return id?.length === 11 ? id : null
      }
      return null
    } catch {
      return null
    }
  }

  private async tryYouTubeNativeTranscript(
    videoId: string,
    lang: string,
  ): Promise<{
    transcript: string
    segments: Array<{ start: number; end: number; text: string }>
  } | null> {
    return this.youtubeTranscriptClient.fetchNativeTranscript(videoId, lang)
  }

  private async downloadViaYtDlp(
    url: string,
    outputPath: string,
    cookieFile?: string | null,
  ): Promise<void> {
    await this.processClient.downloadViaYtDlp(url, outputPath, cookieFile)
  }

  private scrapeCreatorsRouteForPlatform(
    platform: MediaPlatform,
  ): { upstreamPath: string; actionSlug: string } | null {
    switch (platform) {
      case 'instagram':
        return {
          upstreamPath: '/v2/instagram/media/transcript',
          actionSlug: 'instagram_media_transcript',
        }
      case 'tiktok':
        return {
          upstreamPath: '/v1/tiktok/video/transcript',
          actionSlug: 'tiktok_video_transcript',
        }
      case 'x':
        return {
          upstreamPath: '/v1/twitter/tweet/transcript',
          actionSlug: 'twitter_tweet_transcript',
        }
      case 'facebook':
        return {
          upstreamPath: '/v1/facebook/post/transcript',
          actionSlug: 'facebook_post_transcript',
        }
      case 'youtube':
        return {
          upstreamPath: '/v1/youtube/video/transcript',
          actionSlug: 'youtube_video_transcript',
        }
      default:
        return null
    }
  }

  private extractScrapeCreatorsTranscriptText(body: unknown): string {
    if (!body || typeof body !== 'object') return ''
    const b = body as Record<string, any>
    const candidates: unknown[] = [
      b.transcript,
      b.text,
      b.caption,
      b.data?.transcript,
      b.data?.text,
      b.data?.caption,
      b.result?.transcript,
      b.result?.text,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c
    }
    const segmentArrays: unknown[] = [
      b.segments,
      b.data?.segments,
      b.utterances,
      b.data?.utterances,
    ]
    for (const arr of segmentArrays) {
      if (!Array.isArray(arr)) continue
      const joined = arr
        .map((s: any) => (typeof s?.text === 'string' ? s.text : ''))
        .filter(Boolean)
        .join(' ')
        .trim()
      if (joined) return joined
    }
    return ''
  }

  private extractScrapeCreatorsSegments(
    body: unknown,
  ): Array<{ start: number; end: number; text: string }> {
    if (!body || typeof body !== 'object') return []
    const b = body as Record<string, any>
    const raw = Array.isArray(b.segments)
      ? b.segments
      : Array.isArray(b.data?.segments)
        ? b.data.segments
        : Array.isArray(b.utterances)
          ? b.utterances
          : Array.isArray(b.data?.utterances)
            ? b.data.utterances
            : []
    return raw
      .filter((s: any) => typeof s?.text === 'string' && (s.text as string).trim().length > 0)
      .map((s: any) => ({
        start: Number(s.start ?? s.start_time ?? s.startTime ?? 0),
        end: Number(s.end ?? s.end_time ?? s.endTime ?? 0),
        text: String(s.text).trim(),
      }))
  }

  private async transcribeViaScrapeCreators(
    url: string,
    platform: MediaPlatform,
  ): Promise<{
    transcript: string
    segments: Array<{ start: number; end: number; text: string }>
    actionSlug: string
  } | null> {
    const route = this.scrapeCreatorsRouteForPlatform(platform)
    if (!route) return null

    const body = await this.scrapeCreatorsClient.fetchTranscriptBody({
      url,
      upstreamPath: route.upstreamPath,
    })
    const transcript = this.extractScrapeCreatorsTranscriptText(body)
    if (!transcript) return null
    return {
      transcript,
      segments: this.extractScrapeCreatorsSegments(body),
      actionSlug: route.actionSlug,
    }
  }
}
