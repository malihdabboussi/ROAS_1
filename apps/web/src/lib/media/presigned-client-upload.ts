import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { DocumentIntelligenceMetadata } from '@/lib/chat/document-attachments'

interface PresignResponse {
  success: boolean
  assetId: string
  uploadUrl: string
  path?: string
  token?: string
}

export type AssetRef = {
  kind: 'vibey_asset'
  asset_id: string
  bucket_name: string
  file_path: string
  url: string | null
  mime_type: string
  asset_type: 'image' | 'document' | 'video' | 'audio' | 'other'
  name: string
  original_filename: string
  file_size: number
  campaign_id: string | null
  space_id: string | null
  org_id: string | null
  source: string | null
  source_surface: string | null
}

export interface ConfirmResponse {
  success: boolean
  asset: {
    id: string
    file_path: string
    file_size: number
    mime_type: string
    public_url: string | null
    document_intelligence?: DocumentIntelligenceMetadata | null
  }
  asset_ref?: AssetRef
  url: string
}

export interface PresignPutUploadOptions {
  file: File
  category?: string
  name?: string
  campaign_id?: string
  space_id?: string
  aiAnalysis?: boolean
  onUploadProgress?: (percent: number) => void
}

const MAX_UPLOAD_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1500

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599)
}

interface XhrResult {
  status: number
  responseText: string
}

function xhrPut(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<XhrResult> {
  return new Promise<XhrResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abortHandler = () => {
      xhr.abort()
      reject(new DOMException('Upload aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', abortHandler, { once: true })
    xhr.open('PUT', url)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onerror = () => {
      signal?.removeEventListener('abort', abortHandler)
      reject(new Error('Network error during upload'))
    }
    xhr.onload = () => {
      signal?.removeEventListener('abort', abortHandler)
      resolve({ status: xhr.status, responseText: xhr.responseText })
    }
    xhr.send(file)
  })
}

function parseStorageError(body: string): string | null {
  if (!body) return null
  try {
    const json = JSON.parse(body) as { error?: string; message?: string; statusCode?: string }
    return json.error || json.message || null
  } catch {
    return body.length > 200 ? body.slice(0, 200) : body
  }
}

async function getPresignedUrl(options: PresignPutUploadOptions): Promise<PresignResponse> {
  return backendPost<PresignResponse>('/api/media/presign', {
    filename: options.file.name,
    mimeType: options.file.type || 'application/octet-stream',
    fileSize: options.file.size,
    category: options.category,
    name: options.name,
    campaign_id: options.campaign_id,
    space_id: options.space_id,
  })
}

export async function presignPutUploadFile(
  options: PresignPutUploadOptions,
): Promise<ConfirmResponse> {
  let presign = await getPresignedUrl(options)

  let lastError: Error | null = null
  for (let attempt = 0; attempt < MAX_UPLOAD_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }

    try {
      const { status, responseText } = await xhrPut(
        presign.uploadUrl,
        options.file,
        options.onUploadProgress,
      )

      if (status >= 200 && status < 300) {
        return backendPost<ConfirmResponse>('/api/media/confirm', {
          assetId: presign.assetId,
          aiAnalysis: options.aiAnalysis === true,
        })
      }

      const detail = parseStorageError(responseText)
      console.warn(`[upload] PUT returned ${status}${detail ? `: ${detail}` : ''}`)

      if (status === 400 || status === 403) {
        presign = await getPresignedUrl(options)
        lastError = new Error(`Upload rejected (${status})`)
        continue
      }

      if (isRetryableStatus(status) && attempt < MAX_UPLOAD_ATTEMPTS - 1) {
        lastError = new Error(`Upload failed (${status})`)
        continue
      }

      throw new Error(`Upload failed (${status})`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_UPLOAD_ATTEMPTS - 1) {
        console.warn(`[upload] attempt ${attempt + 1} failed: ${lastError.message}`)
        continue
      }
    }
  }

  throw lastError ?? new Error('Upload failed after retries')
}

export async function getUploadedMediaAsset(
  assetId: string,
): Promise<ConfirmResponse['asset'] | null> {
  if (!assetId) return null
  try {
    return await backendGet<ConfirmResponse['asset']>(`/api/media/assets/${assetId}`)
  } catch {
    return null
  }
}

export async function pollUploadedDocumentIntelligence(
  assetId: string,
  attempts = 10,
  intervalMs = 1200,
): Promise<ConfirmResponse['asset'] | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const asset = await getUploadedMediaAsset(assetId)
    const status = asset?.document_intelligence?.status
    if (status === 'ready' || status === 'failed') return asset
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return getUploadedMediaAsset(assetId)
}

/**
 * Run async tasks with a concurrency limit.
 * Each task is a function returning a promise. At most `limit` run simultaneously.
 */
export async function concurrentMap<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++
      try {
        const value = await fn(items[idx]!)
        results[idx] = { status: 'fulfilled', value }
      } catch (reason) {
        results[idx] = { status: 'rejected', reason }
      }
    }
  }

  const workers = [...Array(Math.min(limit, items.length))].map(() => worker())
  await Promise.all(workers)
  return results
}
