import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionInternalService } from '../mission-internal.service'
import { MissionLifecycleService } from '../mission-lifecycle.service'
import { MissionOutboxService } from '../mission-outbox.service'
import { MissionsCreationService } from '../missions-creation.service'
import { MissionsExecutionService } from '../missions-execution.service'
import { MissionsInternalOperationsService } from '../missions-internal-operations.service'

function createServiceWithNativePg(queryImpl: (sql: string, values?: unknown[]) => Promise<any>) {
  const missionsRepository = {} as any
  const mediaService = {} as any
  const postgresDirect = {
    hasConnectionString: vi.fn().mockReturnValue(true),
    withTransaction: vi.fn().mockImplementation(async (fn: (client: any) => Promise<any>) => {
      const client = {
        query: vi
          .fn()
          .mockImplementation((sql: string, values?: unknown[]) => queryImpl(sql, values)),
      }
      return fn(client)
    }),
  } as any

  const missionOutboxService = new MissionOutboxService(missionsRepository, {
    client: {} as SupabaseClient,
  } as any)
  const missionLifecycleService = new MissionLifecycleService(
    missionsRepository,
    postgresDirect,
    missionOutboxService,
  )
  const missionInternalService = new MissionInternalService(
    missionsRepository,
    postgresDirect,
    missionOutboxService,
    missionLifecycleService,
  )

  return {
    creationService: new MissionsCreationService(missionLifecycleService, missionInternalService),
    executionService: new MissionsExecutionService(missionLifecycleService),
    internalOpsService: new MissionsInternalOperationsService(missionInternalService),
    postgresDirect,
    mediaService,
  }
}

