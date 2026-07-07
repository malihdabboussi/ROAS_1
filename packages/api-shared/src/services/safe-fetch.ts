import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export interface SafeFetchOptions {
  timeoutMs?: number
  maxBytes?: number
  headers?: Record<string, string>
}

const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_BYTES = 512 * 1024
const METADATA_HOSTS = new Set(['metadata.google.internal'])

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1') return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true
  if (ip.startsWith('169.254.')) return true
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true
  if (ip.startsWith('fe80:')) return true
  return false
}

async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || METADATA_HOSTS.has(hostname)) {
    throw new Error('Blocked private host')
  }
  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Blocked private IP')
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error('Host did not resolve')
  if (addresses.some((addr) => isPrivateIp(addr.address))) {
    throw new Error('Blocked private resolved IP')
  }
}

export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions = {}): Promise<string> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol')
  }
  await assertPublicHost(url)

  const ctl = new AbortController()
  const timeout = setTimeout(() => ctl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'VibeyLinkPreview/1.0',
        ...(opts.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('Unsupported content type')
    }
    const reader = res.body?.getReader()
    if (!reader) return ''
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) throw new Error('Response too large')
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } finally {
    clearTimeout(timeout)
  }
}
