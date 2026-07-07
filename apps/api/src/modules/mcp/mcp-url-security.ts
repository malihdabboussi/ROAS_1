import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export type McpDnsLookup = (
  hostname: string,
  options: { all: true },
) => Promise<Array<{ address: string; family: number }>>

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type McpReachabilityResult = {
  reachable: boolean
  blocked?: boolean
  error?: string
}

const DEFAULT_REACHABILITY_MS = 5000
const MAX_REDIRECTS = 3
const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

function parseIpv4(address: string): number[] | null {
  const parts = address.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((part) => Number.parseInt(part, 10))
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return null
  return octets
}

function isPrivateIpv4(address: string): boolean {
  const parts = parseIpv4(address)
  if (!parts) return false
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  return false
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
  if (normalized === '::' || normalized === '::1') return true
  if (normalized.startsWith('fe80:')) return true
  const first = Number.parseInt(normalized.split(':')[0] || '', 16)
  if (Number.isNaN(first)) return false
  if ((first & 0xfe00) === 0xfc00) return true
  if ((first & 0xffc0) === 0xfe80) return true
  if ((first & 0xffc0) === 0xfec0) return true
  return false
}

function isPrivateIpAddress(address: string): boolean {
  const family = isIP(address.replace(/^\[/, '').replace(/\]$/, ''))
  if (family === 4) return isPrivateIpv4(address)
  if (family === 6) return isPrivateIpv6(address)
  return false
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/\.$/, '').toLowerCase()
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal')
  )
}

export async function assertMcpServerUrlAllowed(
  rawUrl: string,
  options: { lookup?: McpDnsLookup } = {},
): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(String(rawUrl ?? '').trim())
  } catch {
    throw new Error('Invalid MCP server URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Blocked MCP server URL scheme')
  }

  const hostname = normalizeHostname(parsed.hostname)
  if (!hostname) throw new Error('Invalid MCP server URL hostname')
  if (isBlockedHostname(hostname)) throw new Error('Blocked MCP server hostname')
  if (isPrivateIpAddress(hostname))
    throw new Error('Blocked MCP server private/internal IP address')

  const lookup = options.lookup ?? (dnsLookup as McpDnsLookup)
  const addresses = await lookup(hostname, { all: true })
  if (addresses.length === 0) throw new Error('Unable to resolve MCP server hostname')

  for (const entry of addresses) {
    if (isPrivateIpAddress(entry.address)) {
      throw new Error('Blocked MCP server hostname: resolves to private/internal IP address')
    }
  }

  return parsed
}

async function guardedFetch(
  rawUrl: string,
  method: 'HEAD' | 'GET',
  options: {
    fetchImpl: FetchLike
    lookup?: McpDnsLookup
    timeoutMs: number
  },
): Promise<Response> {
  let current = await assertMcpServerUrlAllowed(rawUrl, { lookup: options.lookup })

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), options.timeoutMs)
    try {
      const response = await options.fetchImpl(current.toString(), {
        method,
        signal: ac.signal,
        redirect: 'manual',
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return response
        current = await assertMcpServerUrlAllowed(new URL(location, current).toString(), {
          lookup: options.lookup,
        })
        continue
      }
      return response
    } finally {
      clearTimeout(timer)
    }
  }

  throw new Error('Too many MCP reachability redirects')
}

export async function checkMcpReachability(
  rawUrl: string,
  options: {
    fetchImpl?: FetchLike
    lookup?: McpDnsLookup
    timeoutMs?: number
  } = {},
): Promise<McpReachabilityResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_REACHABILITY_MS

  const run = async (method: 'HEAD' | 'GET') => {
    const url = new URL(rawUrl)
    const target = `${url.origin}/`
    return guardedFetch(target, method, { fetchImpl, lookup: options.lookup, timeoutMs })
  }

  try {
    const head = await run('HEAD')
    if (head.ok || (head.status >= 200 && head.status < 500)) return { reachable: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    if (/blocked|private|internal/i.test(error)) {
      return { reachable: false, blocked: true, error }
    }
  }

  try {
    const get = await run('GET')
    if (get.ok || (get.status >= 200 && get.status < 500)) return { reachable: true }
    return { reachable: false, error: `HTTP ${get.status}` }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return {
      reachable: false,
      blocked: /blocked|private|internal/i.test(error) || undefined,
      error,
    }
  }
}
