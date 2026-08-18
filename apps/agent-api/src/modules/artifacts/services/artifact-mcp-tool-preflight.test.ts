import { describe, expect, it, vi } from 'vitest'
import { validateUseMcpToolPreflight } from './artifact-mcp-tool-preflight'

const SESSION = 'agent:vibey:user-1'

function makeHost(input: {
  cachedTools?: Array<Record<string, unknown>>
  liveTools?: Array<Record<string, unknown>>
}) {
  const listTools = vi.fn(async () => input.liveTools ?? [])
  return {
    host: {
      resolveUserId: () => 'user-1',
      getUserClient: vi.fn(async () => ({})),
      artifactMcpService: {
        mcpConfig: {
          getServerByName: vi.fn(async () => ({
            name: 'Page Grader',
            enabled: true,
            agent_enabled: true,
            cached_tools: input.cachedTools ?? [],
          })),
          getServer: vi.fn(),
          getAuthToken: vi.fn(async () => 'token'),
        },
        mcpTool: { listTools },
        artifactMcpRepository: {
          findFirstProjectId: vi.fn(async () => 'project-1'),
        },
      },
    },
    listTools,
  }
}

describe('validateUseMcpToolPreflight campaign draft catalog', () => {
  it('refreshes live tools when a guessed campaign-draft name is missing from cache', async () => {
    const { host, listTools } = makeHost({
      cachedTools: [{ name: 'page_grader_list_clients', inputSchema: { type: 'object' } }],
      liveTools: [
        {
          name: 'page_grader_create_campaign_draft',
          inputSchema: { type: 'object', properties: {}, additionalProperties: true },
        },
      ],
    })

    await expect(
      validateUseMcpToolPreflight(
        {
          server_name: 'Page Grader',
          tool_name: 'page_grader_create_campaign_draft',
          arguments: { name: 'Master Your Kraft | VSL Retargeting' },
        },
        { host, sessionKey: SESSION },
      ),
    ).resolves.toBeNull()
    expect(listTools).toHaveBeenCalledTimes(1)
  })

  it('tells Pixel to native-create when no live campaign-draft write exists', async () => {
    const { host, listTools } = makeHost({
      cachedTools: [{ name: 'page_grader_list_clients' }],
      liveTools: [{ name: 'page_grader_list_clients' }],
    })

    const result = await validateUseMcpToolPreflight(
      {
        server_name: 'Page Grader',
        tool_name: 'page_grader_create_campaign_draft',
        arguments: { name: 'Master Your Kraft | VSL Retargeting' },
      },
      { host, sessionKey: SESSION },
    )

    expect(listTools).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      errorCode: 'ARTIFACT_ACTION_PREFLIGHT',
    })
    expect(result?.error).toMatch(/is not available on MCP server Page Grader/i)
    expect(result?.agentInstruction).toMatch(/native create_campaign/)
    expect(result?.agentInstruction).toMatch(/create_task/)
    expect(result?.correction).toMatchObject({
      next_tool_preference: ['list_mcp_tools', 'create_campaign', 'create_task'],
    })
  })

  it('does not hit live list when the cached catalog already has the tool', async () => {
    const { host, listTools } = makeHost({
      cachedTools: [
        {
          name: 'page_grader_create_campaign_draft',
          inputSchema: { type: 'object', required: ['client_ref'] },
        },
      ],
    })

    const result = await validateUseMcpToolPreflight(
      {
        server_name: 'Page Grader',
        tool_name: 'page_grader_create_campaign_draft',
        arguments: {},
      },
      { host, sessionKey: SESSION },
    )

    expect(listTools).not.toHaveBeenCalled()
    expect(result?.error).toMatch(/client_ref is required/i)
  })
})
