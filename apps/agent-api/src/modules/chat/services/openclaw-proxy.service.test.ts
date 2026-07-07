import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenClawProxyService, resolveGatewayModel } from './openclaw-proxy.service'

function makeSseResponse(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, statusText: 'OK' })
}

function makeProxyService(input?: {
  reports?: Array<Record<string, unknown>>
}): OpenClawProxyService {
  return new OpenClawProxyService(
    {
      enforceChunkPolicy: vi.fn((content: string) => ({ blocked: false, content })),
      filterChunk: vi.fn((content: string) => content),
    } as any,
    {
      report: vi.fn((report: Record<string, unknown>) => input?.reports?.push(report)),
    } as any,
    { resolveRuntimeCredential: vi.fn(async () => null) } as any,
    { resolveRuntimeCredential: vi.fn(async () => null) } as any,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveGatewayModel', () => {
  it('maps Claude subscription picker IDs to OpenClaw Anthropic model IDs', () => {
    expect(resolveGatewayModel('anthropic-subscription/claude-opus-4-6', 'vibey')).toBe(
      'anthropic/claude-opus-4.6',
    )
    expect(resolveGatewayModel('anthropic-subscription/claude-opus-4-7', 'vibey')).toBe(
      'anthropic/claude-opus-4.7',
    )
    expect(resolveGatewayModel('anthropic-subscription/claude-opus-4-8', 'vibey')).toBe(
      'anthropic/claude-opus-4.8',
    )
    expect(resolveGatewayModel('anthropic-subscription/claude-sonnet-4-6', 'vibey')).toBe(
      'anthropic/claude-sonnet-4.6',
    )
    expect(resolveGatewayModel('anthropic-subscription/claude-haiku-4-5', 'vibey')).toBe(
      'anthropic/claude-haiku-4.5',
    )
  })

  it('keeps Codex subscription IDs on the Codex gateway provider', () => {
    expect(resolveGatewayModel('openai-codex/gpt-5.5', 'vibey')).toBe('openai-codex/gpt-5.5')
  })

  it('uses the OpenClaw agent default when no model override is selected', () => {
    expect(resolveGatewayModel(undefined, 'vibey')).toBe('openclaw:vibey')
  })
})

