import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

type ProgressFn = (message: string) => void | Promise<void>

interface MediaInput {
  url: string
  trim_start?: number
  trim_duration?: number
}

export interface ArtifactMediaProcessingOperationRuntime {
  requireString(input: Record<string, unknown>, field: string): string
  requireInputsArray(input: Record<string, unknown>): MediaInput[]
  resolveOutputFormat(input: Record<string, unknown>, fallback: string): string
  downloadFile(url: string, tempRoot: string, prefix: string): Promise<string>
  downloadInputs(inputs: MediaInput[], tempRoot: string): Promise<string[]>
  runWithTimeout<T>(promise: Promise<T>, operation: string): Promise<T>
}

export class ArtifactMediaProcessingAdvancedOperationsService {
  async opChromaKey(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const fgUrl = runtime.requireString(input, 'url')
    const bgUrl = runtime.requireString(input, 'background_url')
    const color = typeof input.color === 'string' ? input.color.trim() : '0x00ff00'
    const similarity = Number(input.similarity ?? 0.3)
    const blend = Number(input.blend ?? 0.1)

    await onProgress?.('Downloading foreground and background')
    const fgPath = await runtime.downloadFile(fgUrl, tempRoot, 'foreground')
    const bgPath = await runtime.downloadFile(bgUrl, tempRoot, 'background')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Applying chroma key')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()()
          .input(bgPath)
          .input(fgPath)
          .complexFilter(
            `[1:v]chromakey=${color}:${similarity}:${blend}[fg];[0:v][fg]overlay=0:0[out]`,
          )
          .outputOptions('-map', '[out]', '-map', '1:a?')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'chroma_key',
    )

