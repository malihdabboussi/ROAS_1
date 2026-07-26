import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { ArtifactMediaProcessingOperationRuntime } from './artifact-media-processing-advanced-operations.service'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

const execFileAsync = promisify(execFile)
const APPROVED_EMOJIS = new Set(['👇', '⏰', '✅', '🚨', '🙌'])

type ProgressFn = (message: string) => void | Promise<void>

export class ArtifactIgStoryRendererService {
  async render(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const sourceUrl = runtime.requireString(input, 'url')
    const pillLine = runtime.requireString(input, 'pill_line')
    const ctaLine = runtime.requireString(input, 'cta_line')
    const emoji = runtime.requireString(input, 'emoji')
    if (!APPROVED_EMOJIS.has(emoji)) throw new Error('emoji is not in the approved set')

    const headlineLines = this.readHeadlineLines(input.headline_lines)
    await onProgress?.('Downloading IG Story source video')
    const sourcePath = await runtime.downloadFile(sourceUrl, tempRoot, 'ig-story-source')
    const overlayPath = join(tempRoot, 'ig-story-overlay.png')
    const specPath = join(tempRoot, 'ig-story-spec.json')
    const scriptPath =
      process.env.IG_STORY_RENDER_SCRIPT_PATH || join(__dirname, '../scripts/render_ig_story.py')

    await writeFile(
      specPath,
      JSON.stringify({
        pill_line: pillLine,
        headline_lines: headlineLines,
        cta_line: ctaLine,
        emoji,
        font_path:
          process.env.IG_STORY_MONTSERRAT_FONT_PATH ||
          '/usr/local/share/fonts/Montserrat-Italic.ttf',
        emoji_font_path:
          process.env.IG_STORY_EMOJI_FONT_PATH ||
          '/usr/local/share/fonts/AppleColorEmoji-Linux.ttf',
        output_path: overlayPath,
      }),
      'utf8',
    )

    await onProgress?.('Rendering exact IG Story stickers')
    await runtime.runWithTimeout(
      execFileAsync('python3', [scriptPath, specPath], {
        maxBuffer: 1024 * 1024,
      }).then(() => undefined),
      'render_ig_story_overlay',
    )

    const hasAudio = await this.hasAudioStream(sourcePath)
    const outputPath = join(tempRoot, 'output.mp4')
    await onProgress?.('Compositing IG Story video and audio')
    await runtime.runWithTimeout(
      this.compositeVideo({ sourcePath, overlayPath, outputPath, hasAudio }),
      'render_ig_story',
    )

    return { outputPath, outputFormat: 'mp4' }
  }

  private readHeadlineLines(value: unknown): Array<{ text: string; highlighted: boolean }> {
    if (!Array.isArray(value) || value.length === 0 || value.length > 4) {
      throw new Error('headline_lines must include between 1 and 4 lines')
    }
    return value.map((line, index) => {
      if (!line || typeof line !== 'object' || Array.isArray(line)) {
        throw new Error(`headline_lines[${index}] must be an object`)
      }
      const record = line as Record<string, unknown>
      const text = typeof record.text === 'string' ? record.text.trim() : ''
      if (!text) throw new Error(`headline_lines[${index}].text is required`)
      return { text, highlighted: record.highlighted === true }
    })
  }

  private async hasAudioStream(sourcePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      getFfmpeg().ffprobe(sourcePath, (error, data) => {
        if (error) return reject(error)
        resolve(data.streams.some((stream) => stream.codec_type === 'audio'))
      })
    })
  }

  private async compositeVideo(input: {
    sourcePath: string
    overlayPath: string
    outputPath: string
    hasAudio: boolean
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = getFfmpeg()()
        .input(input.sourcePath)
        .inputOptions('-stream_loop', '-1')
        .input(input.overlayPath)

      if (!input.hasAudio) {
        command.input('anullsrc=channel_layout=stereo:sample_rate=48000').inputFormat('lavfi')
      }

      command
        .complexFilter(
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[base];[base][1:v]overlay=0:0:format=auto[out]',
        )
        .outputOptions(
          '-map',
          '[out]',
          '-map',
          input.hasAudio ? '0:a:0' : '2:a:0',
          '-t',
          '10',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
        )
        .output(input.outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
  }
}