describe('OpenClawProxyService stream tool events', () => {
  it('retries gateway requests without scoped compatibility fields when the gateway rejects them', async () => {
    const service = makeProxyService()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('Unrecognized key enabled_toolkits', {
          status: 400,
          statusText: 'Bad Request',
        }),
      )
      .mockResolvedValueOnce(
        makeSseResponse([
          {
            type: 'response.output_text.delta',
            delta: 'Recovered',
          },
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)
    const sent: Array<{ type: string; data: Record<string, unknown> }> = []

    const result = await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Hello' }],
      send: vi.fn(async (type: string, data: Record<string, unknown>) => {
        sent.push({ type, data })
      }),
      agentId: 'vibey',
      conversationId: 'conversation-1',
      userId: 'user-1',
      enabledToolkits: ['gmail'],
      disabledNativeActions: ['send_email'],
      skillCatalog: {
        source: 'vibey_db',
        entries: [{ id: 'skill-1', skill_key: 'email', name: 'Email', description: 'Email' }],
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
    const secondBody = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string)
    expect(firstBody).toMatchObject({
      enabled_toolkits: ['gmail'],
      disabled_native_actions: ['send_email'],
      lane: 'chat:conversation-1',
    })
    expect(secondBody.enabled_toolkits).toBeUndefined()
    expect(secondBody.disabled_native_actions).toBeUndefined()
    expect(secondBody.skill_catalog).toBeUndefined()
    expect(secondBody.lane).toBeUndefined()
    expect(result.content).toBe('Recovered')
    expect(sent).toContainEqual({
      type: 'content_delta',
      data: { content: 'Recovered' },
    })
  })

  it('captures response completion usage, generation id, and system prompt report metadata', async () => {
    const service = makeProxyService()
    const report = {
      source: 'run',
      generatedAt: 1,
      systemPrompt: { chars: 10, projectContextChars: 4, nonProjectContextChars: 6 },
      injectedWorkspaceFiles: [],
      skills: { promptChars: 0, entries: [] },
      tools: { listChars: 0, schemaChars: 0, entries: [] },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeSseResponse([
          {
            type: 'response.completed',
            response: {
              id: 'resp-1',
              model: 'openrouter/openai/gpt-5.5',
              metadata: {
                provider_response_id: 'gen_abc123',
                provider_cost: 0.123,
                last_call_input_tokens: 42,
                context_window_tokens: 128000,
                compaction_count: 2,
                system_prompt_report: report,
              },
              usage: {
                input_tokens: 10,
                output_tokens: 5,
                cache_read_input_tokens: 3,
                cache_creation_input_tokens: 2,
                total_tokens: 20,
              },
            },
          },
        ]),
      ),
    )

    const result = await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Hello' }],
      send: vi.fn(async () => undefined),
      agentId: 'vibey',
      conversationId: 'conversation-1',
      userId: 'user-1',
    })

    expect(result.generationId).toBe('gen_abc123')
    expect(result.usage).toEqual({
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: 3,
      cache_creation_input_tokens: 2,
      total_tokens: 20,
    })
    expect(result.completedGenerations).toEqual([
      {
        generationId: 'gen_abc123',
        usage: result.usage,
        model: 'openrouter/openai/gpt-5.5',
        providerCost: 0.123,
      },
    ])
    expect(result.lastCallInputTokens).toBe(42)
    expect(result.contextWindowTokens).toBe(128000)
    expect(result.compactionCount).toBe(2)
    expect(result.systemPromptReport).toEqual(report)
  })

  it('emits builtin tool labels, progress updates, and categorized tool failures', async () => {
    const reports: Array<Record<string, unknown>> = []
    const service = makeProxyService({ reports })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeSseResponse([
          {
            type: 'response.tool.start',
            name: 'exec',
            tool_call_id: 'tool-1',
            args: {},
          },
          {
            type: 'response.tool.update',
            name: 'exec',
            tool_call_id: 'tool-1',
            partial_result: { running: true },
          },
          {
            type: 'response.tool.done',
            name: 'exec',
            tool_call_id: 'tool-1',
            is_error: true,
            result: { error: 'Denied by RBAC for create_ad' },
          },
          {
            type: 'response.completed',
            response: {
              id: 'gen-1',
              model: 'anthropic/claude-opus-4.6',
              usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
            },
          },
        ]),
      ),
    )
    const sent: Array<{ type: string; data: Record<string, unknown> }> = []

    const result = await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Run command' }],
      send: vi.fn(async (type: string, data: Record<string, unknown>) => {
        sent.push({ type, data })
      }),
      agentId: 'vibey',
      model: 'anthropic/claude-opus-4.6',
      conversationId: 'conversation-1',
      userId: 'user-1',
    })

    expect(sent).toContainEqual({
      type: 'tool_start',
      data: { name: 'exec', label: 'Running a command', tool_call_id: 'tool-1' },
    })
    expect(sent).toContainEqual({
      type: 'tool_update',
      data: { name: 'exec', detail: 'Command is still running', tool_call_id: 'tool-1' },
    })
    expect(sent).toContainEqual({
      type: 'tool_end',
      data: {
        name: 'exec',
        label: 'Running a command',
        status: 'failed',
        tool_call_id: 'tool-1',
        error: 'Denied by RBAC for create_ad',
      },
    })
    expect(reports[0]).toMatchObject({
      error_code: 'tool_error',
      category: 'rbac',
      context: expect.objectContaining({ toolName: 'exec', toolCallId: 'tool-1' }),
    })
    expect(result.toolSteps).toEqual([
      {
        name: 'exec',
        label: 'Running a command',
        status: 'failed',
        error: 'Denied by RBAC for create_ad',
        tool_call_id: 'tool-1',
        result: {
          keys: ['error'],
          error: 'Denied by RBAC for create_ad',
        },
      },
    ])
  })

  it('uses contracted user explanations for failed tool end events', async () => {
    const service = makeProxyService()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeSseResponse([
          {
            type: 'response.tool.start',
            name: 'vibey_backend',
            tool_call_id: 'tool-contract',
            args: { action: 'create_presentation', label: 'Building slides' },
          },
          {
            type: 'response.tool.done',
            name: 'vibey_backend',
            tool_call_id: 'tool-contract',
            is_error: true,
            result: {
              details: {
                success: false,
                error: 'Raw renderer connection reset',
                error_code: 'ARTIFACT_DELIVERY_FAILED',
                error_class: 'platform_data_query_failed',
                user_explanation: {
                  intent: 'use_alternate_delivery',
                  sentence: 'The slides were saved, so I will show them another way.',
                },
              },
            },
          },
        ]),
      ),
    )
    const sent: Array<{ type: string; data: Record<string, unknown> }> = []

    await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Build slides' }],
      send: vi.fn(async (type: string, data: Record<string, unknown>) => {
        sent.push({ type, data })
      }),
      agentId: 'vibey',
      conversationId: 'conversation-1',
      userId: 'user-1',
    })

    expect(sent).toContainEqual({
      type: 'tool_end',
      data: {
        name: 'vibey_backend',
        label: 'Building slides',
        status: 'failed',
        tool_call_id: 'tool-contract',
        error: 'The slides were saved, so I will show them another way.',
      },
    })
  })

  it('converts UI blocks to text content for Telegram and Slack streams', async () => {
    const service = makeProxyService()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeSseResponse([
          {
            type: 'response.tool.start',
            name: 'vibey_backend',
            tool_call_id: 'tool-2',
            args: { action: 'send_email', label: 'Sending email' },
          },
          {
            type: 'response.tool.done',
            name: 'vibey_backend',
            tool_call_id: 'tool-2',
            action: 'send_email',
            args: { action: 'send_email', label: 'Sending email' },
            is_error: false,
            result: {
              ui_blocks: [
                {
                  type: 'email_send_status',
                  send_type: 'broadcast',
                  status: 'sent',
                  provider_name: 'Resend',
                  subject: 'Launch update',
                },
              ],
            },
          },
        ]),
      ),
    )
    const sent: Array<{ type: string; data: Record<string, unknown> }> = []

    const result = await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Send campaign email' }],
      send: vi.fn(async (type: string, data: Record<string, unknown>) => {
        sent.push({ type, data })
      }),
      agentId: 'vibey',
      channel: 'telegram',
      conversationId: 'conversation-1',
      userId: 'user-1',
    })

    expect(sent.some((event) => event.type === 'ui_block')).toBe(false)
    expect(sent).toContainEqual({
      type: 'content_delta',
      data: { content: '\n\n*Email sent:* "Launch update" via Resend' },
    })
    expect(result.content).toContain('*Email sent:* "Launch update" via Resend')
  })

  it('returns artifact output blocks from completed tool results', async () => {
    const service = makeProxyService()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeSseResponse([
          {
            type: 'response.tool.start',
            name: 'vibey_backend',
            tool_call_id: 'tool-form',
            args: { action: 'create_form', label: 'Creating form' },
          },
          {
            type: 'response.tool.done',
            name: 'vibey_backend',
            tool_call_id: 'tool-form',
            action: 'create_form',
            args: { action: 'create_form', label: 'Creating form' },
            is_error: false,
            result: {
              success: true,
              form: { id: 'form-1', name: 'Lead Capture', space_id: 'space-1' },
            },
          },
        ]),
      ),
    )
    const sent: Array<{ type: string; data: Record<string, unknown> }> = []

    const result = await service.streamCompletion({
      input: [{ type: 'message', role: 'user', content: 'Create form' }],
      send: vi.fn(async (type: string, data: Record<string, unknown>) => {
        sent.push({ type, data })
      }),
      agentId: 'vibey',
      conversationId: 'conversation-1',
      userId: 'user-1',
    })

    const expectedBlock = expect.objectContaining({
      type: 'artifact_preview',
      artifactType: 'form',
      artifactId: 'form-1',
      name: 'Lead Capture',
      spaceId: 'space-1',
    })
    expect(sent).toContainEqual({ type: 'ui_block', data: { block: expectedBlock } })
    expect(result.artifactOutputBlocks).toEqual([expectedBlock])
  })
})
