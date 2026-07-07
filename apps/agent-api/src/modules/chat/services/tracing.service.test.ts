import { describe, expect, it, vi } from 'vitest'
import { TracingService } from './tracing.service'

describe('TracingService', () => {
  it('redacts secrets before starting a trace', async () => {
    const select = vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'trace-1' }, error: null })),
    }))
    const insert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ insert }))
    const service = new TracingService({ client: { from } } as any)

    await service.startTrace({
      userId: 'user-1',
      conversationId: 'conv-1',
      messageId: '11111111-1111-4111-8111-111111111111',
      runId: 'run-1',
      requestId: 'request-1',
      sessionKey: 'agent:x:conv-1',
      userMessage: 'OPENAI_API_KEY=sk-proj-aB2cD3eF4gH5iJ6kL7',
      systemPrompt: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      historyLength: 0,
      channel: 'studio',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_message: 'OPENAI_API_KEY=[REDACTED_SECRET]',
        system_prompt: '[REDACTED_SECRET]',
        message_id: '11111111-1111-4111-8111-111111111111',
        run_id: 'run-1',
        request_id: 'request-1',
      }),
    )
  })

  it('stores model routing observability when starting a trace', async () => {
    const select = vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'trace-1' }, error: null })),
    }))
    const insert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ insert }))
    const service = new TracingService({ client: { from } } as any)

    await service.startTrace({
      userId: 'user-1',
      conversationId: 'conv-1',
      sessionKey: 'agent:x:conv-1',
      userMessage: 'hello',
      systemPrompt: 'system',
      historyLength: 0,
      channel: 'studio',
      model: 'openai-codex/gpt-5.5',
      observability: {
        chat_model_routing: {
          requested_model_id: 'openai-codex/gpt-5.5',
          gateway_model_id: 'openai-codex/gpt-5.5',
          subscription_provider: 'openai_codex',
        },
      },
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai-codex/gpt-5.5',
        observability: {
          chat_model_routing: {
            requested_model_id: 'openai-codex/gpt-5.5',
            gateway_model_id: 'openai-codex/gpt-5.5',
            subscription_provider: 'openai_codex',
          },
        },
      }),
    )
  })

  it('persists the resolved model from llm input when completing a trace', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new TracingService({ client: { from } } as any)

    await service.completeTrace('trace-1', {
      response: 'done',
      toolSteps: [],
      usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      durationMs: 100,
      llmInput: { model: 'anthropic/claude-sonnet-4.6' },
    })

    expect(from).toHaveBeenCalledWith('vb_agent_traces')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-sonnet-4.6',
        input_tokens: 10,
        output_tokens: 2,
        total_tokens: 12,
        status: 'completed',
        terminal_status: 'done',
        user_visible_outcome: 'output_visible',
        recovery_status: 'none',
        recovery_events: [],
        observability: {},
      }),
    )
    expect(eq).toHaveBeenCalledWith('id', 'trace-1')
  })

  it('redacts secrets from completed trace payloads', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new TracingService({ client: { from } } as any)

    await service.completeTrace('trace-1', {
      response: 'Use sk-proj-aB2cD3eF4gH5iJ6kL7',
      toolSteps: [
        {
          name: 'tool',
          label: 'OPENAI_API_KEY=sk-proj-aB2cD3eF4gH5iJ6kL7',
          status: 'completed',
          input: { token: 'sk-proj-aB2cD3eF4gH5iJ6kL7' },
        },
      ],
      durationMs: 100,
      llmInput: { model: 'anthropic/claude-sonnet-4.6', api_key: 'sk-proj-aB2cD3eF4gH5iJ6kL7' },
      llmOutput: [{ text: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }],
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        response: 'Use [REDACTED_SECRET]',
        tool_steps: [
          {
            name: 'tool',
            label: 'OPENAI_API_KEY=[REDACTED_SECRET]',
            status: 'completed',
            input: { token: '[REDACTED_SECRET]' },
          },
        ],
        messages_input: { model: 'anthropic/claude-sonnet-4.6', api_key: '[REDACTED_SECRET]' },
        messages_output: [{ text: '[REDACTED_SECRET]' }],
        recovery_events: [],
        observability: {},
      }),
    )
  })

  it('rewrites secret requests before completing a trace', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new TracingService({ client: { from } } as any)

    await service.completeTrace('trace-1', {
      response: 'Please provide your OpenAI API key so I can continue.',
      toolSteps: [],
      durationMs: 100,
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        response:
          "I can't take API keys, tokens, or secrets in chat. I'll use the available Vibey tools and connected integrations instead.",
      }),
    )
  })

  it('persists outcome fields when failing a trace', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const service = new TracingService({ client: { from } } as any)

    await service.failTrace('trace-1', 'provider overloaded', {
      terminalStatus: 'failed_recoverable',
      userVisibleOutcome: 'blocked',
      recoveryStatus: 'failed_recoverable',
      recoveryEvents: [{ type: 'fallback_model_retry', status: 'failed' }],
      observability: { request_id: 'request-1' },
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'provider overloaded',
        terminal_status: 'failed_recoverable',
        user_visible_outcome: 'blocked',
        recovery_status: 'failed_recoverable',
        recovery_events: [{ type: 'fallback_model_retry', status: 'failed' }],
        observability: { request_id: 'request-1' },
      }),
    )
  })
})
