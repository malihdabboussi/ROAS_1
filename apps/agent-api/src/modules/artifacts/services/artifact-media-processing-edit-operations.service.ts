import { join } from 'node:path'
import type { ArtifactMediaProcessingOperationRuntime } from './artifact-media-processing-advanced-operations.service'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

type ProgressFn = (message: string) => void | Promise<void>

const OVERLAY_POSITIONS: Record<string, string> = {
  'top-left': '20:20',
  'top-right': 'W-w-20:20',
  'bottom-left': '20:H-h-20',
  'bottom-right': 'W-w-20:H-h-20',
  center: '(W-w)/2:(H-h)/2',
}

const VALID_TRANSITIONS = new Set([
  'fade',
  'fadeblack',
  'fadewhite',
  'dissolve',
  'wipeleft',
  'wiperight',
  'wipeup',
  'wipedown',
  'slideleft',
  'slideright',
  'slideup',
  'slidedown',
  'circlecrop',
  'rectcrop',
  'distance',
  'radial',
  'smoothleft',
  'smoothright',
  'pixelize',
  'diagtl',
  'diagtr',
  'diagbl',
  'diagbr',
  'hlslice',
  'hrslice',
  'vuslice',
  'vdslice',
])

export class ArtifactMediaProcessingEditOperationsService {
  async opSpeed(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const factor = Number(input.factor ?? 1.0)
    if (!Number.isFinite(factor) || factor <= 0 || factor > 100) {
      throw new Error('factor must be > 0 and <= 100 (e.g. 0.5 = half speed, 2.0 = double)')
    }

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const videoFilter = `setpts=PTS/${factor}`
    const atempoFilters: string[] = []
    let remaining = factor
    while (remaining > 2.0) {
      atempoFilters.push('atempo=2.0')
      remaining /= 2.0
    }
    while (remaining < 0.5) {
      atempoFilters.push('atempo=0.5')
      remaining /= 0.5
    }
    atempoFilters.push(`atempo=${remaining.toFixed(6)}`)
    const audioFilter = atempoFilters.join(',')

    await onProgress?.(`Changing speed to ${factor}x`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .complexFilter(`[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`)
          .outputOptions('-map', '[v]', '-map', '[a]')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'speed',
    )

    return { outputPath, outputFormat }
  }

  async opOverlay(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const baseUrl = runtime.requireString(input, 'url')
    const overlayUrl = runtime.requireString(input, 'overlay_url')
    const position = typeof input.position === 'string' ? input.position.trim() : 'bottom-right'
    const scale = Number(input.scale ?? 0)
    const startTime = Number(input.start_time ?? 0)
    const endTime = Number(input.end_time ?? 0)

    await onProgress?.('Downloading base and overlay media')
    const basePath = await runtime.downloadFile(baseUrl, tempRoot, 'base')
    const overlayPath = await runtime.downloadFile(overlayUrl, tempRoot, 'overlay')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const pos =
      OVERLAY_POSITIONS[position] ??
      (typeof input.x === 'number' && typeof input.y === 'number'
        ? `${input.x}:${input.y}`
        : OVERLAY_POSITIONS['bottom-right'])

    let filterParts: string[] = []
    if (scale > 0) {
      filterParts.push(`[1:v]scale=${scale}:-1[ovr]`)
      let overlayFilter = `[0:v][ovr]overlay=${pos}`
      if (endTime > startTime) overlayFilter += `:enable='between(t,${startTime},${endTime})'`
      filterParts.push(`${overlayFilter}[out]`)
    } else {
      let overlayFilter = `[0:v][1:v]overlay=${pos}`
      if (endTime > startTime) overlayFilter += `:enable='between(t,${startTime},${endTime})'`
      filterParts.push(`${overlayFilter}[out]`)
    }

    await onProgress?.('Applying overlay')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()()
          .input(basePath)
          .input(overlayPath)
          .complexFilter(filterParts.join(';'))
          .outputOptions('-map', '[out]', '-map', '0:a?')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'overlay',
    )

