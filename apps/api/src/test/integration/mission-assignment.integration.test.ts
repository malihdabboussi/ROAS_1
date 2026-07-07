/**
 * Mission assignment — PATCH /api/missions/:id with assigned_agent_key
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMockSupabase, createTestApp, TEST_USER } from './test-helpers'

const MISSION_ID = 'a0000000-0000-4000-8000-000000000001'

function missionRow(assignedKey: string) {
  return {
    id: MISSION_ID,
    user_id: TEST_USER.id,
    org_id: null,
    title: 'Mission',
    brief: null,
    description: null,
    status: 'inbox',
    priority: 'medium',
    assigned_agent_key: assignedKey,
    current_agent_key: 'vibey',
    correlation_id: 'corr-test',
    campaign_id: null,
    input: {},
    error: null,
    output: null,
    plan_id: null,
    parent_mission_id: null,
    progress_notes: null,
    retry_count: 0,
    sort_order: 0,
    scheduled_at: null,
    idempotency_key: 'idem-test-12345678',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-14T00:00:00Z',
    completed_at: null,
    started_at: null,
    trashed_at: null,
  }
}

describe('Mission Assignment Contract', () => {
  describe('with successful mocks', () => {
    let app: INestApplication

    beforeAll(async () => {
      const row = missionRow('line_worker')
      const mockSupabase = createMockSupabase({
        missions: { data: row, error: null },
        missions_logs: {
          data: {
            id: 'b0000000-0000-4000-8000-000000000002',
            mission_id: MISSION_ID,
            user_id: TEST_USER.id,
            org_id: null,
            event_type: 'mission.updated',
            payload: {},
            created_at: '2026-04-14T00:00:00Z',
          },
          error: null,
        },
      })
      app = await createTestApp(mockSupabase)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('PATCH /api/missions/:id accepts assigned_agent_key after DTO update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/missions/${MISSION_ID}`)
        .send({ assigned_agent_key: 'line_worker' })
        .expect(200)
    })

    it('rejects invalid assigned_agent_key values', async () => {
      await request(app.getHttpServer())
        .patch(`/api/missions/${MISSION_ID}`)
        .send({ assigned_agent_key: 'x'.repeat(101) })
        .expect(400)
    })

    it('returns updated mission payload with assigned_agent_key', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/missions/${MISSION_ID}`)
        .send({ assigned_agent_key: 'line_worker' })
        .expect(200)
      expect(res.body.id).toBe(MISSION_ID)
      expect(res.body.assigned_agent_key).toBe('line_worker')
    })
  })

  describe('cross-org / not visible', () => {
    let app: INestApplication

    beforeAll(async () => {
      const mockSupabase = createMockSupabase({
        missions: {
          data: null,
          error: { message: 'PGRST116: JSON object requested, multiple (or no) rows returned' },
        },
      })
      app = await createTestApp(mockSupabase)
    }, 30_000)

    afterAll(async () => {
      await app?.close()
    })

    it('returns 404 for mission outside current org scope', async () => {
      await request(app.getHttpServer())
        .patch(`/api/missions/${MISSION_ID}`)
        .send({ assigned_agent_key: 'line_worker' })
        .expect(404)
    })
  })
})
