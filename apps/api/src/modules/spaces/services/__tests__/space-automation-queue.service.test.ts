import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'

function buildService(automationQueue: { add: ReturnType<typeof vi.fn> }) {
  return new SpaceAutomationService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    automationQueue as never,
  )
}

describe('SpaceAutomationService automation queue routing', () => {
  afterEach(() => {
    delete process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_DISABLED
    delete process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED
    delete process.env.VERCEL
  })

  it('returns false without enqueueing when the automation queue is disabled', async () => {
    process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED = '1'
    process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_DISABLED = '1'
    const automationQueue = { add: vi.fn() }
    const service = buildService(automationQueue)

    const queued = await service.enqueueAutomationRuntimeJob(
      'automation-1',
      { type: 'schedule', fired_at: '2026-08-11T01:45:00.000Z' },
      {
        supabase: {} as never,
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
        depth: 0,
      },
      'itemless',
    )

    expect(queued).toBe(false)
    expect(automationQueue.add).not.toHaveBeenCalled()
  })

  it('returns false without enqueueing from a Vercel serverless runtime', async () => {
    process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED = '1'
    process.env.VERCEL = '1'
    const automationQueue = { add: vi.fn() }
    const service = buildService(automationQueue)

    const queued = await service.enqueueAutomationRuntimeJob(
      'automation-1',
      { type: 'schedule', fired_at: '2026-08-11T02:55:00.000Z' },
      {
        supabase: {} as never,
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
        depth: 0,
      },
      'itemless',
    )

    expect(queued).toBe(false)
    expect(automationQueue.add).not.toHaveBeenCalled()
  })

  it('returns false without enqueueing unless a consumer is explicitly enabled', async () => {
    const automationQueue = { add: vi.fn() }
    const service = buildService(automationQueue)

    const queued = await service.enqueueAutomationRuntimeJob(
      'automation-1',
      { type: 'schedule', fired_at: '2026-08-11T03:05:00.000Z' },
      {
        supabase: {} as never,
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
        depth: 0,
      },
      'itemless',
    )

    expect(queued).toBe(false)
    expect(automationQueue.add).not.toHaveBeenCalled()
  })
})
