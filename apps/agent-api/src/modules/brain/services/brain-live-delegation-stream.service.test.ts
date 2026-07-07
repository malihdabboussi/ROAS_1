import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainLiveDelegationStreamService } from './brain-live-delegation-stream.service'
import type { DelegationState } from './brain-live.types'

function makeState(): DelegationState {
  return {
    id: 'delegation-1',
    status: 'running',
    toolSteps: [],
    currentTool: null,
    content: '',
    orderedBlocks: [],
    startedAt: Date.now(),
  }
}

function makeSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, statusText: 'OK' })
}

describe('BrainLiveDelegationStreamService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('streams gateway SSE content into delegation state and completion events', async () => {
    const postResponses = vi
      .fn()
      .mockResolvedValue(
        makeSseResponse([
          'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
          'data: {"type":"response.completed"}\n\n',
        ]),
      )
    const onEvent = vi.fn()
    const state = makeState()

    await new BrainLiveDelegationStreamService({ postResponses } as never).streamDelegation({
      delegationId: 'delegation-1',
      gatewayUrl: 'http://gateway.local',
      headers: { Authorization: 'Bearer token' },
      payload: { input: [], model: 'openclaw:vibey', stream: true },
      state,
      onEvent,
    })

    expect(postResponses).toHaveBeenCalledWith({
      gatewayUrl: 'http://gateway.local',
      headers: { Authorization: 'Bearer token' },
      payload: { input: [], model: 'openclaw:vibey', stream: true },
      signal: expect.any(AbortSignal),
    })
    expect(state.status).toBe('completed')
    expect(state.content).toBe('Hello')
    expect(state.orderedBlocks).toContainEqual(
      expect.objectContaining({ type: 'text', content: 'Hello' }),
    )
    expect(onEvent).toHaveBeenCalledWith('content_delta', { content: 'Hello' })
    expect(onEvent).toHaveBeenCalledWith('delegation_complete', {
      delegation_id: 'delegation-1',
      status: 'completed',
    })
  })
})
