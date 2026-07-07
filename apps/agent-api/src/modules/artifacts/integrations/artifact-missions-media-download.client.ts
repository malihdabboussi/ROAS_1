import { Injectable } from '@nestjs/common'

export type ImageDownloadResult =
  | { success: true; buffer: Buffer; mimeType: string }
  | { success: false; error: string }

export type MediaDownloadResult =
  | { success: true; buffer: Buffer }
  | { success: false; status: number }

@Injectable()
export class ArtifactMissionsMediaDownloadClient {
  async downloadImage(input: {
    url: string
    maxBytes: number
    timeoutMs: number
    acceptHeader: string
  }): Promise<ImageDownloadResult> {
    let response: Response
    try {
      response = await fetch(input.url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(input.timeoutMs),
        headers: { accept: input.acceptHeader },
      })
    } catch {
      return { success: false, error: 'Failed to download image' }
    }

    if (response.status >= 300 && response.status < 400) {
      return { success: false, error: 'Image URL redirects are not supported' }
    }
    if (!response.ok)
      return { success: false, error: `Failed to download image (${response.status})` }

    const mimeType = (response.headers.get('content-type') ?? '').split(';')[0]!.toLowerCase()
    if (!mimeType.startsWith('image/'))
      return { success: false, error: 'URL did not return an image' }

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (Number.isFinite(contentLength) && contentLength > input.maxBytes) {
      return { success: false, error: 'Image is too large' }
    }

    let buffer: Buffer
    try {
      buffer = await this.readBoundedResponseBuffer(response, input.maxBytes)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download image',
      }
    }
    if (buffer.length === 0) return { success: false, error: 'Image is empty' }
    if (buffer.length > input.maxBytes) return { success: false, error: 'Image is too large' }
    return { success: true, buffer, mimeType }
  }

  async downloadMedia(url: string): Promise<MediaDownloadResult> {
    const response = await fetch(url)
    if (!response.ok) return { success: false, status: response.status }
    return { success: true, buffer: Buffer.from(await response.arrayBuffer()) }
  }

  private async readBoundedResponseBuffer(response: Response, maxBytes: number): Promise<Buffer> {
    const reader = response.body?.getReader()
    if (!reader) return Buffer.from(await response.arrayBuffer())

    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) throw new Error('Image is too large')
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  }
}
