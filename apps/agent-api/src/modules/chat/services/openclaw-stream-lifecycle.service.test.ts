import { describe, expect, it, vi } from 'vitest'
import { OpenClawStreamLifecycleService } from './openclaw-stream-lifecycle.service'
import { createOpenClawStreamState, type OpenClawStreamContext } from './openclaw-stream-state'

function makeContext(): OpenClawStreamContext {
  return {
    agentId: 'employee',
    correlation: 'corr-1',
    logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() } as any,
    logStreamTiming: vi.fn(),
    options: {
      send: vi.fn(async () => undefined),
      input: [],
      conversationId: 'conversation-1',
    } as any,
    resolvedModel: 'anthropic/claude-sonnet-4.6',
    streamStartedAt: Date.now(),
    streamTimingLogsEnabled: false,
  }
}

describe('OpenClawStreamLifecycleService', () => {
  it('records OpenClaw compaction events as recovery events', async () => {
    const service = new OpenClawStreamLifecycleService({ report: vi.fn() } as any)
    const state = createOpenClawStreamState()
    const context = makeContext()

    await service.handleEvent(
      'response.compaction',
      {
        type: 'response.compaction',
        phase: 'end',
        trigger: 'overflow',
        outcome: 'compacted',
        attempt: 2,
        maxAttempts: 3,
        tokensBefore: 150000,
        tokensAfter: 70000,
      },
      context,
      state,
    )

    expect(state.compactionCount).toBe(2)
    expect(state.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'context_window_compaction',
        status: 'recovered',
        reason: 'compacted',
        metadata: expect.objectContaining({
          phase: 'end',
          trigger: 'overflow',
          attempt: 2,
          maxAttempts: 3,
          tokensBefore: 150000,
          tokensAfter: 70000,
        }),
      }),
    ])
  })
})
