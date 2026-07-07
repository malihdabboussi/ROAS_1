import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArtifactMissionsMediaDeepgramClient } from '../integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaDownloadClient } from '../integrations/artifact-missions-media-download.client'
import { ArtifactMissionsMediaProcessClient } from '../integrations/artifact-missions-media-process.client'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import { ArtifactMissionsMediaUsageService } from './artifact-missions-media-usage.service'

function looksLikeAudioSource(url: string, mimeType: unknown): boolean {
  if (typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('audio/')) return true
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return /\.(aac|flac|m4a|mp3|ogg|wav)(?:$|\?)/i.test(pathname)
  } catch {
    return /\.(aac|flac|m4a|mp3|ogg|wav)(?:$|\?)/i.test(url.toLowerCase())
  }
}

function normalizedLanguage(input: Record<string, unknown>): string | undefined {
  const raw = input.language ?? input.lang ?? input.language_code
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed || undefined
}

export class ArtifactMissionsMediaVideoService {
  private readonly maxFrameCount = 200
  private readonly defaultFrameCount = 12

  constructor(
    private readonly mediaAssetsRepository: ArtifactMediaAssetsRepository,
    private readonly usage: ArtifactMissionsMediaUsageService,
    private readonly processClient = new ArtifactMissionsMediaProcessClient(),
    private readonly downloadClient = new ArtifactMissionsMediaDownloadClient(),
    private readonly deepgramClient = new ArtifactMissionsMediaDeepgramClient(),
  ) {}

