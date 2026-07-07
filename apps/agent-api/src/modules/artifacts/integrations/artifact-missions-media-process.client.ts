import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Injectable } from '@nestjs/common'
import type ffmpegType from 'fluent-ffmpeg'

let ffmpegInstance: typeof ffmpegType | undefined
const execFileAsync = promisify(execFile)

export const MISSIONS_MEDIA_PROCESS_TIMEOUT_MS = 600_000

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
