import { describe, expect, it, vi } from 'vitest'
import { VibeyMcpPromptCatalogService } from './vibey-mcp-prompt-catalog.service'
import { VibeyMcpResourceCatalogService } from './vibey-mcp-resource-catalog.service'
import { VibeyMcpServerService } from './vibey-mcp-server.service'

describe('VibeyMcpServerService', () => {
  function createService(overrides?: {
    artifacts?: any
    catalog?: any
    instructions?: any
    policy?: any
    prompts?: any
    resources?: any
    sessions?: any
  }) {
    return new VibeyMcpServerService(
      overrides?.artifacts ?? ({} as any),
      overrides?.catalog ?? ({ listTools: vi.fn(() => []) } as any),
      overrides?.instructions ?? ({ buildInstructions: vi.fn(() => '') } as any),
      overrides?.policy ?? ({} as any),
      overrides?.prompts ?? new VibeyMcpPromptCatalogService(),
      overrides?.resources ?? new VibeyMcpResourceCatalogService(),
      overrides?.sessions ?? ({} as any),
    )
  }

  it('returns hosted MCP instructions on initialize', async () => {
    const service = createService({
      instructions: { buildInstructions: vi.fn(() => 'Use describe_vibey_action first.') } as any,
    })

    await expect(
      service.handleRpc({ id: 1, method: 'initialize' }, {} as any),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {}, prompts: {}, resources: {} },
        instructions: 'Use describe_vibey_action first.',
      },
    })
  })

  it('lists and returns workflow prompts', async () => {
    const service = createService()

    await expect(
      service.handleRpc({ id: 2, method: 'prompts/list' }, {} as any),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        prompts: expect.arrayContaining([
          expect.objectContaining({ name: 'vibey_mcp_start_here' }),
          expect.objectContaining({ name: 'vibey_spaces_navigation' }),
          expect.objectContaining({ name: 'vibey_brain_search_and_save' }),
          expect.objectContaining({ name: 'vibey_create_agent_skill' }),
          expect.objectContaining({ name: 'vibey_campaign_work' }),
        ]),
      },
    })

    await expect(
      service.handleRpc(
        { id: 3, method: 'prompts/get', params: { name: 'vibey_create_agent_skill' } },
        {} as any,
      ),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 3,
      result: {
        description: expect.stringContaining('skill'),
        messages: [
          expect.objectContaining({
            role: 'user',
            content: expect.objectContaining({
              type: 'text',
              text: expect.stringContaining('list_agents'),
            }),
          }),
        ],
      },
    })
  })

  it('lists and reads workflow resources', async () => {
    const service = createService()

    await expect(
      service.handleRpc({ id: 4, method: 'resources/list' }, {} as any),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 4,
      result: {
        resources: expect.arrayContaining([
          expect.objectContaining({ uri: 'vibey://mcp/workflows/overview' }),
          expect.objectContaining({ uri: 'vibey://mcp/workflows/spaces' }),
          expect.objectContaining({ uri: 'vibey://mcp/workflows/brains' }),
          expect.objectContaining({ uri: 'vibey://mcp/workflows/agent-skills' }),
          expect.objectContaining({ uri: 'vibey://mcp/workflows/campaigns' }),
        ]),
      },
    })

    await expect(
      service.handleRpc(
        {
          id: 5,
          method: 'resources/read',
          params: { uri: 'vibey://mcp/workflows/agent-skills' },
        },
        {} as any,
      ),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 5,
      result: {
        contents: [
          expect.objectContaining({
            uri: 'vibey://mcp/workflows/agent-skills',
            mimeType: 'text/markdown',
            text: expect.stringContaining('database-first'),
          }),
        ],
      },
    })
  })

  it('returns invalid params for unknown prompts and resources', async () => {
    const service = createService()

    await expect(
      service.handleRpc({ id: 6, method: 'prompts/get', params: { name: 'missing' } }, {} as any),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 6,
      error: { code: -32602 },
    })

    await expect(
      service.handleRpc({ id: 7, method: 'resources/read', params: { uri: 'missing' } }, {} as any),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 7,
      error: { code: -32602 },
    })
  })

  it('wraps array tool results in structuredContent.items', async () => {
    const artifacts = {
      executeAction: vi.fn(async () => [{ id: 'campaign-1' }]),
    } as any
    const policy = {
      assertAllowed: vi.fn(() => ({ action: 'list_campaigns' })),
    } as any
    const sessions = {
      buildSessionKey: vi.fn(async () => 'session-key'),
    } as any
    const service = createService({ artifacts, policy, sessions })

    await expect(
      service.handleRpc(
        {
          id: 2,
          method: 'tools/call',
          params: { name: 'list_campaigns', arguments: {} },
        },
        { user_id: 'user-1', client_id: 'client-1' } as any,
      ),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        structuredContent: { items: [{ id: 'campaign-1' }] },
      },
    })
  })

  it('preserves classified tool failures as MCP tool results', async () => {
    const classifiedFailure = {
      success: false,
      error: 'mission_id is required',
      error_code: 'ARTIFACT_VALIDATION',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
        stop_after_same_error: true,
        reason: 'Correct the payload.',
      },
      correction: { summary: 'Add mission_id.' },
      agent_instruction: 'Correct mission_id before retrying.',
      user_explanation: { intent: 'correct_and_retry', sentence: 'I need the mission ID.' },
      forbidden_user_framing: ['platform error'],
      observability: { fingerprint: 'artifact.artifact_validation' },
    }
    const service = createService({
      artifacts: { executeAction: vi.fn(async () => classifiedFailure) } as any,
      policy: { assertAllowed: vi.fn(() => ({ action: 'get_mission' })) } as any,
      sessions: { buildSessionKey: vi.fn(async () => 'session-key') } as any,
    })

    await expect(
      service.handleRpc(
        {
          id: 8,
          method: 'tools/call',
          params: { name: 'get_mission', arguments: {} },
        },
        { user_id: 'user-1', client_id: 'client-1' } as any,
      ),
    ).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 8,
      result: {
        isError: true,
        structuredContent: classifiedFailure,
        content: [
          {
            type: 'text',
            text: expect.stringMatching(
              /I need the mission ID\.[\s\S]*"error_code": "ARTIFACT_VALIDATION"[\s\S]*"agent_instruction": "Correct mission_id before retrying\."/,
            ),
          },
        ],
      },
    })
  })

  it('classifies thrown tool failures before returning them to an MCP client', async () => {
    const service = createService({
      artifacts: {
        executeAction: vi.fn(async () => Promise.reject(new Error('unexpected'))),
      } as any,
      policy: { assertAllowed: vi.fn(() => ({ action: 'get_mission' })) } as any,
      sessions: { buildSessionKey: vi.fn(async () => 'session-key') } as any,
    })

    const response = await service.handleRpc(
      {
        id: 9,
        method: 'tools/call',
        params: { name: 'get_mission', arguments: { mission_id: 'mission-1' } },
      },
      { user_id: 'user-1', client_id: 'client-1' } as any,
    )

    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 9,
      result: {
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringMatching(/"error_code"[\s\S]*"agent_instruction"/),
          },
        ],
        structuredContent: expect.objectContaining({
          success: false,
          error_class: 'system_fault',
          workflow_class: 'get_mission',
          effect_state: 'unknown_effect',
          retry_policy: expect.any(Object),
          correction: expect.any(Object),
          agent_instruction: expect.any(String),
          user_explanation: expect.any(Object),
          forbidden_user_framing: expect.any(Array),
          observability: expect.any(Object),
        }),
      },
    })
    expect((response as any).result.content[0].text).not.toContain('"error": "unexpected"')
  })

  it('completes incomplete returned failures with the full tool error contract', async () => {
    const service = createService({
      artifacts: {
        executeAction: vi.fn(async () => ({
          success: false,
          error: 'mission_id is required',
          error_code: 'LEGACY_VALIDATION',
        })),
      } as any,
      policy: { assertAllowed: vi.fn(() => ({ action: 'get_mission' })) } as any,
      sessions: { buildSessionKey: vi.fn(async () => 'session-key') } as any,
    })

    await expect(
      service.handleRpc(
        {
          id: 10,
          method: 'tools/call',
          params: { name: 'get_mission', arguments: {} },
        },
        { user_id: 'user-1', client_id: 'client-1' } as any,
      ),
    ).resolves.toMatchObject({
      result: {
        isError: true,
        structuredContent: {
          success: false,
          error_code: expect.stringMatching(/^ARTIFACT_/),
          error_class: expect.any(String),
          workflow_class: 'get_mission',
          effect_state: expect.any(String),
          retry_policy: expect.any(Object),
          correction: expect.any(Object),
          agent_instruction: expect.any(String),
          user_explanation: expect.any(Object),
          forbidden_user_framing: expect.any(Array),
          observability: expect.objectContaining({ fingerprint: expect.any(String) }),
        },
      },
    })
  })
})
