import { describe, expect, it, vi } from 'vitest'

async function loadService() {
  const mod = await import('./dream-ops-outbox-dispatcher.service')
  expect(mod.DreamOpsOutboxDispatcherService).toBeTypeOf('function')
  return mod.DreamOpsOutboxDispatcherService
}

describe('DreamOpsOutboxDispatcherService', () => {
  it('claims pending dream outbox rows and publishes operation-based jobs', async () => {
    const Service = await loadService()
    const queue = { add: vi.fn(async () => undefined) }
    const service = new Service(queue, { get: vi.fn().mockReturnValue(999999999) }, {
      hasPgPool: () => true,
      pgQuery: vi.fn(async () => ({
        rows: [
          {
            id: 'outbox-1',
            org_id: 'org-1',
            user_id: 'user-1',
            operation_type: 'agent_learning_dream',
            subject_kind: 'agent',
            subject_key: 'designer',
            dedupe_key: 'agent_learning_dream:org-1:designer:2026-06-24',
            payload: { local_date: '2026-06-24' },
            attempts: 1,
            max_attempts: 3,
          },
        ],
      })),
      getPgPool: vi.fn(),
    })

    await service.dispatchDueEvents()

    expect(queue.add).toHaveBeenCalledWith(
      'dream-ops',
      expect.objectContaining({
        outboxId: 'outbox-1',
        operationType: 'agent_learning_dream',
        subjectKey: 'designer',
      }),
      expect.objectContaining({ jobId: 'dream-ops-outbox-1' }),
    )
  })
})
