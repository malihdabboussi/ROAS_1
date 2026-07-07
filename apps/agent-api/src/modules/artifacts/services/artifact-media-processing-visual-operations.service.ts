import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ArtifactMediaProcessingOperationRuntime } from './artifact-media-processing-advanced-operations.service'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

type ProgressFn = (message: string) => void | Promise<void>

export class ArtifactMediaProcessingVisualOperationsService {
  async opColorGrade(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const num = (key: string, fallback: number) => {
      const v = Number(input[key] ?? fallback)
      return Number.isFinite(v) ? v : fallback
    }

    const filters: string[] = []
    const brightness = num('brightness', 0)
    const contrast = num('contrast', 1)
    const saturation = num('saturation', 1)
    const gamma = num('gamma', 1)
    if (brightness !== 0 || contrast !== 1 || saturation !== 1 || gamma !== 1) {
      filters.push(
        `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma=${gamma}`,
      )
    }
    const hue = num('hue', 0)
    if (hue !== 0) filters.push(`hue=h=${hue}`)
    const temperature = num('temperature', 0)
    if (temperature !== 0) {
      const r = temperature > 0 ? 1 + temperature * 0.1 : 1
      const b = temperature < 0 ? 1 + Math.abs(temperature) * 0.1 : 1
      filters.push(`colorbalance=rs=${(r - 1).toFixed(2)}:bs=${(1 - b).toFixed(2)}`)
    }
    const preset = typeof input.preset === 'string' ? input.preset.trim() : ''
    if (preset) {
      const presetMap: Record<string, string> = {
        vintage: 'curves=preset=vintage',
        lighter: 'curves=preset=lighter',
        darker: 'curves=preset=darker',
        increase_contrast: 'curves=preset=increase_contrast',
        negative: 'curves=preset=negative',
        cross_process: 'curves=preset=cross_process',
      }
      if (presetMap[preset]) filters.push(presetMap[preset])
    }
    if (filters.length === 0) {
      throw new Error(
        'color_grade requires at least one adjustment (brightness, contrast, saturation, gamma, hue, temperature, preset)',
      )
    }

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Applying color grade')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(filters.join(','))
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'color_grade',
    )

    return { outputPath, outputFormat }
  }

  async opBlur(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const strength = Number(input.strength ?? 5)
    if (!Number.isFinite(strength) || strength <= 0) {
      throw new Error('strength must be a positive number (default 5, range ~1-20)')
    }
    const mode = typeof input.mode === 'string' ? input.mode.trim() : 'gaussian'

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const filter = mode === 'box' ? `boxblur=${strength}:${strength}` : `gblur=sigma=${strength}`

    await onProgress?.('Applying blur')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(filter)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'blur',
    )

    return { outputPath, outputFormat }
  }

  async opVignette(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const angle = Number(input.angle ?? 0.785)
    if (!Number.isFinite(angle)) {
      throw new Error('angle must be a number in radians (default PI/4 = 0.785)')
    }

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Applying vignette')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(`vignette=angle=${angle}`)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'vignette',
    )

    return { outputPath, outputFormat }
  }

  async opSharpen(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const amount = Number(input.amount ?? 1.0)
    if (!Number.isFinite(amount)) {
      throw new Error('amount must be a number (default 1.0, higher = sharper)')
    }

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Sharpening video')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(`unsharp=5:5:${amount.toFixed(1)}:5:5:0.0`)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'sharpen',
    )

    return { outputPath, outputFormat }
  }

  async opDenoise(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const strength = Number(input.strength ?? 3)
    if (!Number.isFinite(strength) || strength <= 0) {
      throw new Error('strength must be a positive number (default 3, range ~1-10)')
    }
    const mode = typeof input.mode === 'string' ? input.mode.trim() : 'nlmeans'

    await onProgress?.('Downloading source video')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    const filter = mode === 'hqdn3d' ? `hqdn3d=${strength}` : `nlmeans=s=${strength}:p=7:r=15`

    await onProgress?.('Denoising video')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        getFfmpeg()(sourcePath)
          .videoFilter(filter)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'denoise',
    )

    return { outputPath, outputFormat }
  }

  async opReverse(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const includeAudio = input.include_audio !== false

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)

    await onProgress?.('Reversing media')
    await runtime.runWithTimeout(
      new Promise<void>((resolve, reject) => {
        const cmd = getFfmpeg()(sourcePath)
        if (includeAudio) {
          cmd.videoFilter('reverse').audioFilters('areverse')
        } else {
          cmd.videoFilter('reverse').noAudio()
        }
        cmd
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      }),
      'reverse',
    )

    return { outputPath, outputFormat }
  }

  async opLoop(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress: ProgressFn | undefined,
    runtime: ArtifactMediaProcessingOperationRuntime,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    const url = runtime.requireString(input, 'url')
    const count = Number(input.count ?? 2)
    if (!Number.isFinite(count) || count < 2 || count > 20) {
      throw new Error('count must be between 2 and 20')
    }

    await onProgress?.('Downloading source media')
    const sourcePath = await runtime.downloadFile(url, tempRoot, 'source')
    const outputFormat = runtime.resolveOutputFormat(input, 'mp4')
    const outputPath = join(tempRoot, `output.${outputFormat}`)
    const listPath = join(tempRoot, 'loop-list.txt')

    const listContent = Array(count).fill(`file '${sourcePath}'`).join('\n')
    await writeFile(listPath, listContent, 'utf-8')

    await onProgress?.(`Looping ${count}x`)
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
      'loop',
    )

    return { outputPath, outputFormat }
  }
}
