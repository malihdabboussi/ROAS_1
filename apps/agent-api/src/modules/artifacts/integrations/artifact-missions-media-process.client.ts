import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { promisify } from 'node:util'
import { Injectable } from '@nestjs/common'
import type ffmpegType from 'fluent-ffmpeg'

let ffmpegInstance: typeof ffmpegType | undefined
const execFileAsync = promisify(execFile)

export const MISSIONS_MEDIA_PROCESS_TIMEOUT_MS = 600_000

export type YtDlpSubtitleResult = {
  transcript: string
  segments: Array<{ start: number; end: number; text: string }>
  language: string
}

@Injectable()
export class ArtifactMissionsMediaProcessClient {
  async extractFrames(input: {
    sourcePath: string
    framesDir: string
    timemarks: number[]
    frameCount: number
  }): Promise<void> {
    await this.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        this.getFfmpeg()(input.sourcePath)
          .on('end', () => resolve())
          .on('error', (error) => reject(error))
          .screenshots({
            folder: input.framesDir,
            filename: 'frame-%03i.jpg',
            size: '1280x?',
            ...(input.timemarks.length > 0
              ? { timemarks: input.timemarks }
              : { count: input.frameCount }),
          })
      }),
      'frame extraction',
    )
  }

  async transcodeAudioToMp3(input: {
    sourcePath: string
    outputPath: string
    operation: string
  }): Promise<void> {
    await this.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        this.getFfmpeg()(input.sourcePath)
          .noVideo()
          .audioCodec('libmp3lame')
          .output(input.outputPath)
          .on('end', () => resolve())
          .on('error', (error) => reject(error))
          .run()
      }),
      input.operation,
    )
  }

  async readVideoDurationSeconds(sourcePath: string): Promise<number | null> {
    try {
      const metadata = await new Promise<ffmpegType.FfprobeData>((resolve, reject) => {
        this.getFfmpeg().ffprobe(sourcePath, (error, data) => {
          if (error) reject(error)
          else resolve(data)
        })
      })
      const duration = Number(metadata.format?.duration ?? 0)
      return Number.isFinite(duration) && duration > 0 ? duration : null
    } catch {
      return null
    }
  }

  async fetchYtDlpMetadata(
    url: string,
    cookieFile?: string | null,
  ): Promise<{ title: string; duration_seconds: number } | null> {
    try {
      const args = ['--dump-json', '--no-download', '--no-warnings', '--no-playlist']
      if (cookieFile) args.push('--cookies', cookieFile)
      args.push(url)
      const { stdout } = await execFileAsync('yt-dlp', args, {
        timeout: 30_000,
        maxBuffer: 5 * 1024 * 1024,
      })
      const json = JSON.parse(stdout)
      return {
        title: json.title ?? json.fulltitle ?? '',
        duration_seconds: Number(json.duration ?? 0),
      }
    } catch {
      return null
    }
  }

  async downloadViaYtDlp(
    url: string,
    outputPath: string,
    cookieFile?: string | null,
  ): Promise<void> {
    const args = ['-f', 'bestaudio[ext=m4a]/bestaudio/best', '--no-playlist', '--no-warnings']
    if (cookieFile) args.push('--cookies', cookieFile)
    args.push('-o', outputPath, url)
    await execFileAsync('yt-dlp', args, { timeout: MISSIONS_MEDIA_PROCESS_TIMEOUT_MS })
  }

  async fetchYtDlpSubtitles(
    url: string,
    outputPrefix: string,
    languages: string[],
    cookieFile?: string | null,
  ): Promise<YtDlpSubtitleResult | null> {
    const requestedLanguages = [...new Set(languages.map((value) => value.trim()).filter(Boolean))]
    const args = [
      '--skip-download',
      '--no-playlist',
      '--no-warnings',
      '--write-subs',
      '--write-auto-subs',
      '--sub-format',
      'json3',
      '--sub-langs',
      requestedLanguages.join(','),
    ]
    if (cookieFile) args.push('--cookies', cookieFile)
    args.push('-o', outputPrefix, url)
    await execFileAsync('yt-dlp', args, { timeout: 90_000, maxBuffer: 5 * 1024 * 1024 })

    const prefix = basename(outputPrefix)
    const subtitleFiles = (await readdir(dirname(outputPrefix)))
      .filter((file) => file.startsWith(`${prefix}.`) && file.endsWith('.json3'))
      .sort(
        (left, right) =>
          this.subtitleLanguageRank(left, requestedLanguages) -
          this.subtitleLanguageRank(right, requestedLanguages),
      )
    for (const file of subtitleFiles) {
      const parsed = this.parseYtDlpJson3(
        await readFile(`${dirname(outputPrefix)}/${file}`, 'utf8'),
      )
      if (parsed) {
        return {
          ...parsed,
          language: file.slice(prefix.length + 1, -'.json3'.length),
        }
      }
    }
    return null
  }

  private subtitleLanguageRank(file: string, languages: string[]): number {
    const language = file.slice(file.indexOf('.') + 1, -'.json3'.length)
    const exact = languages.indexOf(language)
    if (exact >= 0) return exact
    const base = language.split('-')[0]
    const baseMatch = languages.findIndex((candidate) => candidate.split('-')[0] === base)
    return baseMatch >= 0 ? baseMatch + languages.length : Number.MAX_SAFE_INTEGER
  }

  private parseYtDlpJson3(raw: string): Omit<YtDlpSubtitleResult, 'language'> | null {
    const payload = JSON.parse(raw) as {
      events?: Array<{
        tStartMs?: number
        dDurationMs?: number
        segs?: Array<{ utf8?: string }>
      }>
    }
    const segments = (payload.events ?? [])
      .map((event) => {
        const text = (event.segs ?? [])
          .map((segment) => segment.utf8 ?? '')
          .join('')
          .trim()
        if (!text || text === '\n') return null
        const start = Number(((event.tStartMs ?? 0) / 1000).toFixed(3))
        const end = Number((((event.tStartMs ?? 0) + (event.dDurationMs ?? 0)) / 1000).toFixed(3))
        return { start, end, text }
      })
      .filter(
        (segment): segment is { start: number; end: number; text: string } => segment !== null,
      )
    if (segments.length === 0) return null
    return { transcript: segments.map((segment) => segment.text).join(' '), segments }
  }

  private async runWithTimeout<T>(
    promise: Promise<T>,
    operation: string,
    timeoutMs = MISSIONS_MEDIA_PROCESS_TIMEOUT_MS,
  ): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`Video ${operation} timed out`)), timeoutMs)
    })
    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  private getFfmpeg(): typeof ffmpegType {
    if (!ffmpegInstance) ffmpegInstance = require('fluent-ffmpeg')
    return ffmpegInstance!
  }
}
