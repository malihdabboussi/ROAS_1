import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenClawGatewayRequestService } from './openclaw-gateway-request.service'

describe('OpenClawGatewayRequestService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('retries without scoped payload fields when the gateway rejects compatibility keys', async () => {
    vi.stubEnv('OPENCLAW_GATEWAY_URL', 'http://gateway.local')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'gateway-token')
    const postResponses = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('Unrecognized key: "enabled_toolkits"', {
          status: 400,
          statusText: 'Bad Request',
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200, statusText: 'OK' }))

    const service = new OpenClawGatewayRequestService(
      { report: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )
    const result = await service.openGatewayStream({
      agentId: 'agent-1',
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      logStreamTiming: vi.fn(),
      options: {
        conversationId: 'conversation-1',
        traceId: 'trace-1',
        messageId: 'message-1',
        runId: 'run-1',
        requestId: 'request-1',
        disabledNativeActions: ['delete_everything'],
        enabledToolkits: ['brain'],
        input: 'hello',
        model: 'openclaw:agent-1',
        send: vi.fn(async () => undefined),
        sessionKey: 'session-1',
        skillCatalog: { entries: [{ name: 'skill' }] },
        userId: 'user-1',
      } as never,
      requestTimeoutMs: 1000,
      resolvedModel: 'openclaw:agent-1',
      streamTimingLogsEnabled: false,
    })

    clearTimeout(result.timeoutHandle)
    expect(result.response.status).toBe(200)
    expect(postResponses).toHaveBeenCalledTimes(2)
    const firstPayload = postResponses.mock.calls[0]?.[0]?.payload
    const firstHeaders = postResponses.mock.calls[0]?.[0]?.headers
    const secondPayload = postResponses.mock.calls[1]?.[0]?.payload
    expect(firstHeaders).toMatchObject({
      'x-vibey-trace-id': 'trace-1',
      'x-vibey-message-id': 'message-1',
      'x-vibey-run-id': 'run-1',
      'x-vibey-request-id': 'request-1',
      'x-vibey-conversation-id': 'conversation-1',
    })
    expect(firstPayload).toMatchObject({
      enabled_toolkits: ['brain'],
      disabled_native_actions: ['delete_everything'],
      lane: 'chat:conversation-1',
      max_output_tokens: 32_768,
      skill_catalog: { entries: [{ name: 'skill' }] },
    })
    expect(secondPayload).not.toHaveProperty('enabled_toolkits')
    expect(secondPayload).not.toHaveProperty('disabled_native_actions')
    expect(secondPayload).not.toHaveProperty('lane')
    expect(secondPayload).not.toHaveProperty('skill_catalog')
  })

  it('does not retry without disabled native actions for strict requests', async () => {
    vi.stubEnv('OPENCLAW_GATEWAY_URL', 'http://gateway.local')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'gateway-token')
    const postResponses = vi.fn().mockResolvedValue(
      new Response('Unrecognized key: "disabled_native_actions"', {
        status: 400,
        statusText: 'Bad Request',
      }),
    )

    const service = new OpenClawGatewayRequestService(
      { report: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )

    await expect(
      service.openGatewayStream({
        agentId: 'agent-1',
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
        logStreamTiming: vi.fn(),
        options: {
          conversationId: 'conversation-1',
          disabledNativeActions: ['ask_agent'],
          strictDisabledNativeActions: true,
          input: 'hello',
          model: 'openclaw:agent-1',
          send: vi.fn(async () => undefined),
          sessionKey: 'session-1',
          userId: 'user-1',
        } as never,
        requestTimeoutMs: 1000,
        resolvedModel: 'openclaw:agent-1',
        streamTimingLogsEnabled: false,
      }),
    ).rejects.toThrow('Gateway connection error')

    expect(postResponses).toHaveBeenCalledTimes(1)
  })

  it('disables tools for the final writing pass', async () => {
    vi.stubEnv('OPENCLAW_GATEWAY_URL', 'http://gateway.local')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'gateway-token')
    const postResponses = vi.fn().mockResolvedValue(
      new Response('ok', {
        status: 200,
        statusText: 'OK',
      }),
    )
    const service = new OpenClawGatewayRequestService(
      { report: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )

    const result = await service.openGatewayStream({
      agentId: 'agent-1',
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      logStreamTiming: vi.fn(),
      options: {
        conversationId: 'conversation-1',
        input: 'write the final answer',
        model: 'anthropic/claude-opus-5',
        send: vi.fn(async () => undefined),
        sessionKey: 'session-1:writer',
        toolChoice: 'none',
        userId: 'user-1',
      } as never,
      requestTimeoutMs: 1000,
      resolvedModel: 'openrouter/anthropic/claude-opus-5',
      streamTimingLogsEnabled: false,
    })

    clearTimeout(result.timeoutHandle)
    expect(postResponses.mock.calls[0]?.[0]?.payload).toMatchObject({
      tool_choice: 'none',
    })
  })

  it('uses the interactive OpenRouter credential only for the current chat request', async () => {
    vi.stubEnv('OPENROUTER_INTERACTIVE_API_KEY', 'interactive-key')
    const postResponses = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const service = new OpenClawGatewayRequestService(
      { report: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )

    const result = await service.openGatewayStream({
      agentId: 'agent-1',
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      logStreamTiming: vi.fn(),
      options: {
        input: 'hello',
        model: 'openai/gpt-5.6-terra',
        send: vi.fn(async () => undefined),
        sessionKey: 'session-1',
        userId: 'user-1',
      } as never,
      requestTimeoutMs: 1000,
      resolvedModel: 'openrouter/openai/gpt-5.6-terra',
      streamTimingLogsEnabled: false,
    })

    clearTimeout(result.timeoutHandle)
    expect(postResponses.mock.calls[0]?.[0]?.payload).toMatchObject({
      runtime_credentials: [{ provider: 'openrouter', access_token: 'interactive-key' }],
    })
  })

  it('preserves OpenRouter billing failures from gateway status responses', async () => {
    vi.stubEnv('OPENCLAW_GATEWAY_URL', 'http://gateway.local')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'gateway-token')
    const send = vi.fn(async () => undefined)
    const report = vi.fn()
    const postResponses = vi.fn().mockResolvedValue(
      new Response('Provider returned a billing error: insufficient balance', {
        status: 402,
        statusText: 'Payment Required',
      }),
    )

    const service = new OpenClawGatewayRequestService(
      { report } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )

    await expect(
      service.openGatewayStream({
        agentId: 'agent-1',
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
        logStreamTiming: vi.fn(),
        options: {
          conversationId: 'conversation-1',
          input: 'hello',
          model: 'google/gemini-3.5-flash',
          send,
          sessionKey: 'session-1',
          userId: 'user-1',
        } as never,
        requestTimeoutMs: 1000,
        resolvedModel: 'openrouter/google/gemini-3.5-flash',
        streamTimingLogsEnabled: false,
      }),
    ).rejects.toThrow('provider_billing')

    expect(send).toHaveBeenCalledWith('error', { code: 'provider_billing' })
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ error_code: 'provider_billing' }))
  })

  it('preserves provider rate limit failures from gateway status responses', async () => {
    vi.stubEnv('OPENCLAW_GATEWAY_URL', 'http://gateway.local')
    vi.stubEnv('OPENCLAW_GATEWAY_TOKEN', 'gateway-token')
    const send = vi.fn(async () => undefined)
    const postResponses = vi.fn().mockResolvedValue(
      new Response('Rate limit exceeded for this provider', {
        status: 429,
        statusText: 'Too Many Requests',
      }),
    )

    const service = new OpenClawGatewayRequestService(
      { report: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { resolveRuntimeCredential: vi.fn() } as never,
      { postResponses } as never,
    )

    await expect(
      service.openGatewayStream({
        agentId: 'agent-1',
        logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
        logStreamTiming: vi.fn(),
        options: {
          conversationId: 'conversation-1',
          input: 'hello',
          model: 'google/gemini-3.5-flash',
          send,
          sessionKey: 'session-1',
          userId: 'user-1',
        } as never,
        requestTimeoutMs: 1000,
        resolvedModel: 'openrouter/google/gemini-3.5-flash',
        streamTimingLogsEnabled: false,
      }),
    ).rejects.toThrow('busy')

    expect(send).toHaveBeenCalledWith('error', { code: 'busy' })
  })
})
