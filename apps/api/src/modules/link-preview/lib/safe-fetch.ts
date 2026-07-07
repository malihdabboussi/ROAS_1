import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

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
  if (hostname === 'localhost' || METADATA_HOSTS.has(hostname)) throw new Error('Blocked host')
  if (isIP(hostname) && isPrivateIp(hostname)) throw new Error('Blocked private IP')
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.some((addr) => isPrivateIp(addr.address))) {
    throw new Error('Blocked private resolved IP')
  }
}

export async function safeFetchText(rawUrl: string): Promise<string> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported protocol')
  await assertPublicHost(url)
  const ctl = new AbortController()
  const timeout = setTimeout(() => ctl.abort(), 5_000)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'VibeyLinkPreview/1.0',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('Unsupported content type')
    }
    const text = await res.text()
    return text.slice(0, 512 * 1024)
  } finally {
    clearTimeout(timeout)
  }
}
