import { Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { enqueueMissionOutboxEvent } from '../missions.scheduler-recovery.outbox'
import type { MissionsSchedulerRecoveryCtx } from '../missions.scheduler-recovery.types'
import { detectStalledSubtasks } from '../missions.scheduler-recovery.watchdogs.phase-b'

describe('mission scheduler recovery', () => {
  it('does not enqueue when a stale snapshot loses the atomic reclaim race', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { execution_state: { completed_actions: [] } },
      error: null,
    })
    const chain: Record<string, any> = { maybeSingle }
    for (const method of ['select', 'eq']) chain[method] = vi.fn().mockReturnValue(chain)

    const pgQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM mission_subtasks WHERE status = 'in_progress'")) {
        return {
          rows: [
            {
              id: 'subtask-1',
              mission_id: 'mission-1',
              assigned_agent_key: 'atlas',
              updated_at: '2026-07-16T21:00:00.000Z',
              execution_state: { execution_status: 'streaming' },
            },
          ],
          rowCount: 1,
        }
      }
      if (sql.includes('FROM missions WHERE id = ANY')) {
        return {
          rows: [
            {
              id: 'mission-1',
              user_id: 'user-1',
              org_id: null,
              campaign_id: null,
              space_id: null,
              assigned_agent_key: 'atlas',
              priority: 'normal',
            },
          ],
          rowCount: 1,
        }
      }
      if (sql.includes('UPDATE mission_subtasks')) return { rows: [], rowCount: 0 }
      throw new Error(`Unexpected SQL: ${sql}`)
    })
    const enqueueOutboxEvent = vi.fn()
    const ctx = {
      databaseService: {
        getClient: () => ({ from: vi.fn().mockReturnValue(chain) }),
        hasPgPool: () => true,
        pgQuery,
      },
      logger: new Logger('test'),
      agentRuntime: {
        buildSubtaskSessionKey: () => 'session-1',
      },
      openclawGateway: {
        probeSessionActiveForUser: vi.fn().mockResolvedValue(false),
      },
      isPastPriorityStaleThreshold: () => true,
      isPastMissionExecutionLease: () => true,
      resolveRuntimeAgent: vi.fn().mockResolvedValue({ gatewayAgentId: 'atlas' }),
      enqueueOutboxEvent,
    } as unknown as MissionsSchedulerRecoveryCtx

    await detectStalledSubtasks(ctx)

    expect(enqueueOutboxEvent).not.toHaveBeenCalled()
    expect(pgQuery).toHaveBeenCalledWith(
      expect.stringContaining('updated_at = $2::timestamptz'),
      expect.arrayContaining(['subtask-1', '2026-07-16T21:00:00.000Z']),
    )
  })

  it('surfaces an outbox write failure to the recovery sweep', async () => {
    const missionChain: Record<string, any> = {}
    for (const method of ['select', 'eq']) missionChain[method] = vi.fn().mockReturnValue(missionChain)
    missionChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { priority: 'normal', org_id: null },
      error: null,
    })
    const outboxChain = {
      upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
    }
    const databaseService = {
      getClient: () => ({
        from: (table: string) => (table === 'missions' ? missionChain : outboxChain),
      }),
      hasPgPool: () => false,
    }

    await expect(
      enqueueMissionOutboxEvent(databaseService as never, new Logger('test'), {
        missionId: 'mission-1',
        userId: 'user-1',
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: 'dedupe-1',
        requeueExistingDedupeKey: true,
      }),
    ).rejects.toThrow('database unavailable')
  })
})