    return { outputPath, outputFormat }
  }

  async opSplitScreen(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const inputs = runtime.requireInputsArray(input)
    if (inputs.length < 2 || inputs.length > 4) {
      throw new Error('split_screen requires 2-4 inputs')
    }
    const layout = typeof input.layout === 'string' ? input.layout.trim() : 'horizontal'

    await onProgress?.(`Downloading ${inputs.length} clips`)
    const paths = await runtime.downloadInputs(inputs, tempRoot)
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    let filter: string
    if (inputs.length === 2) {
      if (layout === 'vertical') {
        filter = '[0:v]scale=1080:-2[a];[1:v]scale=1080:-2[b];[a][b]vstack=inputs=2[out]'
      } else {
        filter = '[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack=inputs=2[out]'
      }
    } else if (inputs.length === 3) {
      filter =
        '[0:v]scale=640:360[a];[1:v]scale=640:360[b];[2:v]scale=1280:360[c];[a][b]hstack=inputs=2[top];[top][c]vstack=inputs=2[out]'
    } else {
      filter =
        '[0:v]scale=640:360[a];[1:v]scale=640:360[b];[2:v]scale=640:360[c];[3:v]scale=640:360[d];[a][b]hstack=inputs=2[top];[c][d]hstack=inputs=2[bot];[top][bot]vstack=inputs=2[out]'
    }

    await onProgress?.('Creating split screen')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        const cmd = getFfmpeg()()
        for (const p of paths) cmd.input(p)
        cmd
          .complexFilter(filter)
          .outputOptions('-map', '[out]', '-map', '0:a?')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'split_screen',
    )

    return { outputPath, outputFormat }
  }

  async opSubtitleBurn(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const videoUrl = runtime.requireString(input, 'url')
    const subtitleContent =
      typeof input.subtitle_content === 'string' ? input.subtitle_content.trim() : ''
    const subtitleUrl = typeof input.subtitle_url === 'string' ? input.subtitle_url.trim() : ''
    if (!subtitleContent && !subtitleUrl) {
      throw new Error('Either subtitle_content (SRT/ASS text) or subtitle_url is required')
    }

    await onProgress?.('Downloading video')
    const videoPath = await runtime.downloadFile(videoUrl, tempRoot, 'video')

    let subsPath: string
    if (subtitleUrl) {
      subsPath = await runtime.downloadFile(subtitleUrl, tempRoot, 'subs')
    } else {
      const ext = subtitleContent.trim().startsWith('[Script Info]') ? 'ass' : 'srt'
      subsPath = join(tempRoot, `subs.${ext}`)
      await writeFile(subsPath, subtitleContent, 'utf-8')
    }

    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)
    const isAss = subsPath.endsWith('.ass')
    const filter = isAss
      ? `ass='${subsPath.replace(/'/g, "'\\''").replace(/:/g, '\\:')}'`
      : `subtitles='${subsPath.replace(/'/g, "'\\''").replace(/:/g, '\\:')}'`

    await onProgress?.('Burning subtitles')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(videoPath)
          .videoFilter(filter)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'subtitle_burn',
    )

    return { outputPath, outputFormat }
  }

  async opSilenceRemove(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const noiseDb = Number(input.noise_db ?? -30)
    const minSilenceDuration = Number(input.min_silence_duration ?? 0.5)

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')

    await onProgress?.('Detecting silence')
    const silenceSegments = await new Promise<Array<{ start: number; end: number }>>(
      (resolve, reject) => {
        const segments: Array<{ start: number; end: number }> = []
        let currentStart: number | null = null
        getFfmpeg()(sourcePath)
          .audioFilters(`silencedetect=noise=${noiseDb}dB:d=${minSilenceDuration}`)
          .format('null')
          .output('/dev/null')
          .on('stderr', (line: string) => {
            const startMatch = line.match(/silence_start:\s*([\d.]+)/)
            const endMatch = line.match(/silence_end:\s*([\d.]+)/)
            if (startMatch) currentStart = parseFloat(startMatch[1]!)
            if (endMatch && currentStart !== null) {
              segments.push({ start: currentStart, end: parseFloat(endMatch[1]!) })
              currentStart = null
            }
          })
          .on('end', () => resolve(segments))
          .on('error', (err) => reject(err))
          .run()
      },
    )

    const duration = await new Promise<number>((resolve, reject) => {
      getFfmpeg().ffprobe(sourcePath, (err: Error | null, data: any) => {
        if (err) return reject(err)
        resolve(Number(data?.format?.duration ?? 0))
      })
    })

    const nonSilent: Array<{ start: number; end: number }> = []
    let pos = 0
    for (const seg of silenceSegments) {
      if (seg.start > pos) nonSilent.push({ start: pos, end: seg.start })
      pos = seg.end
    }
    if (pos < duration) nonSilent.push({ start: pos, end: duration })

    if (nonSilent.length === 0) {
      throw new Error(
        'No non-silent segments found — the entire file appears silent at the given threshold',
      )
    }

    const selectExpr = nonSilent
      .map((s) => `between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})`)
      .join('+')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.(`Removing ${silenceSegments.length} silent segments`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .complexFilter(
            `[0:v]select='${selectExpr}',setpts=N/FRAME_RATE/TB[v];` +
              `[0:a]aselect='${selectExpr}',asetpts=N/SR/TB[a]`,
          )
          .outputOptions('-map', '[v]', '-map', '[a]')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'silence_remove',
    )

    return { outputPath, outputFormat }
  }

  async opFrameExtract(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const interval = Number(input.interval_seconds ?? 5)
    const maxFrames = Number(input.max_frames ?? 10)
    if (!Number.isFinite(interval) || interval <= 0) throw new Error('interval_seconds must be > 0')
    if (!Number.isFinite(maxFrames) || maxFrames < 1 || maxFrames > 50)
      throw new Error('max_frames must be 1-50')

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'jpg')
    const framesDir = join(tempRoot, 'frames')
    await mkdir(framesDir, { recursive: true })

    await onProgress?.(`Extracting frames every ${interval}s`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(`fps=1/${interval}`)
          .frames(maxFrames)
          .output(join(framesDir, `frame-%04d.${outputFormat}`))
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'frame_extract',
    )

    const { readdir } = await import('node:fs/promises')
    const files = (await readdir(framesDir)).filter((f) => f.startsWith('frame-')).sort()

    const stripPath = join(tempRoot, `strip.${outputFormat}`)
    if (files.length > 1) {
      const inputs = files.map((f) => join(framesDir, f))
      const filterInputs = inputs.map((_, i) => `[${i}:v]`).join('')
      await runtime.runWithTimeout(
        new Promise<void>((resolve, reject) => {
          const cmd = getFfmpeg()()
          for (const f of inputs) cmd.input(f)
          cmd
            .complexFilter(`${filterInputs}hstack=inputs=${inputs.length}[out]`)
            .outputOptions('-map', '[out]')
            .output(stripPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run()
        }),
        'frame_extract storyboard',
      )
    } else if (files.length === 1) {
      const buf = await readFile(join(framesDir, files[0]!))
      await writeFile(stripPath, buf)
    } else {
      throw new Error('No frames extracted — video may be too short for the given interval')
    }

    return { outputPath: stripPath, outputFormat }
  }

  async opWaveform(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const width = Number(input.width ?? 1920)
    const height = Number(input.height ?? 200)
    const color = typeof input.color === 'string' ? input.color.trim() : 'white'

    await onProgress?.('Downloading source audio')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'png')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Generating waveform')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .complexFilter(`[0:a]showwavespic=s=${width}x${height}:colors=${color}[out]`)
          .outputOptions('-map', '[out]', '-frames:v', '1')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'waveform',
    )

    return { outputPath, outputFormat }
  }
}
