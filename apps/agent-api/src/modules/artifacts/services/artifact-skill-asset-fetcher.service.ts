import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Injectable } from '@nestjs/common'

const SKILL_ASSET_FETCH_TIMEOUT_MS = 5_000
const SKILL_ASSET_MAX_BYTES = 10 * 1024 * 1024
const SKILL_ASSET_MAX_REDIRECTS = 3
const METADATA_HOSTS = new Set(['metadata.google.internal'])
const ALLOWED_SKILL_ASSET_CONTENT_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

@Injectable()
export class ArtifactSkillAssetFetcherService {
  async fetchImage(
    rawUrl: string,
  ): Promise<{ ok: true; buffer: Buffer; contentType: string } | { ok: false; error: string }> {
    try {
      let url = this.parseUrl(rawUrl)
      for (let redirects = 0; redirects <= SKILL_ASSET_MAX_REDIRECTS; redirects++) {
        await this.assertPublicUrl(url)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), SKILL_ASSET_FETCH_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch(url, {
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              accept: 'image/png,image/jpeg,image/webp,image/gif',
              'user-agent': 'VibeySkillAssetFetcher/1.0',
            },
          })
        } finally {
          clearTimeout(timeout)
        }

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (!location) return { ok: false, error: 'Image URL redirect missing location' }
          url = this.parseUrl(location, url)
          continue
        }

        if (!response.ok) return { ok: false, error: 'Failed to download image from URL' }

        const contentType = this.normalizeContentType(response.headers.get('content-type'))
        if (!ALLOWED_SKILL_ASSET_CONTENT_TYPES.has(contentType)) {
          return { ok: false, error: 'Skill asset response is not an image' }
        }

        const contentLength = Number(response.headers.get('content-length') ?? 0)
        if (contentLength > SKILL_ASSET_MAX_BYTES) {
          return { ok: false, error: 'Skill asset image is too large' }
        }

        const buffer = await this.readBuffer(response)
        return { ok: true, buffer, contentType }
      }
      return { ok: false, error: 'Image URL redirected too many times' }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to download image from URL',
      }
    }
  }

  private parseUrl(rawUrl: string, base?: URL): URL {
    const url = new URL(rawUrl, base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported image URL protocol')
    }
    return url
  }

  private async assertPublicUrl(url: URL): Promise<void> {
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!hostname || hostname === 'localhost' || METADATA_HOSTS.has(hostname)) {
      throw new Error('Blocked private image URL host')
    }
    if (isIP(hostname)) {
      if (this.isPrivateOrSpecialIp(hostname)) throw new Error('Blocked private image URL IP')
      return
    }
    const addresses = await lookup(hostname, { all: true, verbatim: true })
    if (addresses.length === 0) throw new Error('Image URL host did not resolve')
    if (addresses.some((addr) => this.isPrivateOrSpecialIp(addr.address))) {
      throw new Error('Blocked private image URL resolved IP')
    }
  }

  private isPrivateOrSpecialIp(address: string): boolean {
    const normalized =
      address
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .split('%')[0] ?? ''
    if (!normalized) return true
    if (normalized.includes(':')) {
      if (
        normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:') ||
        normalized.startsWith('ff') ||
        normalized.startsWith('2001:db8:')
      ) {
        return true
      }
      const ipv4Tail = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1]
      return ipv4Tail ? this.isPrivateOrSpecialIp(ipv4Tail) : false
    }
    const parts = normalized.split('.').map((part) => Number(part))
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return true
    }
    const a = parts[0] ?? -1
    const b = parts[1] ?? -1
    const c = parts[2] ?? -1
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 192 && b === 0) return true
    if (a === 192 && b === 0 && c === 2) return true
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true
    if (a === 203 && b === 0 && c === 113) return true
    return false
  }

  private normalizeContentType(value: string | null): string {
    return (value ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  }

  private async readBuffer(response: Response): Promise<Buffer> {
    const reader = response.body?.getReader()
    if (!reader) return Buffer.from(await response.arrayBuffer())
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > SKILL_ASSET_MAX_BYTES) {
        throw new Error('Skill asset image is too large')
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  }
}
