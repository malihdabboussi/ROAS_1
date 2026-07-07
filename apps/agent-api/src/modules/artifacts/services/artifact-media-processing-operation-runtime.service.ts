import { randomUUID } from 'node:crypto'
import { stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ArtifactMediaProcessingOperationRuntime,
} from './artifact-media-processing-advanced-operations.service'

interface MediaInput {
  url: string
  trim_start?: number
  trim_duration?: number
}

const VALID_OUTPUT_FORMATS = new Set([
  'mp4',
  'webm',
  'mp3',
  'wav',
  'gif',
  'mov',
  'mkv',
  'aac',
  'ogg',
  'jpg',
  'png',
  'webp',
])

const MAX_FILE_SIZE = 500 * 1024 * 1024
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024
const MAX_INPUT_COUNT = 20
const PROCESS_TIMEOUT_MS = 120_000

export class ArtifactMediaProcessingOperationRuntimeService
  implements ArtifactMediaProcessingOperationRuntime
{
  requireString(input: Record<string, unknown>, field: string): string {
    const val = typeof input[field] === 'string' ? input[field].trim() : ''
    if (!val) throw new Error(`${field} is required`)
    return val
  }

  requireInputsArray(input: Record<string, unknown>): MediaInput[] {
    const raw = input.inputs
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error('inputs array is required and must not be empty')
    }
    if (raw.length > MAX_INPUT_COUNT) {
      throw new Error(`Maximum ${MAX_INPUT_COUNT} inputs allowed`)
    }
    return raw.map((item: unknown, idx: number) => {
      if (!item || typeof item !== 'object') throw new Error(`inputs[${idx}] must be an object`)
      const obj = item as Record<string, unknown>
      const url = typeof obj.url === 'string' ? obj.url.trim() : ''
      if (!url) throw new Error(`inputs[${idx}].url is required`)
      return {
        url,
        trim_start: typeof obj.trim_start === 'number' ? obj.trim_start : undefined,
        trim_duration: typeof obj.trim_duration === 'number' ? obj.trim_duration : undefined,
      }
    })
  }

  resolveOutputFormat(input: Record<string, unknown>, fallback: string): string {
    const requested =
      typeof input.output_format === 'string' ? input.output_format.trim().toLowerCase() : ''
    if (requested && VALID_OUTPUT_FORMATS.has(requested)) return requested
    return fallback
  }

  async downloadFile(url: string, tempRoot: string, prefix: string): Promise<string> {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Only HTTP/HTTPS URLs are accepted')
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download ${prefix} (${response.status})`)
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    const ext = this.guessExtension(url, response.headers.get('content-type') ?? '')
    const filePath = join(tempRoot, `${prefix}-${randomUUID().slice(0, 8)}.${ext}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    await writeFile(filePath, buffer)
    return filePath
  }

  async downloadInputs(inputs: MediaInput[], tempRoot: string): Promise<string[]> {
    const paths: string[] = []
    let totalSize = 0
    for (let i = 0; i < inputs.length; i++) {
      const p = await this.downloadFile(inputs[i]!.url, tempRoot, `input-${i}`)
      const s = await stat(p)
      totalSize += s.size
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error(`Total input size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`)
      }
      paths.push(p)
    }
    return paths
  }

  async runWithTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Media ${operation} timed out (${PROCESS_TIMEOUT_MS / 1000}s)`)),
        PROCESS_TIMEOUT_MS,
      )
    })
    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  private guessExtension(url: string, contentType: string): string {
    const urlExt = url.split('?')[0]?.split('.').pop()?.toLowerCase() ?? ''
    if (['mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'aac', 'm4a', 'gif'].includes(urlExt)) {
      return urlExt
    }
    const mimeMap: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'image/gif': 'gif',
    }
    return mimeMap[contentType] ?? 'mp4'
  }
}
