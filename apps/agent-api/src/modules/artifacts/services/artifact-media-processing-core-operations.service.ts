import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ArtifactMediaProcessingOperationRuntime } from './artifact-media-processing-advanced-operations.service'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

type ProgressFn = (message: string) => void | Promise<void>

type AudioEffect =
  | 'reverb'
  | 'echo'
  | 'fade_in'
  | 'fade_out'
  | 'volume'
  | 'pitch'
  | 'normalize'
  | 'bass_boost'
  | 'speed'

const VALID_AUDIO_EFFECTS = new Set<AudioEffect>([
  'reverb',
  'echo',
  'fade_in',
  'fade_out',
  'volume',
  'pitch',
  'normalize',
  'bass_boost',
  'speed',
])

export class ArtifactMediaProcessingCoreOperationsService {
  async opProbe(
    input: Record<string, unknown>,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ) {
    const url = typeof input.url === 'string' ? input.url.trim() : ''
    if (!url || !/^https?:\/\//i.test(url)) {
      return { success: false, error: 'url is required (HTTP/HTTPS)' }
    }

    await onProgress?.('Analyzing media')
    const tempRoot = await mkdtemp(join(tmpdir(), 'vibey-probe-'))
    try {
      const sourcePath = await runtime.downloadFile(url, tempRoot, 'probe')
      const metadata = await new Promise<Record<string, unknown>>((resolve, reject) => {
        getFfmpeg().ffprobe(sourcePath, (err: Error | null, data: any) => {
          if (err) return reject(err)
          resolve(data as Record<string, unknown>)
        })
      })
      const format = metadata.format as Record<string, unknown> | undefined
      const streams = Array.isArray(metadata.streams) ? metadata.streams : []
      const videoStream = streams.find((s: any) => s.codec_type === 'video') as
        | Record<string, unknown>
        | undefined
      const audioStream = streams.find((s: any) => s.codec_type === 'audio') as
        | Record<string, unknown>
        | undefined

      return {
        success: true,
        operation: 'probe',
        duration: Number(format?.duration ?? 0),
        format_name: format?.format_name ?? null,
        file_size: Number(format?.size ?? 0),
        bit_rate: Number(format?.bit_rate ?? 0),
        video: videoStream
          ? {
              codec: videoStream.codec_name,
              width: videoStream.width,
              height: videoStream.height,
              fps: videoStream.r_frame_rate,
              duration: Number(videoStream.duration ?? format?.duration ?? 0),
            }
          : null,
        audio: audioStream
          ? {
              codec: audioStream.codec_name,
              sample_rate: Number(audioStream.sample_rate ?? 0),
              channels: audioStream.channels,
              duration: Number(audioStream.duration ?? format?.duration ?? 0),
            }
          : null,
        stream_count: streams.length,
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  }

  async opTrim(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const startSeconds = Number(input.start_seconds ?? 0)
    const durationSeconds = Number(input.duration_seconds ?? 0)
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error('duration_seconds is required and must be > 0')
    }

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Trimming media')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .setStartTime(startSeconds)
          .setDuration(durationSeconds)
          .output(outputPath)
          .outputOptions('-c', 'copy')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'trim',
    )

    return { outputPath, outputFormat }
  }

  async opConcat(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const inputs = runtime.requireInputsArray(input)
    if (inputs.length < 2) throw new Error('concat requires at least 2 inputs')

    await onProgress?.(`Downloading ${inputs.length} files`)
    const paths = await runtime.downloadInputs(inputs, tempRoot)
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)
    const listPath = join(tempRoot, 'concat-list.txt')

    const listContent = paths.map((p) => `file '${p}'`).join('\n')
    await writeFile(listPath, listContent, 'utf-8')