  async analyzeVideo(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
    usageAction: 'analyze_video' | 'transcribe_audio' = 'analyze_video',
  ) {
    const mediaUrl = String(input.media_url ?? input.file_url ?? '').trim()
    if (!mediaUrl) {
      return { success: false, error: 'media_url is required' }
    }

    const isAudioInput = looksLikeAudioSource(
      mediaUrl,
      input.mime_type ?? input.mimeType ?? input.content_type,
    )
    const extractFrames =
      input.extract_frames !== undefined ? input.extract_frames !== false : !isAudioInput
    const transcribe = input.transcribe !== false
    const language = normalizedLanguage(input)
    if (!extractFrames && !transcribe) {
      return { success: false, error: 'At least one of extract_frames or transcribe must be true' }
    }

    const requestedFrameCount = Number(input.frame_count ?? this.defaultFrameCount)
    const frameCount = Number.isFinite(requestedFrameCount)
      ? Math.min(Math.max(Math.floor(requestedFrameCount), 1), this.maxFrameCount)
      : this.defaultFrameCount
    const requestedInterval = Number(input.frame_interval_seconds ?? 0)
    const frameIntervalSeconds =
      Number.isFinite(requestedInterval) && requestedInterval > 0 ? requestedInterval : null

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    const tempRoot = await mkdtemp(join(tmpdir(), 'vibey-analyze-video-'))
    const sourcePath = join(tempRoot, 'source-video')
    const framesDir = join(tempRoot, 'frames')
    const audioPath = join(tempRoot, 'audio.mp3')

    try {
      await onProgress?.('Downloading video')
      const download = await this.downloadClient.downloadMedia(mediaUrl)
      if (!download.success) {
        return {
          success: false,
          error: `Failed to download media_url (${download.status})`,
        }
      }
      const videoBuffer = download.buffer
      if (videoBuffer.length === 0) {
        return { success: false, error: 'Downloaded video is empty' }
      }
      await writeFile(sourcePath, videoBuffer)

      const frames: Array<{
        index: number
        timestamp_seconds: number | null
        url: string
        media_asset_id: string | null
      }> = []

      if (extractFrames) {
        await onProgress?.('Extracting video frames')
        await mkdir(framesDir, { recursive: true })

        const timemarks = await this.buildTimemarks(sourcePath, frameCount, frameIntervalSeconds)
        await this.processClient.extractFrames({ sourcePath, framesDir, timemarks, frameCount })

        const frameFiles = (await readdir(framesDir)).filter((name) => name.endsWith('.jpg')).sort()

        await onProgress?.(`Uploading ${frameFiles.length} extracted frame(s)`)
        for (let i = 0; i < frameFiles.length; i++) {
          const frameFilename = frameFiles[i]!
          const framePath = join(framesDir, frameFilename)
          const frameBuffer = await readFile(framePath)
          const storagePath = `${userId}/video-analysis/${Date.now()}-${randomUUID()}-${frameFilename}`

          const { error: uploadErr } = await this.mediaAssetsRepository.uploadMediaObject(
            target.serviceClient,
            {
              filePath: storagePath,
              buffer: frameBuffer,
              contentType: 'image/jpeg',
            },
          )
          if (uploadErr) {
            continue
          }

          const { data: signedData } = await this.mediaAssetsRepository.createMediaSignedUrl(
            target.serviceClient,
            storagePath,
          )
          const frameUrl = signedData?.signedUrl ?? ''
          let mediaAssetId: string | null = null

          if (frameUrl) {
            const { data: asset } = await this.mediaAssetsRepository.createMediaAssetId(
              target.serviceClient,
              {
                user_id: userId,
                name: `video-frame-${i + 1}`,
                original_filename: frameFilename,
                file_path: storagePath,
                bucket_name: 'media',
                file_size: frameBuffer.length,
                mime_type: 'image/jpeg',
                asset_type: 'image',
                category: 'generated',
                campaign_id: campaignId ?? null,
                tags: ['video-analysis-frame'],
                source: 'generated',
                source_model: 'ffmpeg',
                source_prompt: 'video analysis frame extraction',
                public_url: frameUrl,
                is_public: false,
              },
            )
            mediaAssetId = typeof asset?.id === 'string' ? asset.id : null
          }

          if (frameUrl) {
            frames.push({
              index: i,
              timestamp_seconds:
                frameIntervalSeconds !== null
                  ? Number((i * frameIntervalSeconds).toFixed(3))
                  : null,
              url: frameUrl,
              media_asset_id: mediaAssetId,
            })
          }
        }
      }

      let transcriptText = ''
      let transcriptSegments: Array<{ start: number; end: number; text: string }> = []
      if (transcribe) {
        await onProgress?.('Extracting audio')
        await this.processClient.transcodeAudioToMp3({
          sourcePath,
          outputPath: audioPath,
          operation: 'audio extraction',
        })

        await onProgress?.('Transcribing audio')
        const transcription = await this.deepgramClient.transcribeAudioFile(audioPath, {
          language,
        })
        transcriptText = transcription.transcript
        transcriptSegments = transcription.segments
        if (!transcriptText.trim()) {
          return {
            success: false,
            error: 'No speech transcript returned from Deepgram',
            retry_hint:
              'If the spoken language is known, retry transcribe_audio with an explicit provider language code.',
            media_url: mediaUrl,
            campaign_id: campaignId ?? null,
            settings: {
              extract_frames: extractFrames,
              transcribe,
              language: language ?? null,
              frame_count: frameCount,
              frame_interval_seconds: frameIntervalSeconds,
            },
            analysis: {
              frame_count: frames.length,
              frames,
              transcript: '',
              transcript_segments: [],
            },
          }
        }
        await this.usage.chargeDeepgramUsage(target, {
          userId,
          campaignId,
          sessionKey,
          action: usageAction,
          transcript: transcriptText,
          metadata: {
            media_url: mediaUrl,
            ...(language ? { language } : {}),
          },
        })
      }

      return {
        success: true,
        media_url: mediaUrl,
        campaign_id: campaignId ?? null,
        settings: {
          extract_frames: extractFrames,
          transcribe,
          language: language ?? null,
          frame_count: frameCount,
          frame_interval_seconds: frameIntervalSeconds,
        },
        analysis: {
          frame_count: frames.length,
          frames,
          transcript: transcriptText,
          transcript_segments: transcriptSegments,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `${usageAction} failed`,
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  }

  async transcribeAudio(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    return this.analyzeVideo(
      target,
      { ...input, extract_frames: false, transcribe: true },
      sessionKey,
      onProgress,
      'transcribe_audio',
    )
  }

  private async buildTimemarks(
    sourcePath: string,
    frameCount: number,
    frameIntervalSeconds: number | null,
  ): Promise<number[]> {
    const duration = await this.readVideoDurationSeconds(sourcePath)
    if (!duration || duration <= 0) return []
    if (frameIntervalSeconds !== null) {
      const marks: number[] = []
      for (
        let timestamp = 0;
        timestamp < duration && marks.length < this.maxFrameCount;
        timestamp += frameIntervalSeconds
      ) {
        marks.push(Number(timestamp.toFixed(3)))
      }
      return marks.length > 0 ? marks : [0]
    }

    if (frameCount <= 1) return [0]
    const step = duration / frameCount
    const marks: number[] = []
    for (let i = 0; i < frameCount; i++) {
      marks.push(Number((i * step).toFixed(3)))
    }
    return marks
  }

  private async readVideoDurationSeconds(sourcePath: string): Promise<number | null> {
    return this.processClient.readVideoDurationSeconds(sourcePath)
  }
}
