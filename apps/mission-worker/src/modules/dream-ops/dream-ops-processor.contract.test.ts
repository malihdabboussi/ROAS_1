import { describe, expect, it, vi } from 'vitest'

async function loadService() {
  const mod = await import('./dream-ops.processor')
  expect(mod.DreamOpsProcessor).toBeTypeOf('function')
  return mod.DreamOpsProcessor
}

describe('DreamOpsProcessor', () => {
  it('routes company daily dreams to the Atlas runner and marks the outbox done', async () => {
    const Processor = await loadService()
    const repository = {
      markOutboxDone: vi.fn(async () => undefined),
      markOutboxFailed: vi.fn(async () => undefined),
      markSettingSuccessful: vi.fn(async () => undefined),
      createRun: vi.fn(async () => ({ id: 'dream-run-1' })),
      completeRun: vi.fn(async () => undefined),
    }
    const companyRunner = {
      runDailyDream: vi.fn(async () => ({
        runId: 'run-1',
        chunksProcessed: 1,
        sourceCounts: { messages: 2 },
        signalsCreated: 1,
      })),
    }
    const agentRunner = { runAgentDream: vi.fn() }
    const processor = new Processor(repository, companyRunner, agentRunner)

    const result = await processor.process({
      data: {
        outboxId: 'outbox-1',
        orgId: 'org-1',
        userId: 'user-1',
        operationType: 'company_daily_dream',
        subjectKind: 'company_brain',
        subjectKey: 'brain-1',
        targetId: 'brain-1',
        payload: {
          local_date: '2026-06-24',
          window_start: '2026-06-23T00:00:00.000Z',
          window_end: '2026-06-24T00:00:00.000Z',
        },
      },
    } as never)

    expect(companyRunner.runDailyDream).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', brainId: 'brain-1' }),
    )
    expect(repository.markOutboxDone).toHaveBeenCalledWith('outbox-1')
    expect(repository.completeRun).toHaveBeenCalledWith(
      'dream-run-1',
      expect.objectContaining({
        status: 'completed',
        output: expect.objectContaining({ company_cortex_dream_run_id: 'run-1' }),
      }),
    )
    expect(repository.markSettingSuccessful).toHaveBeenCalledWith({
      operationType: 'company_daily_dream',
      orgId: 'org-1',
      subjectKey: 'brain-1',
      completedAt: expect.any(String),
    })
    expect(result).toMatchObject({ success: true, operationType: 'company_daily_dream' })
  })

  it('routes Jaime agent learning dreams to the agent runner', async () => {
    const Processor = await loadService()
    const repository = {
      markOutboxDone: vi.fn(async () => undefined),
      markOutboxFailed: vi.fn(async () => undefined),
      markSettingSuccessful: vi.fn(async () => undefined),
    }
    const companyRunner = { runDailyDream: vi.fn() }
    const agentRunner = {
      runAgentDream: vi.fn(async () => ({
        runId: 'run-2',
        proposalsCreated: 1,
        skipped: false,
      })),
    }
    const processor = new Processor(repository, companyRunner, agentRunner)

    await processor.process({
      data: {
        outboxId: 'outbox-2',
        orgId: 'org-1',
        userId: 'user-1',
        operationType: 'agent_learning_dream',
        subjectKind: 'agent',
        subjectKey: 'designer',
        payload: {
          local_date: '2026-06-24',
          window_start: '2026-06-23T00:00:00.000Z',
          window_end: '2026-06-24T00:00:00.000Z',
        },
      },
    } as never)

    expect(agentRunner.runAgentDream).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', agentKey: 'designer' }),
    )
    expect(repository.markSettingSuccessful).toHaveBeenCalledWith({
      operationType: 'agent_learning_dream',
      orgId: 'org-1',
      subjectKey: 'designer',
      completedAt: expect.any(String),
    })
  })
})