describe('MissionsService native PG path', () => {
  it('creates mission with transactional outbox write', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const correlationId = '14a117fa-8570-4f9d-ac7f-4b48d9ac68e4'
    const calls: string[] = []

    const { creationService, postgresDirect } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM missions') && sql.includes('idempotency_key')) {
        return { rowCount: 0, rows: [] }
      }
      if (sql.includes('WHERE user_id = $1::uuid') && sql.includes('idempotency_key')) {
        return { rowCount: 0, rows: [] }
      }
      if (sql.includes('FROM agents_registry')) {
        return { rowCount: 1, rows: [{ agent_key: 'vibey' }] }
      }
      if (sql.includes('INSERT INTO missions (')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: missionId,
              user_id: userId,
              title: 'Test mission',
              brief: null,
              input: {},
              assigned_agent_key: 'vibey',
              correlation_id: correlationId,
            },
          ],
        }
      }
      return { rowCount: 1, rows: [] }
    })

    const created = await creationService.create({} as SupabaseClient, userId, {
      title: 'Test mission',
      input: {},
    } as any)

    expect(postgresDirect.withTransaction).toHaveBeenCalledTimes(1)
    expect(calls.some((sql) => sql.includes('INSERT INTO mission_outbox'))).toBe(true)
    expect(created.id).toBe(missionId)
    expect(created.queue_trigger.mission_id).toBe(missionId)
  })

  it('retries failed mission with transactional outbox write', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const calls: string[] = []

    const { executionService } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('SELECT *') && sql.includes('FROM missions')) {
        return { rowCount: 1, rows: [{ id: missionId, user_id: userId, status: 'failed' }] }
      }
      if (sql.includes('UPDATE missions') && sql.includes("status = 'inbox'")) {
        return { rowCount: 1, rows: [{ id: missionId, user_id: userId, status: 'inbox' }] }
      }
      return { rowCount: 1, rows: [] }
    })

    const updated = await executionService.retry({} as SupabaseClient, userId, missionId)

    expect(calls.some((sql) => sql.includes('INSERT INTO mission_outbox'))).toBe(true)
    expect(updated.status).toBe('inbox')
  })

  it('triages user comment from done to review and enqueues review outbox', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const correlationId = '14a117fa-8570-4f9d-ac7f-4b48d9ac68e4'
    const commentId = '0f55496a-9919-4ec2-a251-6cc08a95db2f'
    const calls: string[] = []

    const { executionService } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM missions') && sql.includes('LIMIT 1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: missionId,
              user_id: userId,
              status: 'done',
              assigned_agent_key: 'vibey',
              current_agent_key: null,
              correlation_id: correlationId,
            },
          ],
        }
      }
      if (sql.includes('INSERT INTO missions_logs') && sql.includes("'user.comment'")) {
        return { rowCount: 1, rows: [{ id: commentId }] }
      }
      return { rowCount: 1, rows: [] }
    })

    await executionService.addUserComment({} as SupabaseClient, userId, missionId, {
      message: 'Need one more revision',
    })

    expect(
      calls.some(
        (sql) =>
          sql.includes('INSERT INTO mission_outbox') && sql.includes("'mission.comment.directive'"),
      ),
    ).toBe(true)
  })

  it('triages user comment from failed to review and enqueues review outbox', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const correlationId = '14a117fa-8570-4f9d-ac7f-4b48d9ac68e4'
    const commentId = '1a55496a-9919-4ec2-a251-6cc08a95db30'
    const calls: string[] = []

    const { executionService } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM missions') && sql.includes('LIMIT 1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: missionId,
              user_id: userId,
              status: 'failed',
              assigned_agent_key: 'vibey',
              current_agent_key: null,
              correlation_id: correlationId,
            },
          ],
        }
      }
      if (sql.includes('INSERT INTO missions_logs') && sql.includes("'user.comment'")) {
        return { rowCount: 1, rows: [{ id: commentId }] }
      }
      return { rowCount: 1, rows: [] }
    })

    await executionService.addUserComment({} as SupabaseClient, userId, missionId, {
      message: 'Please continue',
    })

    expect(
      calls.some(
        (sql) =>
          sql.includes('INSERT INTO mission_outbox') && sql.includes("'mission.comment.directive'"),
      ),
    ).toBe(true)
  })

  it('records inbox comment triage and enqueues comment directive outbox', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const correlationId = '14a117fa-8570-4f9d-ac7f-4b48d9ac68e4'
    const commentId = '2b55496a-9919-4ec2-a251-6cc08a95db31'
    const calls: string[] = []

    const { executionService } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM missions') && sql.includes('LIMIT 1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: missionId,
              user_id: userId,
              status: 'inbox',
              assigned_agent_key: 'vibey',
              current_agent_key: null,
              correlation_id: correlationId,
            },
          ],
        }
      }
      if (sql.includes('INSERT INTO missions_logs') && sql.includes("'user.comment'")) {
        return { rowCount: 1, rows: [{ id: commentId }] }
      }
      return { rowCount: 1, rows: [] }
    })

    await executionService.addUserComment({} as SupabaseClient, userId, missionId, {
      message: 'More context',
    })

    expect(calls.some((sql) => sql.includes("'mission.comment.triage.requested'"))).toBe(true)
    expect(calls.some((sql) => sql.includes('INSERT INTO mission_outbox'))).toBe(true)
  })

  it('writes callback log with default event type when omitted', async () => {
    const userId = '37212aea-db05-4178-a6d2-265111a81a78'
    const missionId = '4fd24e49-fd75-4701-93ca-4ac8d8c8c21d'
    const correlationId = '14a117fa-8570-4f9d-ac7f-4b48d9ac68e4'
    const calls: string[] = []

    const { internalOpsService } = createServiceWithNativePg(async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM missions') && sql.includes('LIMIT 1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: missionId,
              user_id: userId,
              status: 'in_progress',
              correlation_id: correlationId,
            },
          ],
        }
      }
      if (sql.includes('UPDATE missions') && sql.includes('SET status = $3::text')) {
        return {
          rowCount: 1,
          rows: [{ id: missionId, user_id: userId, status: 'done', correlation_id: correlationId }],
        }
      }
      return { rowCount: 1, rows: [] }
    })

    await internalOpsService.internalCallback({
      mission_id: missionId,
      user_id: userId,
      status: 'done',
    })

    expect(
      calls.some(
        (sql) =>
          sql.includes('INSERT INTO missions_logs') &&
          sql.includes('VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text'),
      ),
    ).toBe(true)
  })

  it('accepts org-scoped agents stored with null user_id for mission manager operations', async () => {
    const service = new MissionInternalService(
      {} as any,
      { hasConnectionString: vi.fn().mockReturnValue(false) } as any,
      {} as any,
      {} as any,
    ) as any
    const terminal = {
      eq: vi.fn(() => terminal),
      is: vi.fn(() => terminal),
      maybeSingle: vi.fn(async () => ({
        data: { agent_key: 'tessa', is_active: true },
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => terminal),
      })),
    } as any

    await expect(
      service.assertAgentRegisteredForUser(supabase, 'user-1', 'tessa', 'org-1'),
    ).resolves.toBeUndefined()

    expect(terminal.eq).toHaveBeenCalledWith('agent_key', 'tessa')
    expect(terminal.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(terminal.is).toHaveBeenCalledWith('user_id', null)
  })
})