    return { outputPath, outputFormat }
  }

  async opCrop(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const width = Number(input.width ?? 0)
    const height = Number(input.height ?? 0)
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error('width and height are required and must be > 0')
    }
    const x = Number(input.x ?? -1)
    const y = Number(input.y ?? -1)
    const cx = x >= 0 ? x : '(in_w-out_w)/2'
    const cy = y >= 0 ? y : '(in_h-out_h)/2'

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.(`Cropping to ${width}x${height}`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(`crop=${width}:${height}:${cx}:${cy}`)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'crop',
    )

    return { outputPath, outputFormat }
  }

  async opThumbnail(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const timestamp = Number(input.timestamp ?? 0)
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new Error('timestamp must be >= 0 (seconds)')
    }

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'jpg')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Extracting frame')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .seekInput(timestamp)
          .frames(1)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'thumbnail',
    )

    return { outputPath, outputFormat }
  }

  async opTextOverlay(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const text = runtime.requireString(input, 'text')
    const fontSize = Number(input.font_size ?? 48)
    const fontColor = typeof input.font_color === 'string' ? input.font_color.trim() : 'white'
    const bgColor = typeof input.background_color === 'string' ? input.background_color.trim() : ''
    const position = typeof input.position === 'string' ? input.position.trim() : 'center'
    const startTime = Number(input.start_time ?? 0)
    const endTime = Number(input.end_time ?? 0)

    const posMap: Record<string, { x: string; y: string }> = {
      center: { x: '(w-tw)/2', y: '(h-th)/2' },
      top: { x: '(w-tw)/2', y: '40' },
      bottom: { x: '(w-tw)/2', y: 'h-th-40' },
      'top-left': { x: '40', y: '40' },
      'top-right': { x: 'w-tw-40', y: '40' },
      'bottom-left': { x: '40', y: 'h-th-40' },
      'bottom-right': { x: 'w-tw-40', y: 'h-th-40' },
    }
    const pos = posMap[position] ?? posMap['center']!

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const escapedText = text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:')
    let filter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${pos.x}:y=${pos.y}`
    if (bgColor) filter += `:box=1:boxcolor=${bgColor}:boxborderw=8`
    if (endTime > startTime) filter += `:enable='between(t,${startTime},${endTime})'`

    await onProgress?.('Burning text overlay')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(filter)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'text_overlay',
    )

    return { outputPath, outputFormat }
  }

  async opTransition(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url1 = runtime.requireString(input, 'url')
    const url2 = runtime.requireString(input, 'url2')
    const transition = typeof input.transition === 'string' ? input.transition.trim() : 'fade'
    if (!VALID_TRANSITIONS.has(transition)) {
      throw new Error(
        `Invalid transition "${transition}". Supported: ${[...VALID_TRANSITIONS].join(', ')}`,
      )
    }
    const duration = Number(input.duration ?? 1)
    if (!Number.isFinite(duration) || duration <= 0 || duration > 5) {
      throw new Error('duration must be between 0 and 5 seconds')
    }

    await onProgress?.('Downloading both clips')
    const path1 = await runtime.downloadFile(url1, tempRoot, 'clip1')
    const path2 = await runtime.downloadFile(url2, tempRoot, 'clip2')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const clip1Duration = await new Promise<number>((resolve, reject) => {
      getFfmpeg().ffprobe(path1, (err: Error | null, data: any) => {
        if (err) return reject(err)
        resolve(Number(data?.format?.duration ?? 5))
      })
    })
    const offset = Math.max(0, clip1Duration - duration)

    await onProgress?.(`Applying ${transition} transition`)
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()()
          .input(path1)
          .input(path2)
          .complexFilter(
            `[0:v][1:v]xfade=transition=${transition}:duration=${duration}:offset=${offset.toFixed(3)}[v];` +
              `[0:a][1:a]acrossfade=d=${duration}[a]`,
          )
          .outputOptions('-map', '[v]', '-map', '[a]')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'transition',
    )

    return { outputPath, outputFormat }
  }
}
