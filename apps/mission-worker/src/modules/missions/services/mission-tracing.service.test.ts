import { describe, expect, it, vi } from 'vitest'
import { MissionTracingService } from './mission-tracing.service'

describe('MissionTracingService', () => {
  it('persists the resolved model instead of relying on a stale database default', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'trace-1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const service = new MissionTracingService({
      getClient: vi.fn(() => ({ from: vi.fn(() => ({ insert })) })),
    } as never)

    await service.startTrace({
      userId: 'user-1',
      missionId: 'mission-1',
      sessionKey: 'session-1',
      agentKey: 'atlas',
      taskType: 'mission_execute',
      model: 'openrouter/anthropic/claude-opus-5',
      systemPrompt: 'System',
      userPrompt: 'User',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'openrouter/anthropic/claude-opus-5' }),
    )
  })
})
