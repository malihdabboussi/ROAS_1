import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertMcpServerUrlAllowed,
  checkMcpReachability,
  type McpDnsLookup,
} from './mcp-url-security'
import { McpProbeService } from './services/mcp-probe.service'

const publicLookup: McpDnsLookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }])

describe('MCP server URL SSRF guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks private IP literal URLs before DNS or fetch', async () => {
    const lookup = vi.fn()

    await expect(
      assertMcpServerUrlAllowed('http://127.0.0.1:8080/mcp', { lookup }),
    ).rejects.toThrow(/private|internal|blocked/i)

    expect(lookup).not.toHaveBeenCalled()
  })

  it('blocks hostnames that resolve to private network addresses', async () => {
    const lookup: McpDnsLookup = vi.fn(async () => [{ address: '10.0.0.8', family: 4 }])

    await expect(
      assertMcpServerUrlAllowed('https://mcp.example.com/sse', { lookup }),
    ).rejects.toThrow(/private|internal|blocked/i)
  })

  it('allows public http and https MCP endpoints after DNS validation', async () => {
    await expect(
      assertMcpServerUrlAllowed('https://mcp.example.com/sse', { lookup: publicLookup }),
    ).resolves.toMatchObject({ href: 'https://mcp.example.com/sse' })

    await expect(
      assertMcpServerUrlAllowed('http://mcp.example.com/sse', { lookup: publicLookup }),
    ).resolves.toMatchObject({ href: 'http://mcp.example.com/sse' })
  })

  it('does not follow reachability redirects to private hosts', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
      })
    })

    const result = await checkMcpReachability('https://mcp.example.com/sse', {
      lookup: publicLookup,
      fetchImpl,
    })

    expect(result).toMatchObject({ reachable: false, blocked: true })
    expect(result.error).toMatch(/private|internal|blocked/i)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects private MCP probe transports with a security error before connecting', async () => {
    const service = new McpProbeService()

    const result = await service.testListTools('http://127.0.0.1:8787/mcp')

    expect(result.ok).toBe(false)
    expect(result.tool_count).toBe(0)
    expect(result.error).toMatch(/private|internal|blocked/i)
  })
})
