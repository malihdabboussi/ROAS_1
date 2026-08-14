import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BrowserSessionsService } from '../../browser-sessions/services/browser-sessions.service'
import { ArtifactMissionsMediaDeepgramClient } from '../integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaProcessClient } from '../integrations/artifact-missions-media-process.client'
import { ArtifactMissionsMediaScrapeCreatorsClient } from '../integrations/artifact-missions-media-scrape-creators.client'
import { ArtifactMissionsMediaYoutubeTranscriptClient } from '../integrations/artifact-missions-media-youtube-transcript.client'
import { buildErrorEnvelope } from './artifact-error-classifier'
import {
  buildSocialAnalysisTranscriptRoute,
  extractSocialAnalysisSegments,
  extractSocialAnalysisTranscriptText,
} from './artifact-missions-media-transcript-payload'
import { ArtifactMissionsMediaUsageService } from './artifact-missions-media-usage.service'

type MediaPlatform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook' | 'unknown'
type TranscriptAttempt = { method: string; error?: string; used_cookies?: boolean; via?: string }
type SocialAnalysisHit = {
  transcript: string
  segments: Array<{ start: number; end: number; text: string }>
  actionSlug: string
  via: 'platform_api' | 'direct'
}

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
    const attempts: TranscriptAttempt[] = []

    try {
      if (platform === 'youtube') {
        const videoId = this.extractYouTubeVideoId(url)
        if (videoId) {
          await onProgress?.('Fetching YouTube captions')
          const native = await this.youtubeTranscriptClient.fetchNativeTranscript(videoId, lang)
          if (native) {
            const metadata = includeMetadata
              ? await this.fetchMetadata(onProgress, url)
              : null
            return {
              success: true,
              platform,
              url,
              ...(metadata ? { metadata } : {}),
              transcript: native.transcript,
              segments: native.segments,
              source: 'native_captions',
            }
          }
          attempts.push({
            method: 'native_captions',
            error: 'unavailable or blocked from this host',
          })
        }
      }

      const viaSocialAnalysis = await this.transcribeViaSocialAnalysis(
        target,
        url,
        platform,
        sessionKey,
        attempts,
        onProgress,
      )
      if (viaSocialAnalysis) {
        if (viaSocialAnalysis.via === 'direct') {
          await this.chargeDirectSocialAnalysis(target, sessionKey, viaSocialAnalysis, {
            url,
            platform,
          })
        }
        const metadata = includeMetadata ? await this.fetchMetadata(onProgress, url) : null
        return {
          success: true,
          platform,
          url,
          ...(metadata ? { metadata } : {}),
          transcript: viaSocialAnalysis.transcript,
          segments: viaSocialAnalysis.segments,
          source: 'social_analysis',
          via: viaSocialAnalysis.via,
          attempts,
        }
      }

      await onProgress?.('Downloading audio from video')
      const audioPath = join(tempRoot, `audio-${randomUUID()}.m4a`)
      const downloadOk = await this.downloadAudio(target, sessionKey, platform, url, audioPath, attempts, onProgress)
      if (!downloadOk) {
        return this.buildPullFailure(platform, url, attempts)
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
      if (sessionKey && typeof target.resolveUserId === 'function') {
        await this.usage.chargeDeepgramUsage(target, {
          userId: target.resolveUserId(sessionKey),
          campaignId: null,
          sessionKey,
          action: 'extract_url_transcript',
          transcript: result.transcript,
          metadata: { url, platform },
        })
      }

      const metadata = includeMetadata ? await this.fetchMetadata(onProgress, url) : null
      return {
        success: true,
        platform,
        url,
        ...(metadata ? { metadata } : {}),
        transcript: result.transcript,
        segments: result.segments,
        source: 'ai_transcription',
        attempts,
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

  private async fetchMetadata(
    onProgress: ((message: string) => void | Promise<void>) | undefined,
    url: string,
  ) {
    await onProgress?.('Fetching video metadata')
    return this.processClient.fetchYtDlpMetadata(url)
  }

  private async downloadAudio(
    target: Record<string, any>,
    sessionKey: string | undefined,
    platform: MediaPlatform,
    url: string,
    audioPath: string,
    attempts: TranscriptAttempt[],
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<boolean> {
    const userCookieFile = await this.resolveYtDlpCookieFile(target, sessionKey, platform)
    if (userCookieFile) {
      try {
        await onProgress?.('Downloading audio (with your saved session)')
        await this.processClient.downloadViaYtDlp(url, audioPath, userCookieFile)
        attempts.push({ method: 'yt-dlp', used_cookies: true })
        return true
      } catch (dlError) {
        attempts.push({
          method: 'yt-dlp',
          used_cookies: true,
          error: dlError instanceof Error ? dlError.message : String(dlError),
        })
      }
    }

    try {
      if (userCookieFile) {
        await onProgress?.('Retrying download without saved session')
      }
      await this.processClient.downloadViaYtDlp(url, audioPath)
      attempts.push({ method: 'yt-dlp', used_cookies: false })
      return true
    } catch (dlError) {
      attempts.push({
        method: 'yt-dlp',
        used_cookies: false,
        error: dlError instanceof Error ? dlError.message : String(dlError),
      })
      return false
    }
  }

  private async transcribeViaSocialAnalysis(
    target: Record<string, any>,
    url: string,
    platform: MediaPlatform,
    sessionKey: string | undefined,
    attempts: TranscriptAttempt[],
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<SocialAnalysisHit | null> {
    const route = this.scrapeCreatorsRouteForPlatform(platform)
    if (!route) return null

    await onProgress?.('Pulling transcript via Social Analysis')
    const http = buildSocialAnalysisTranscriptRoute(route.actionSlug, url)
    if (http && typeof target.mainApiCall === 'function') {
      try {
        const body = await target.mainApiCall(http.method, http.path, sessionKey)
        const transcript = extractSocialAnalysisTranscriptText(body)
        if (transcript) {
          attempts.push({
            method: `social_analysis.${route.actionSlug}`,
            via: 'platform_api',
          })
          return {
            transcript,
            segments: extractSocialAnalysisSegments(body),
            actionSlug: route.actionSlug,
            via: 'platform_api',
          }
        }
        attempts.push({
          method: `social_analysis.${route.actionSlug}`,
          via: 'platform_api',
          error: 'empty transcript from Social Analysis API',
        })
      } catch (error) {
        attempts.push({
          method: `social_analysis.${route.actionSlug}`,
          via: 'platform_api',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const body = await this.scrapeCreatorsClient.fetchTranscriptBody({
      url,
      upstreamPath: route.upstreamPath,
    })
    const transcript = extractSocialAnalysisTranscriptText(body)
    if (transcript) {
      attempts.push({ method: `social_analysis.${route.actionSlug}`, via: 'direct' })
      return {
        transcript,
        segments: extractSocialAnalysisSegments(body),
        actionSlug: route.actionSlug,
        via: 'direct',
      }
    }
    attempts.push({
      method: `social_analysis.${route.actionSlug}`,
      via: 'direct',
      error: 'no transcript returned (missing API key, rate-limit, or empty response)',
    })
    return null
  }

  private async chargeDirectSocialAnalysis(
    target: Record<string, any>,
    sessionKey: string | undefined,
    hit: SocialAnalysisHit,
    metadata: { url: string; platform: MediaPlatform },
  ) {
    if (!sessionKey || typeof target.resolveUserId !== 'function') return
    await this.usage.chargeScrapeCreatorsUsage(target, {
      userId: target.resolveUserId(sessionKey),
      sessionKey,
      actionSlug: hit.actionSlug,
      metadata,
    })
  }

  private buildPullFailure(platform: MediaPlatform, url: string, attempts: TranscriptAttempt[]) {
    return {
      ...buildErrorEnvelope('Could not pull the transcript from this URL.', {
        errorCode: 'ARTIFACT_URL_TRANSCRIPT_FAILED',
        errorClass: 'system_fault',
        workflowClass: 'extract_url_transcript',
        reliability: 'high_confidence',
        effectState: 'failed_before_effect',
        retryPolicy: {
          mode: 'retry_same_payload',
          max_attempts: 1,
          stop_after_same_error: true,
          reason: 'The Social Analysis transcript pull can succeed on retry even when native captions are blocked.',
        },
        correction: {
          summary: 'Retry extract_url_transcript once with the same URL.',
          next_tool_preference: ['extract_url_transcript'],
        },
        fallback: null,
        agentDiagnosis:
          'Native captions, the Social Analysis transcript API, and audio download all failed. Captions may still exist; this host could not pull them.',
        agentInstruction:
          'Retry extract_url_transcript once with the same URL. Do not tell the user captions are unavailable. Do not ask them to paste or upload a transcript. If the second attempt also fails, say you could not pull the transcript from here and they can try again shortly.',
        userExplanation: {
          intent: 'retry_transcript_pull',
          sentence: 'I could not pull that video transcript just now. I will try once more.',
        },
        forbiddenUserFraming: [
          'captions unavailable',
          "captions aren't available",
          'captions are not available',
          'paste the transcript',
          'upload the transcript',
        ],
        observability: {
          fingerprint: 'artifact.url_transcript_failed',
          report_level: 'warn',
        },
      }),
      platform,
      url,
      attempts,
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
}