    await onProgress?.('Concatenating clips')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()()
          .input(listPath)
          .inputOptions('-f', 'concat', '-safe', '0')
          .output(outputPath)
          .outputOptions('-c', 'copy')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'concat',
    )

    return { outputPath, outputFormat }
  }

  async opConvert(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.(`Converting to ${outputFormat}`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'convert',
    )

    return { outputPath, outputFormat }
  }

  async opExtractAudio(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp3')

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Extracting audio')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .noVideo()
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'audio extraction',
    )

    return { outputPath, outputFormat }
  }

  async opAddAudio(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const videoUrl = runtime.requireString(input, 'video_url')
    const audioUrl = runtime.requireString(input, 'audio_url')
    const replace = input.replace === true

    await onProgress?.('Downloading video and audio')
    const videoPath = await runtime.downloadFile(videoUrl, tempRoot, 'video')
    const audioPath = await runtime.downloadFile(audioUrl, tempRoot, 'audio')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Mixing audio')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        const cmd = getFfmpeg()().input(videoPath).input(audioPath)

        if (replace) {
          cmd.outputOptions('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest')
        } else {
          cmd
            .complexFilter('[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]')
            .outputOptions('-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy')
        }

        cmd
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'audio mixing',
    )

    return { outputPath, outputFormat }
  }

  async opResize(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const resolution = runtime.requireString(input, 'resolution')
    if (!/^\d+x\d+$/.test(resolution)) {
      throw new Error('resolution must be in WIDTHxHEIGHT format (e.g. "1080x1920")')
    }

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const [w, h] = resolution.split('x').map(Number)
    await onProgress?.(`Resizing to ${resolution}`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(
            `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
          )
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'resize',
    )

    return { outputPath, outputFormat }
  }

  async opCompose(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const inputs = runtime.requireInputsArray(input)
    if (inputs.length === 0) throw new Error('compose requires at least 1 input')

    const audioUrl = typeof input.audio_url === 'string' ? input.audio_url.trim() : null
    const resolution = typeof input.resolution === 'string' ? input.resolution.trim() : null
    if (resolution && !/^\d+x\d+$/.test(resolution)) {
      throw new Error('resolution must be in WIDTHxHEIGHT format')
    }

    await onProgress?.(`Downloading ${inputs.length} source file(s)`)
    const downloadedPaths = await runtime.downloadInputs(inputs, tempRoot)

    const trimmedDir = join(tempRoot, 'trimmed')
    await mkdir(trimmedDir, { recursive: true })

    const trimmedPaths: string[] = []
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i]!
      const srcPath = downloadedPaths[i]!
      const hasTrim =
        (inp.trim_start != null && inp.trim_start > 0) ||
        (inp.trim_duration != null && inp.trim_duration > 0)

      if (hasTrim) {
        const trimPath = join(trimmedDir, `clip-${i}.mp4`)
        await onProgress?.(`Trimming clip ${i + 1}/${inputs.length}`)
        await runtime.runWithTimeout(
          new Promise<void>((resolve, reject) => {
            const cmd = getFfmpeg()(srcPath)
            if (inp.trim_start != null && inp.trim_start > 0) cmd.setStartTime(inp.trim_start)
            if (inp.trim_duration != null && inp.trim_duration > 0)
              cmd.setDuration(inp.trim_duration)
            cmd
              .output(trimPath)
              .outputOptions('-c', 'copy')
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
              .run()
          }),
          `trim clip ${i + 1}`,
        )
        trimmedPaths.push(trimPath)
      } else {
        trimmedPaths.push(srcPath)
      }
    }

    let concatPath: string
    if (trimmedPaths.length === 1) {
      concatPath = trimmedPaths[0]!
    } else {
      concatPath = join(tempRoot, 'concat.mp4')
      const listPath = join(tempRoot, 'compose-list.txt')
      await writeFile(listPath, trimmedPaths.map((p) => `file '${p}'`).join('\n'), 'utf-8')

      await onProgress?.('Concatenating clips')
      await runtime.runWithTimeout(
        new Promise<void>((resolve, reject) => {
          getFfmpeg()()
            .input(listPath)
            .inputOptions('-f', 'concat', '-safe', '0')
            .output(concatPath)
            .outputOptions('-c', 'copy')
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run()
        }),
        'compose concat',
      )
    }

    let currentPath = concatPath
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')

    if (audioUrl) {
      await onProgress?.('Adding audio track')
      const audioPath = await runtime.downloadFile(audioUrl, tempRoot, 'audio')
      const audioMixed = join(tempRoot, `audio-mixed.${outputFormat}`)
      await runtime.runWithTimeout(
        new Promise<void>((resolve, reject) => {
          getFfmpeg()()
            .input(currentPath)
            .input(audioPath)
            .outputOptions('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest')
            .output(audioMixed)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run()
        }),
        'compose audio mix',
      )
      currentPath = audioMixed
    }

    if (resolution) {
      const [w, h] = resolution.split('x').map(Number)
      const resized = join(tempRoot, `resized.${outputFormat}`)
      await onProgress?.(`Resizing to ${resolution}`)
      await runtime.runWithTimeout(
        new Promise<void>((resolve, reject) => {
          getFfmpeg()(currentPath)
            .videoFilter(
              `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
            )
            .output(resized)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run()
        }),
        'compose resize',
      )
      currentPath = resized
    }

    const finalOutput = join(tempRoot, `final.${outputFormat}`)
    if (currentPath !== finalOutput) {
      const buf = await readFile(currentPath)
      await writeFile(finalOutput, buf)
    }

    return { outputPath: finalOutput, outputFormat }
  }

  async opAudioEffect(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const effect = String(input.effect ?? '').trim() as AudioEffect
    if (!VALID_AUDIO_EFFECTS.has(effect)) {
      throw new Error(
        `Invalid effect "${effect}". Supported: ${[...VALID_AUDIO_EFFECTS].join(', ')}`,
      )
    }

    await onProgress?.('Downloading source audio')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp3')
    const outputPath = join(tempRoot, `output.${outputFormat}`)
    const filter = this.buildAudioFilter(effect, input)

    await onProgress?.(`Applying ${effect} effect`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .audioFilters(filter)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      `audio_effect:${effect}`,
    )

    return { outputPath, outputFormat }
  }

  private buildAudioFilter(effect: AudioEffect, input: Record<string, unknown>): string {
    const num = (key: string, fallback: number) => {
      const v = Number(input[key] ?? fallback)
      return Number.isFinite(v) ? v : fallback
    }
    switch (effect) {
      case 'reverb':
        return `aecho=${num('in_gain', 0.8)}:${num('out_gain', 0.88)}:${num('delay_ms', 60)}:${num('decay', 0.4)}`
      case 'echo':
        return `aecho=${num('in_gain', 0.8)}:${num('out_gain', 0.9)}:${num('delay_ms', 500)}:${num('decay', 0.5)}`
      case 'fade_in':
        return `afade=t=in:d=${num('duration', 2)}`
      case 'fade_out':
        return `afade=t=out:st=${num('start', 0)}:d=${num('duration', 2)}`
      case 'volume':
        return `volume=${num('level', 1.5)}`
      case 'pitch': {
        const semitones = num('semitones', 0)
        const rate = Math.pow(2, semitones / 12)
        return `asetrate=44100*${rate.toFixed(6)},aresample=44100`
      }
      case 'normalize':
        return 'loudnorm=I=-16:TP=-1.5:LRA=11'
      case 'bass_boost':
        return `equalizer=f=80:t=q:w=1:g=${num('gain_db', 6)}`
      case 'speed': {
        const speed = num('factor', 1.0)
        return `atempo=${Math.max(0.5, Math.min(2.0, speed))}`
      }
      default:
        throw new Error(`Unhandled audio effect: ${effect}`)
    }
  }
}
